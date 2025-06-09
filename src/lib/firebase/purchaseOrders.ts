
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, writeBatch, orderBy, limit } from "firebase/firestore";
import { db } from "./config";
import type { InventoryItem } from "./inventory";
import type { QueryOptions } from "./types";

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'fully_received' | 'cancelled';

export interface PurchaseOrderItemInput {
  productId: string;
  productName: string; 
  orderedQuantity: number;
  purchasePrice: number; 
}

export interface PurchaseOrderItem extends PurchaseOrderItemInput {
  receivedQuantity: number;
  totalPrice: number; 
}

export interface PurchaseOrderInput {
  branchId: string;
  supplierId: string;
  orderDate: Timestamp;
  expectedDeliveryDate?: Timestamp;
  items: PurchaseOrderItemInput[];
  notes?: string;
  status: PurchaseOrderStatus;
  createdById: string;
}

export interface PurchaseOrder extends Omit<PurchaseOrderInput, 'items'> {
  id: string;
  poNumber: string; 
  supplierName: string; 
  items: PurchaseOrderItem[];
  subtotal: number;
  shippingCost?: number;
  taxAmount?: number;
  totalAmount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function addPurchaseOrder(
  poData: PurchaseOrderInput,
  supplierName: string
): Promise<PurchaseOrder | { error: string }> {
  if (!poData.branchId) return { error: "ID Cabang diperlukan." };
  if (!poData.supplierId) return { error: "Pemasok harus dipilih." };
  if (!poData.orderDate) return { error: "Tanggal pemesanan harus diisi." };
  if (poData.items.length === 0) return { error: "Pesanan pembelian harus memiliki minimal satu item." };
  if (!poData.createdById) return { error: "ID Pengguna pembuat PO diperlukan." };

  try {
    const now = serverTimestamp() as Timestamp;
    const poRef = doc(collection(db, "purchaseOrders")); 

    const processedItems: PurchaseOrderItem[] = poData.items.map(item => ({
      ...item,
      receivedQuantity: 0, 
      totalPrice: item.orderedQuantity * item.purchasePrice,
    }));

    const subtotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalAmount = subtotal; 
    const poNumber = `PO-${poRef.id.substring(0, 8).toUpperCase()}`;

    const dataToSave: Omit<PurchaseOrder, 'id'> = {
      poNumber,
      branchId: poData.branchId,
      supplierId: poData.supplierId,
      supplierName, 
      orderDate: poData.orderDate,
      expectedDeliveryDate: poData.expectedDeliveryDate,
      items: processedItems,
      notes: poData.notes || "",
      status: poData.status || 'draft', 
      createdById: poData.createdById,
      subtotal,
      shippingCost: 0, 
      taxAmount: 0,    
      totalAmount,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(poRef, dataToSave);
    
    const clientTimestamp = Timestamp.now();
    return {
      id: poRef.id,
      ...dataToSave,
      createdAt: clientTimestamp, 
      updatedAt: clientTimestamp,
    };
  } catch (error: any) {
    console.error("Error adding purchase order:", error);
    return { error: error.message || "Gagal menambah pesanan pembelian." };
  }
}

export async function getPurchaseOrdersByBranch(
  branchId: string,
  options: QueryOptions = {}
): Promise<PurchaseOrder[]> {
  if (!branchId) return [];
  
  const constraints: any[] = [
      where("branchId", "==", branchId)
  ];

  if (options.startDate && options.endDate && options.orderByField === "updatedAt") {
    const startTimestamp = Timestamp.fromDate(options.startDate);
    const endOfDayEndDate = new Date(options.endDate);
    endOfDayEndDate.setHours(23, 59, 59, 999);
    const endTimestamp = Timestamp.fromDate(endOfDayEndDate);
    constraints.push(where("updatedAt", ">=", startTimestamp));
    constraints.push(where("updatedAt", "<=", endTimestamp));
  }
  
  if (options.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
  } else {
      constraints.push(orderBy("createdAt", "desc")); 
  }

  if (options.limit) {
      constraints.push(limit(options.limit));
  }
  
  try {
      const q = query(collection(db, "purchaseOrders"), ...constraints);
      const querySnapshot = await getDocs(q);
      const purchaseOrders: PurchaseOrder[] = [];
      querySnapshot.forEach((docSnap) => {
          purchaseOrders.push({ id: docSnap.id, ...docSnap.data() } as PurchaseOrder);
      });
      return purchaseOrders;
  } catch (error) {
      console.error("Error fetching purchase orders by branch:", error);
      return [];
  }
}

export async function getPurchaseOrderById(poId: string): Promise<PurchaseOrder | null> {
    if (!poId) return null;
    try {
        const poRef = doc(db, "purchaseOrders", poId);
        const docSnap = await getDoc(poRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as PurchaseOrder;
        }
        return null;
    } catch (error) {
        console.error("Error fetching purchase order by ID:", error);
        return null;
    }
}

export async function updatePurchaseOrderStatus(
    poId: string, 
    newStatus: PurchaseOrderStatus
): Promise<void | { error: string }> {
  if (!poId) return { error: "ID Pesanan Pembelian tidak valid." };
  if (!newStatus) return { error: "Status baru tidak valid." };

  try {
    const poRef = doc(db, "purchaseOrders", poId);
    const updateData: any = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(poRef, updateData);
  } catch (error: any) {
    console.error("Error updating purchase order status:", error);
    return { error: error.message || "Gagal memperbarui status pesanan pembelian." };
  }
}

export interface ReceivedItemData {
  productId: string;
  quantityReceivedNow: number;
}

export async function receivePurchaseOrderItems(
  poId: string,
  itemsReceived: ReceivedItemData[]
): Promise<void | { error: string }> {
  if (!poId) return { error: "ID Pesanan Pembelian tidak valid." };
  if (!itemsReceived || itemsReceived.length === 0) {
    return { error: "Tidak ada item yang ditandai diterima." };
  }

  const batch = writeBatch(db);
  const poRef = doc(db, "purchaseOrders", poId);

  try {
    const poSnap = await getDoc(poRef);
    if (!poSnap.exists()) {
      return { error: "Pesanan Pembelian tidak ditemukan." };
    }
    const purchaseOrder = poSnap.data() as PurchaseOrder;

    if (purchaseOrder.status === 'fully_received' || purchaseOrder.status === 'cancelled') {
      return { error: `Tidak dapat menerima item untuk PO yang sudah ${purchaseOrder.status === 'fully_received' ? 'diterima penuh' : 'dibatalkan'}.` };
    }

    const updatedPoItems = [...purchaseOrder.items]; 

    for (const receivedItem of itemsReceived) {
      if (receivedItem.quantityReceivedNow <= 0) continue;

      const poItemIndex = updatedPoItems.findIndex(item => item.productId === receivedItem.productId);
      if (poItemIndex === -1) {
        console.warn(`Item dengan productId ${receivedItem.productId} tidak ditemukan di PO ${poId}.`);
        continue;
      }
      
      const poItem = updatedPoItems[poItemIndex];
      const newReceivedQuantity = poItem.receivedQuantity + receivedItem.quantityReceivedNow;

      if (newReceivedQuantity > poItem.orderedQuantity) {
        return { error: `Jumlah diterima untuk ${poItem.productName} (${newReceivedQuantity}) melebihi jumlah dipesan (${poItem.orderedQuantity}).` };
      }
      
      updatedPoItems[poItemIndex] = { ...poItem, receivedQuantity: newReceivedQuantity };

      const inventoryItemRef = doc(db, "inventoryItems", receivedItem.productId);
      const inventoryItemSnap = await getDoc(inventoryItemRef);
      if (inventoryItemSnap.exists()) {
        const inventoryItemData = inventoryItemSnap.data() as InventoryItem; // Type assertion
        const newInventoryQuantity = inventoryItemData.quantity + receivedItem.quantityReceivedNow;
        batch.update(inventoryItemRef, {
          quantity: newInventoryQuantity,
          costPrice: poItem.purchasePrice, 
          updatedAt: serverTimestamp(),
        });
      } else {
        console.warn(`Inventory item ${receivedItem.productId} not found. Stock not updated.`);
      }
    }

    const allItemsFullyReceived = updatedPoItems.every(item => item.receivedQuantity === item.orderedQuantity);
    const newStatus = allItemsFullyReceived ? 'fully_received' : 'partially_received';

    batch.update(poRef, {
      items: updatedPoItems,
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error: any) {
    console.error("Error receiving purchase order items:", error);
    return { error: error.message || "Gagal memproses penerimaan barang." };
  }
}

    