
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, writeBatch, orderBy, limit, arrayUnion } from "firebase/firestore";
import { db } from "./config";
import type { InventoryItem } from "./inventory";
import type { QueryOptions } from "./types";
import { addStockMutation, type StockMutationInput } from "./stockMutations"; // Added import

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'fully_received' | 'cancelled';
export type PurchaseOrderPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
export type PurchaseOrderPaymentTerms = 'cash' | 'credit';

export interface PaymentToSupplier {
  paymentDate: Timestamp;
  amountPaid: number;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other'; // Could be more specific if needed
  notes?: string;
  recordedByUserId: string;
}

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
  paymentTermsOnPO?: PurchaseOrderPaymentTerms;
  supplierInvoiceNumber?: string;
  paymentDueDateOnPO?: Timestamp;
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
  isCreditPurchase?: boolean;
  outstandingPOAmount?: number;
  paymentStatusOnPO?: PurchaseOrderPaymentStatus;
  paymentsMadeToSupplier?: PaymentToSupplier[];
}

export async function addPurchaseOrder(
  poData: PurchaseOrderInput,
  supplierName: string,
  userName?: string // Optional: for stock mutation logging
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
      paymentTermsOnPO: poData.paymentTermsOnPO || 'cash',
      supplierInvoiceNumber: poData.supplierInvoiceNumber || "",
      paymentDueDateOnPO: poData.paymentDueDateOnPO,
      isCreditPurchase: poData.paymentTermsOnPO === 'credit',
      outstandingPOAmount: poData.paymentTermsOnPO === 'credit' ? totalAmount : 0,
      paymentStatusOnPO: poData.paymentTermsOnPO === 'credit' ? 'unpaid' : 'paid',
      paymentsMadeToSupplier: [],
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

  let constraints: any[] = [
      where("branchId", "==", branchId)
  ];

  // Date filtering based on orderDate
  if (options.startDate && options.endDate) {
    const startTimestamp = Timestamp.fromDate(options.startDate);
    // Adjust endDate to include the whole day
    const endOfDayEndDate = new Date(options.endDate);
    endOfDayEndDate.setHours(23, 59, 59, 999);
    const endTimestamp = Timestamp.fromDate(endOfDayEndDate);
    
    constraints.push(where("orderDate", ">=", startTimestamp));
    constraints.push(where("orderDate", "<=", endTimestamp));
  }


  if (options.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
  } else {
      // Default sort by createdAt if no specific order is requested,
      // or if only date range is provided without explicit orderByField.
      constraints.push(orderBy(options.startDate && options.endDate ? "orderDate" : "createdAt", "desc"));
  }


  if (options.limit && !(options.startDate && options.endDate)) { // Apply limit only if not doing a date range for full history
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
  itemsReceived: ReceivedItemData[],
  receivedByUserId?: string, // Optional: for stock mutation
  receivedByUserName?: string // Optional: for stock mutation
): Promise<void | { error: string }> {
  if (!poId) return { error: "ID Pesanan Pembelian tidak valid." };
  if (!itemsReceived || itemsReceived.length === 0) {
    return { error: "Tidak ada item yang ditandai diterima." };
  }

  const batch = writeBatch(db);
  const poRef = doc(db, "purchaseOrders", poId);
  const receiptTimestamp = Timestamp.now(); // Client-side timestamp for mutations

  try {
    const poSnap = await getDoc(poRef); // Read PO data outside batch
    if (!poSnap.exists()) {
      return { error: "Pesanan Pembelian tidak ditemukan." };
    }
    const purchaseOrder = poSnap.data() as PurchaseOrder;

    if (purchaseOrder.status === 'fully_received' || purchaseOrder.status === 'cancelled') {
      return { error: `Tidak dapat menerima item untuk PO yang sudah ${purchaseOrder.status === 'fully_received' ? 'diterima penuh' : 'dibatalkan'}.` };
    }

    const updatedPoItems = [...purchaseOrder.items];
    const inventoryUpdates: { ref: any, newStock: number, costPrice: number, productName: string, sku?: string, quantityReceivedNow: number }[] = [];


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
      // We need to read the current stock before calculating new stock for the batch update.
      // Since batch doesn't allow reads, we assume `increment` handles concurrency or this needs a transaction per item.
      // For simplicity and given previous structure, we'll use increment.
      // Cost price update is direct.
      batch.update(inventoryItemRef, {
        quantity: require("firebase/firestore").increment(receivedItem.quantityReceivedNow),
        costPrice: poItem.purchasePrice,
        updatedAt: serverTimestamp(),
      });
      // Store info needed for mutation logging after batch commit
      inventoryUpdates.push({ 
        ref: inventoryItemRef, 
        newStock: 0, // Will be read after batch
        costPrice: poItem.purchasePrice,
        productName: poItem.productName,
        sku: (await getDoc(inventoryItemRef)).data()?.sku, // Read SKU now if possible, or from poItem if denormalized
        quantityReceivedNow: receivedItem.quantityReceivedNow 
      });
    }
    
    const allItemsFullyReceived = updatedPoItems.every(item => item.receivedQuantity === item.orderedQuantity);
    const newStatus = allItemsFullyReceived ? 'fully_received' : 'partially_received';

    batch.update(poRef, {
      items: updatedPoItems,
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    // After batch commit, log stock mutations
    for (const update of inventoryUpdates) {
      const productSnap = await getDoc(update.ref);
      if (productSnap.exists()) {
        const updatedProductStock = productSnap.data().quantity;
        const stockBeforeThisReceipt = updatedProductStock - update.quantityReceivedNow;
        
        const mutationInput: StockMutationInput = {
          branchId: purchaseOrder.branchId,
          productId: update.ref.id,
          productName: update.productName, 
          sku: update.sku,
          mutationTime: receiptTimestamp,
          type: "PURCHASE_RECEIPT",
          quantityChange: update.quantityReceivedNow,
          currentProductStock: stockBeforeThisReceipt, // Stock before this specific receipt
          referenceId: purchaseOrder.id,
          notes: `Penerimaan dari PO: ${purchaseOrder.poNumber}`,
          userId: receivedByUserId,
          userName: receivedByUserName,
        };
        await addStockMutation(mutationInput);
      }
    }

  } catch (error: any) {
    console.error("Error receiving purchase order items:", error);
    return { error: error.message || "Gagal memproses penerimaan barang." };
  }
}


export async function getOutstandingPurchaseOrdersByBranch(
  branchId: string,
  options: QueryOptions = {}
): Promise<PurchaseOrder[]> {
  if (!branchId) return [];

  const constraints: any[] = [
    where("branchId", "==", branchId),
    where("isCreditPurchase", "==", true),
    where("paymentStatusOnPO", "in", ["unpaid", "partially_paid"]),
  ];

  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
  } else {
    constraints.push(orderBy("paymentDueDateOnPO", "asc")); // Order by due date for payables
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
    console.error("Error fetching outstanding purchase orders:", error);
    return [];
  }
}

export async function recordPaymentToSupplier(
  poId: string,
  paymentDetails: Omit<PaymentToSupplier, 'paymentDate'> & { paymentDate: Date, recordedByUserId: string }
): Promise<void | { error: string }> {
  if (!poId) return { error: "ID Pesanan Pembelian tidak valid." };
  if (!paymentDetails.amountPaid || paymentDetails.amountPaid <= 0) {
    return { error: "Jumlah pembayaran tidak valid." };
  }

  const poRef = doc(db, "purchaseOrders", poId);

  try {
    const poSnap = await getDoc(poRef);
    if (!poSnap.exists()) {
      return { error: "Pesanan Pembelian tidak ditemukan." };
    }
    const purchaseOrder = poSnap.data() as PurchaseOrder;

    if (purchaseOrder.paymentStatusOnPO === 'paid') {
        return { error: `Pesanan Pembelian ini sudah lunas.`};
    }
    if (!purchaseOrder.isCreditPurchase) {
        return { error: `Pesanan Pembelian ini bukan pembelian kredit.`};
    }

    const newOutstandingAmount = (purchaseOrder.outstandingPOAmount || 0) - paymentDetails.amountPaid;
    let newPaymentStatus: PurchaseOrderPaymentStatus = purchaseOrder.paymentStatusOnPO || 'unpaid';

    if (newOutstandingAmount <= 0) {
      newPaymentStatus = 'paid';
    } else {
      newPaymentStatus = 'partially_paid';
    }

    const paymentRecord: PaymentToSupplier = {
      ...paymentDetails,
      paymentDate: Timestamp.fromDate(paymentDetails.paymentDate),
    };

    await updateDoc(poRef, {
      outstandingPOAmount: newOutstandingAmount < 0 ? 0 : newOutstandingAmount,
      paymentStatusOnPO: newPaymentStatus,
      paymentsMadeToSupplier: arrayUnion(paymentRecord),
      updatedAt: serverTimestamp(),
    });

  } catch (error: any) {
    console.error("Error recording payment to supplier:", error);
    return { error: error.message || "Gagal merekam pembayaran ke pemasok." };
  }
}

