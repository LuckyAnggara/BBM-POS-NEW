
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle as DialogModalTitle, DialogDescription as DialogModalDescription, DialogFooter as DialogModalFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, ReceivedItemData } from "@/lib/firebase/purchaseOrders"; // Updated import
import { getPurchaseOrderById, updatePurchaseOrderStatus, receivePurchaseOrderItems } from "@/lib/firebase/purchaseOrders"; // Updated import
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Printer, PackageCheck, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { z } from "zod";


const receiveItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  orderedQuantity: z.number(),
  alreadyReceivedQuantity: z.number(),
  purchasePrice: z.number(),
  quantityReceivedNow: z.coerce.number().min(0, "Jumlah tidak boleh negatif.").max(99999, "Jumlah terlalu besar."),
});

const receiveFormSchema = z.object({
  itemsToReceive: z.array(receiveItemSchema).refine(
    (items) => items.some(item => item.quantityReceivedNow > 0),
    { message: "Minimal satu item harus memiliki jumlah diterima lebih dari 0." }
  ).refine(
    (items) => items.every(item => item.quantityReceivedNow <= (item.orderedQuantity - item.alreadyReceivedQuantity)),
    { message: "Jumlah diterima tidak boleh melebihi sisa yang belum diterima untuk satu atau lebih item."}
  )
});

type ReceiveFormValues = z.infer<typeof receiveFormSchema>;


export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.poId as string;

  const { currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loadingPO, setLoadingPO] = useState(true);
  const [isReceivingItemsModalOpen, setIsReceivingItemsModalOpen] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  const receiveItemsForm = useForm<ReceiveFormValues>({
    resolver: async (data, context, options) => {
      const result = await z.object({
        itemsToReceive: z.array(receiveItemSchema).refine(
          (items) => items.some(item => item.quantityReceivedNow > 0),
          { message: "Minimal satu item harus memiliki jumlah diterima lebih dari 0." }
        ).refine(
          (items) => items.every(item => item.quantityReceivedNow <= (item.orderedQuantity - item.alreadyReceivedQuantity)),
          { message: "Jumlah diterima tidak boleh melebihi sisa yang belum diterima untuk satu atau lebih item." }
        )
      }).safeParseAsync(data);
      if (!result.success) {
         const firstError = result.error.errors.find(e => e.path.includes('itemsToReceive') && e.path.length === 1 );
         if(firstError && firstError.message) {
           return { values: {}, errors: { itemsToReceive: { type: 'manual', message: firstError.message, root: firstError }}};
         }
        return { values: {}, errors: { itemsToReceive: { type: 'manual', message: "Validasi gagal pada item.", root: result.error.errors[0] } } };
      }
      return { values: result.data, errors: {} };
    },
    defaultValues: {
      itemsToReceive: [],
    },
  });

  const { fields: receiveFields, replace: replaceReceiveFields } = useFieldArray({
    control: receiveItemsForm.control,
    name: "itemsToReceive",
  });

  const fetchPurchaseOrder = useCallback(async () => {
    if (!poId) {
      setLoadingPO(false);
      toast({ title: "Error", description: "ID Pesanan Pembelian tidak valid.", variant: "destructive" });
      router.push("/purchase-orders");
      return;
    }
    setLoadingPO(true);
    try {
      const fetchedPO = await getPurchaseOrderById(poId);
      if (fetchedPO) {
        setPurchaseOrder(fetchedPO);
        const itemsForForm = fetchedPO.items
          .filter(item => item.orderedQuantity > item.receivedQuantity)
          .map(item => ({
            productId: item.productId,
            productName: item.productName,
            orderedQuantity: item.orderedQuantity,
            alreadyReceivedQuantity: item.receivedQuantity,
            purchasePrice: item.purchasePrice,
            quantityReceivedNow: 0,
          }));
        replaceReceiveFields(itemsForForm);
      } else {
        toast({ title: "Tidak Ditemukan", description: "Pesanan Pembelian tidak ditemukan.", variant: "destructive" });
        router.push("/purchase-orders");
      }
    } catch (error) {
      console.error("Error fetching PO details:", error);
      toast({ title: "Gagal Memuat", description: "Gagal memuat detail pesanan pembelian.", variant: "destructive" });
    } finally {
      setLoadingPO(false);
    }
  }, [poId, toast, router, replaceReceiveFields]);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [fetchPurchaseOrder]);

  const onSubmitReceiveItems: SubmitHandler<ReceiveFormValues> = async (values) => {
    if (!purchaseOrder) return;

    const itemsToProcess: ReceivedItemData[] = values.itemsToReceive
        .filter(item => item.quantityReceivedNow > 0)
        .map(item => ({
            productId: item.productId,
            quantityReceivedNow: item.quantityReceivedNow,
        }));

    if (itemsToProcess.length === 0) {
        toast({ title: "Tidak ada item diterima", description: "Masukkan jumlah untuk setidaknya satu item.", variant: "destructive"});
        return;
    }

    setIsProcessingReceipt(true);
    const result = await receivePurchaseOrderItems(purchaseOrder.id, itemsToProcess);
    setIsProcessingReceipt(false);

    if (result && "error" in result) {
        toast({ title: "Gagal Menerima Barang", description: result.error, variant: "destructive" });
    } else {
        toast({ title: "Penerimaan Barang Berhasil", description: "Stok dan status PO telah diperbarui." });
        setIsReceivingItemsModalOpen(false);
        await fetchPurchaseOrder();
    }
  };


  const formatDate = (timestamp: Timestamp | Date | undefined, includeTime = false) => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('id-ID', options).format(date);
  };

  const formatCurrency = (amount: number) => {
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const getStatusBadgeVariant = (status: PurchaseOrderStatus | undefined) => {
    if (!status) return 'secondary';
    switch (status) {
      case 'draft': return 'secondary';
      case 'ordered': return 'default';
      case 'partially_received': return 'outline';
      case 'fully_received': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: PurchaseOrderStatus | undefined) => {
    if (!status) return "N/A";
    switch (status) {
      case 'draft': return 'Draft';
      case 'ordered': return 'Dipesan';
      case 'partially_received': return 'Diterima Sebagian';
      case 'fully_received': return 'Diterima Penuh';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  if (loadingPO) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        </div>
      </MainLayout>
    );
  }

  if (!purchaseOrder) {
    return <MainLayout><div className="p-4 text-center">Pesanan Pembelian tidak ditemukan.</div></MainLayout>;
  }

  const canReceiveGoods = purchaseOrder.status === 'ordered' || purchaseOrder.status === 'partially_received';
  const itemsPendingReceipt = purchaseOrder.items.filter(item => item.orderedQuantity > item.receivedQuantity);


  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
                <h1 className="text-xl md:text-2xl font-semibold font-headline">
                Detail Pesanan Pembelian: {purchaseOrder.poNumber}
                </h1>
                <p className="text-sm text-muted-foreground">
                    Status: <Badge variant={getStatusBadgeVariant(purchaseOrder.status)} className={cn(purchaseOrder.status === 'fully_received' && "bg-green-600 text-white hover:bg-green-700", purchaseOrder.status === 'ordered' && "bg-blue-500 text-white hover:bg-blue-600", purchaseOrder.status === 'partially_received' && "bg-yellow-500 text-white hover:bg-yellow-600")}>{getStatusText(purchaseOrder.status)}</Badge>
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild className="text-xs h-8">
                    <Link href="/purchase-orders"><ArrowLeft className="mr-1.5 h-3.5 w-3.5"/> Kembali ke Daftar</Link>
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" disabled>
                    <Printer className="mr-1.5 h-3.5 w-3.5"/> Cetak PO (Segera)
                </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Item Pesanan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nama Produk</TableHead>
                      <TableHead className="text-xs text-center">Dipesan</TableHead>
                      <TableHead className="text-xs text-center">Diterima</TableHead>
                      <TableHead className="text-xs text-right">Harga Beli</TableHead>
                      <TableHead className="text-xs text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrder.items.map((item, index) => (
                      <TableRow key={item.productId + index}>
                        <TableCell className="text-xs font-medium py-1.5">{item.productName}</TableCell>
                        <TableCell className="text-xs text-center py-1.5">{item.orderedQuantity}</TableCell>
                        <TableCell className="text-xs text-center py-1.5">{item.receivedQuantity}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.purchasePrice)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 <Separator className="my-3"/>
                 <div className="flex justify-end items-center text-sm">
                    <div className="w-full max-w-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-medium">{formatCurrency(purchaseOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base">
                            <span>Total Pesanan:</span>
                            <span>{formatCurrency(purchaseOrder.totalAmount)}</span>
                        </div>
                    </div>
                 </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader><CardTitle className="text-base">Informasi Umum</CardTitle></CardHeader>
                    <CardContent className="space-y-1.5 text-xs">
                        <p><strong>No. PO:</strong> {purchaseOrder.poNumber}</p>
                        <p><strong>Pemasok:</strong> {purchaseOrder.supplierName}</p>
                        <p><strong>Tanggal Pesan:</strong> {formatDate(purchaseOrder.orderDate)}</p>
                        <p><strong>Estimasi Terima:</strong> {purchaseOrder.expectedDeliveryDate ? formatDate(purchaseOrder.expectedDeliveryDate) : "-"}</p>
                        <p><strong>Dibuat Oleh:</strong> {purchaseOrder.createdById.substring(0,8)}...</p>
                        <p><strong>Dibuat Pada:</strong> {formatDate(purchaseOrder.createdAt, true)}</p>
                        <p><strong>Diperbarui Pada:</strong> {formatDate(purchaseOrder.updatedAt, true)}</p>
                        {purchaseOrder.notes && (
                        <>
                            <Separator className="my-1.5"/>
                            <p><strong>Catatan:</strong></p>
                            <p className="whitespace-pre-wrap bg-muted/50 p-2 rounded-md">{purchaseOrder.notes}</p>
                        </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-base">Aksi Pesanan</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {canReceiveGoods && (
                            <Button
                                size="sm"
                                className="w-full text-xs h-8"
                                variant="outline"
                                onClick={() => setIsReceivingItemsModalOpen(true)}
                                disabled={itemsPendingReceipt.length === 0}
                            >
                                {itemsPendingReceipt.length === 0 ? <PackageX className="mr-1.5 h-3.5 w-3.5" /> : <PackageCheck className="mr-1.5 h-3.5 w-3.5"/>}
                                {itemsPendingReceipt.length === 0 ? "Semua Item Diterima" : "Catat Penerimaan Barang"}
                            </Button>
                        )}
                         {purchaseOrder.status === 'fully_received' && (
                            <p className="text-xs text-green-600 text-center font-medium py-2">Semua item telah diterima untuk pesanan ini.</p>
                         )}
                         {purchaseOrder.status === 'cancelled' && (
                            <p className="text-xs text-destructive text-center font-medium py-2">Pesanan pembelian ini telah dibatalkan.</p>
                         )}
                          {!(canReceiveGoods || purchaseOrder.status === 'fully_received' || purchaseOrder.status === 'cancelled') && (
                             <p className="text-xs text-muted-foreground text-center py-2">Tidak ada aksi penerimaan yang tersedia untuk status PO saat ini ({getStatusText(purchaseOrder.status)}).</p>
                          )}
                    </CardContent>
                </Card>
            </div>
          </div>
        </div>

        <Dialog open={isReceivingItemsModalOpen} onOpenChange={setIsReceivingItemsModalOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogModalTitle>Catat Penerimaan Barang untuk PO: {purchaseOrder.poNumber}</DialogModalTitle>
                    <DialogModalDescription className="text-xs">
                        Masukkan jumlah barang yang diterima untuk setiap item. Stok inventaris akan diperbarui.
                    </DialogModalDescription>
                </DialogHeader>
                <form onSubmit={receiveItemsForm.handleSubmit(onSubmitReceiveItems)}>
                    <div className="py-3 max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                        {itemsPendingReceipt.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Semua item untuk PO ini sudah diterima.</p>
                        ) : (
                            receiveFields.map((field, index) => {
                                const remainingToReceive = field.orderedQuantity - field.alreadyReceivedQuantity;
                                return (
                                <div key={field.id} className="grid grid-cols-12 gap-x-3 gap-y-1 p-2.5 border rounded-md items-center bg-muted/30">
                                    <div className="col-span-12 sm:col-span-5">
                                        <Label className="text-xs font-medium">{field.productName}</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Dipesan: {field.orderedQuantity} | Sudah Diterima: {field.alreadyReceivedQuantity} | Sisa: {remainingToReceive}
                                        </p>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4">
                                         <Label htmlFor={`itemsToReceive.${index}.quantityReceivedNow`} className="text-xs">Diterima Sekarang</Label>
                                         <Input
                                            id={`itemsToReceive.${index}.quantityReceivedNow`}
                                            type="number"
                                            {...receiveItemsForm.register(`itemsToReceive.${index}.quantityReceivedNow`)}
                                            className="h-8 text-xs mt-0.5"
                                            placeholder="0"
                                            min="0"
                                            max={remainingToReceive}
                                        />
                                        {receiveItemsForm.formState.errors.itemsToReceive?.[index]?.quantityReceivedNow && (
                                            <p className="text-xs text-destructive mt-0.5">{receiveItemsForm.formState.errors.itemsToReceive?.[index]?.quantityReceivedNow?.message}</p>
                                        )}
                                    </div>
                                    <div className="col-span-12 sm:col-span-3">
                                        <Label className="text-xs">Harga Beli Satuan</Label>
                                        <p className="text-xs font-medium mt-0.5">{formatCurrency(field.purchasePrice)}</p>
                                    </div>
                                </div>
                            )})
                        )}
                        {receiveItemsForm.formState.errors.itemsToReceive?.root && (
                             <p className="text-sm text-destructive mt-2 text-center">{receiveItemsForm.formState.errors.itemsToReceive.root.message}</p>
                        )}
                         {receiveItemsForm.formState.errors.itemsToReceive && !receiveItemsForm.formState.errors.itemsToReceive.root && typeof receiveItemsForm.formState.errors.itemsToReceive.message === 'string' && (
                             <p className="text-sm text-destructive mt-2 text-center">{receiveItemsForm.formState.errors.itemsToReceive.message}</p>
                         )}

                    </div>
                    <DialogModalFooter className="pt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" className="text-xs h-8" disabled={isProcessingReceipt}>Batal</Button>
                        </DialogClose>
                        <Button type="submit" className="text-xs h-8" disabled={isProcessingReceipt || itemsPendingReceipt.length === 0}>
                            {isProcessingReceipt ? "Memproses..." : "Simpan Penerimaan"}
                        </Button>
                    </DialogModalFooter>
                </form>
            </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}

    