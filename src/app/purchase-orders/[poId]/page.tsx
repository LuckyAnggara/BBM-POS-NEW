
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
import { Textarea } from "@/components/ui/textarea"; 
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, ReceivedItemData, PurchaseOrderPaymentStatus, PaymentToSupplier } from "@/lib/firebase/purchaseOrders";
import { getPurchaseOrderById, updatePurchaseOrderStatus, receivePurchaseOrderItems, recordPaymentToSupplier } from "@/lib/firebase/purchaseOrders";
import { Timestamp } from "firebase/firestore";
import { format, isBefore, startOfDay } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Printer, PackageCheck, PackageX, DollarSign, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useForm, useFieldArray, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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


const paymentToSupplierFormSchema = z.object({
  paymentDate: z.date({ required_error: "Tanggal pembayaran harus diisi." }),
  amountPaid: z.coerce.number().positive({ message: "Jumlah bayar harus lebih dari 0." }),
  paymentMethod: z.enum(["cash", "transfer", "card", "other"], { required_error: "Metode pembayaran harus dipilih."}),
  notes: z.string().optional(),
});
type PaymentToSupplierFormValues = z.infer<typeof paymentToSupplierFormSchema>;


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

  const [isPaymentToSupplierModalOpen, setIsPaymentToSupplierModalOpen] = useState(false);
  const [isProcessingPaymentToSupplier, setIsProcessingPaymentToSupplier] = useState(false);

  const paymentToSupplierForm = useForm<PaymentToSupplierFormValues>({
    resolver: zodResolver(paymentToSupplierFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      amountPaid: 0,
      paymentMethod: "transfer",
      notes: "",
    },
  });

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

        if (fetchedPO.isCreditPurchase && fetchedPO.outstandingPOAmount) {
            paymentToSupplierForm.reset({
                paymentDate: new Date(),
                amountPaid: fetchedPO.outstandingPOAmount,
                paymentMethod: "transfer",
                notes: ""
            });
        }

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
  }, [poId, toast, router, replaceReceiveFields, paymentToSupplierForm]);

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
    const result = await receivePurchaseOrderItems(purchaseOrder.id, itemsToProcess, currentUser?.uid, currentUser?.displayName || undefined);
    setIsProcessingReceipt(false);

    if (result && "error" in result) {
        toast({ title: "Gagal Menerima Barang", description: result.error, variant: "destructive" });
    } else {
        toast({ title: "Penerimaan Barang Berhasil", description: "Stok dan status PO telah diperbarui." });
        setIsReceivingItemsModalOpen(false);
        await fetchPurchaseOrder();
    }
  };

  const onSubmitPaymentToSupplier: SubmitHandler<PaymentToSupplierFormValues> = async (values) => {
    if (!purchaseOrder || !currentUser) {
      toast({ title: "Error", description: "Pesanan Pembelian atau pengguna tidak valid.", variant: "destructive" });
      return;
    }
    if (values.amountPaid > (purchaseOrder.outstandingPOAmount || 0)) {
        toast({ title: "Jumlah Tidak Valid", description: "Jumlah bayar melebihi sisa tagihan.", variant: "destructive"});
        paymentToSupplierForm.setError("amountPaid", { type: "manual", message: "Jumlah bayar melebihi sisa tagihan."});
        return;
    }

    const paymentDetails: Omit<PaymentToSupplier, 'paymentDate'> & { paymentDate: Date, recordedByUserId: string } = {
      amountPaid: values.amountPaid,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      paymentDate: values.paymentDate,
      recordedByUserId: currentUser.uid,
    };

    setIsProcessingPaymentToSupplier(true);
    const result = await recordPaymentToSupplier(purchaseOrder.id, paymentDetails);
    setIsProcessingPaymentToSupplier(false);

    if (result && "error" in result) {
      toast({ title: "Gagal Mencatat Pembayaran", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pembayaran Dicatat", description: `Pembayaran untuk PO ${purchaseOrder.poNumber} berhasil dicatat.` });
      setIsPaymentToSupplierModalOpen(false);
      await fetchPurchaseOrder();
    }
  };


  const formatDate = (timestamp: any, includeTime = false) => {
    if (!timestamp) return "N/A";
  
    let date: Date;
  
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp?.seconds) {
      // kemungkinan objek dari Firestore yang belum diconvert
      date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    } else {
      // fallback
      date = new Date(timestamp);
    }
  
    return format(date, includeTime ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy");
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "N/A"; // Handle null and undefined
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const getPOStatusBadgeVariant = (status: PurchaseOrderStatus | undefined) => {
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

  const getPOStatusText = (status: PurchaseOrderStatus | undefined) => {
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

  const getPaymentStatusBadgeVariant = (status: PurchaseOrderPaymentStatus | undefined, dueDateMillis?: number) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    if (!status) return variant;

    if (status === 'paid') { variant = 'default'; }
    else if (status === 'unpaid') { variant = 'destructive'; }
    else if (status === 'partially_paid') { variant = 'outline'; }

    // Convert milliseconds to a Date object before comparison
    const dueDate = dueDateMillis !== undefined ? new Date(dueDateMillis) : undefined;

    if (dueDate && (status === 'unpaid' || status === 'partially_paid') && isBefore(dueDate, startOfDay(new Date()))) {
      variant = 'destructive';
    }
    return variant;
  };

  const getPaymentStatusText = (status: PurchaseOrderPaymentStatus | undefined, dueDateMillis?: number) => {
    if (!status) return "N/A";
    let text = "";
     switch (status) {
      case 'paid': text = "Lunas"; break;
      case 'unpaid': text = "Belum Bayar"; break;
      case 'partially_paid': text = "Bayar Sebagian"; break;
    }
  
    // Convert milliseconds to a Date object before comparison
    const dueDate = dueDateMillis !== undefined ? new Date(dueDateMillis) : undefined;
  
    // Now check for overdue status using the Date object
    if (dueDate && (status === 'unpaid' || status === 'partially_paid') && isBefore(dueDate, startOfDay(new Date()))) {
      return text + " (Jatuh Tempo)";
    }
  
    return text;
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
  const canPaySupplier = purchaseOrder.isCreditPurchase && (purchaseOrder.paymentStatusOnPO === 'unpaid' || purchaseOrder.paymentStatusOnPO === 'partially_paid');


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
                    Status PO: <Badge variant={getPOStatusBadgeVariant(purchaseOrder.status)} className={cn(purchaseOrder.status === 'fully_received' && "bg-green-600 text-white hover:bg-green-700", purchaseOrder.status === 'ordered' && "bg-blue-500 text-white hover:bg-blue-600", purchaseOrder.status === 'partially_received' && "bg-yellow-500 text-white hover:bg-yellow-600", "mr-2")}>{getPOStatusText(purchaseOrder.status)}</Badge>
                    {purchaseOrder.isCreditPurchase && (
                        <>Status Bayar: <Badge variant={getPaymentStatusBadgeVariant(purchaseOrder.paymentStatusOnPO, purchaseOrder.paymentDueDateOnPO)} className={cn(purchaseOrder.paymentStatusOnPO === 'paid' && 'bg-green-600 hover:bg-green-700 text-white', purchaseOrder.paymentStatusOnPO === 'partially_paid' && 'border-yellow-500 text-yellow-600')}>{getPaymentStatusText(purchaseOrder.paymentStatusOnPO, purchaseOrder.paymentDueDateOnPO)}</Badge></>
                    )}
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
                        <TableCell className="text-xs font-medium py-1.5">{item.productName} ({item.sku})</TableCell>
                        <TableCell className="text-xs text-center py-1.5">{item.orderedQuantity}</TableCell>
                        <TableCell className="text-xs text-center py-1.5">{item.receivedQuantity}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.purchasePrice)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 <Separator className="my-3"/>
                 <div className="flex justify-end items-start text-sm">
                    <div className="w-full max-w-xs space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span>Subtotal Item:</span>
                            <span className="font-medium">{formatCurrency(purchaseOrder.subtotal)}</span>
                        </div>
                        {(purchaseOrder.taxDiscountAmount || 0) > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Diskon Pajak (-):</span>
                                <span className="font-medium">{formatCurrency(purchaseOrder.taxDiscountAmount)}</span>
                            </div>
                        )}
                        {(purchaseOrder.shippingCostCharged || 0) > 0 && (
                             <div className="flex justify-between text-destructive">
                                <span>Ongkos Kirim (+):</span>
                                <span className="font-medium">{formatCurrency(purchaseOrder.shippingCostCharged)}</span>
                            </div>
                        )}
                        {(purchaseOrder.otherCosts || 0) > 0 && (
                            <div className="flex justify-between text-destructive">
                                <span>Biaya Lainnya (+):</span>
                                <span className="font-medium">{formatCurrency(purchaseOrder.otherCosts)}</span>
                            </div>
                        )}
                        <Separator className="my-1.5"/>
                        <div className="flex justify-between font-semibold text-base">
                            <span>Total Pesanan:</span>
                            <span>{formatCurrency(purchaseOrder.totalAmount)}</span>
                        </div>
                        {purchaseOrder.isCreditPurchase && (
                            <div className="flex justify-between text-destructive font-semibold">
                                <span>Sisa Utang:</span>
                                <span>{formatCurrency(purchaseOrder.outstandingPOAmount)}</span>
                            </div>
                        )}
                    </div>
                 </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader><CardTitle className="text-base">Informasi Umum PO</CardTitle></CardHeader>
                    <CardContent className="space-y-1.5 text-xs">
                        <p><strong>No. PO:</strong> {purchaseOrder.poNumber}</p>
                        <p><strong>Pemasok:</strong> {purchaseOrder.supplierName}</p>
                        <p><strong>Tanggal Pesan:</strong> {formatDate(purchaseOrder.orderDate)}</p>
                        <p><strong>Estimasi Terima:</strong> {purchaseOrder.expectedDeliveryDate ? formatDate(purchaseOrder.expectedDeliveryDate) : "-"}</p>
                        <p><strong>Termin Pembayaran:</strong> <span className="capitalize">{purchaseOrder.paymentTermsOnPO}</span></p>
                        {purchaseOrder.paymentTermsOnPO === 'credit' && (
                           <>
                            <p><strong>No. Invoice Pemasok:</strong> {purchaseOrder.supplierInvoiceNumber || "-"}</p>
                            <p><strong>Jatuh Tempo Pembayaran:</strong> {purchaseOrder.paymentDueDateOnPO ? formatDate(purchaseOrder.paymentDueDateOnPO) : "-"}</p>
                           </>
                        )}
                        {/* <p><strong>Dibuat Oleh:</strong> {purchaseOrder.createdById.substring(0,8)}...</p> */}
                        <p><strong>Dibuat Pada:</strong> {formatDate(purchaseOrder.createdAt, true)}</p>
                        <p><strong>Diperbarui Pada:</strong> {formatDate(purchaseOrder.updatedAt, true)}</p>
                        {purchaseOrder.notes && (
                        <>
                            <Separator className="my-1.5"/>
                            <p><strong>Catatan PO:</strong></p>
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
                        {canPaySupplier && (
                            <Button
                                size="sm"
                                className="w-full text-xs h-8"
                                variant="default"
                                onClick={() => setIsPaymentToSupplierModalOpen(true)}
                            >
                               <DollarSign className="mr-1.5 h-3.5 w-3.5"/> Catat Pembayaran ke Pemasok
                            </Button>
                        )}
                         {purchaseOrder.status === 'fully_received' && !canPaySupplier && purchaseOrder.paymentStatusOnPO === 'paid' && (
                            <p className="text-xs text-green-600 text-center font-medium py-2">PO selesai dan sudah lunas.</p>
                         )}
                          {purchaseOrder.status === 'cancelled' && (
                            <p className="text-xs text-destructive text-center font-medium py-2">Pesanan pembelian ini telah dibatalkan.</p>
                         )}
                          {!(canReceiveGoods || canPaySupplier || (purchaseOrder.status === 'fully_received' && purchaseOrder.paymentStatusOnPO === 'paid') || purchaseOrder.status === 'cancelled') && (
                             <p className="text-xs text-muted-foreground text-center py-2">Tidak ada aksi yang tersedia untuk status PO saat ini.</p>
                          )}
                    </CardContent>
                </Card>
                {purchaseOrder.paymentsMadeToSupplier && purchaseOrder.paymentsMadeToSupplier.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Riwayat Pembayaran ke Pemasok</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-32">
                                <ul className="space-y-1.5 text-xs">
                                    {purchaseOrder.paymentsMadeToSupplier.map((pmt, idx) => (
                                        <li key={idx} className="p-1.5 bg-muted/50 rounded-md">
                                            <p><strong>Tgl:</strong> {formatDate(pmt.paymentDate, true)} - <strong>{formatCurrency(pmt.amountPaid)}</strong> ({pmt.paymentMethod})</p>
                                            {pmt.notes && <p className="text-muted-foreground italic text-[0.7rem]">Catatan: {pmt.notes}</p>}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
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

        <Dialog open={isPaymentToSupplierModalOpen} onOpenChange={setIsPaymentToSupplierModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogModalTitle className="text-base">Catat Pembayaran ke Pemasok</DialogModalTitle>
                    <DialogModalDescription className="text-xs">
                        PO: {purchaseOrder.poNumber} ({purchaseOrder.supplierName}) <br/>
                        Sisa Tagihan: <span className="font-semibold">{formatCurrency(purchaseOrder.outstandingPOAmount)}</span>
                    </DialogModalDescription>
                </DialogHeader>
                <form onSubmit={paymentToSupplierForm.handleSubmit(onSubmitPaymentToSupplier)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
                    <div>
                        <Label htmlFor="paymentDateSupplier" className="text-xs">Tanggal Pembayaran*</Label>
                        <Controller
                        name="paymentDate"
                        control={paymentToSupplierForm.control}
                        render={({ field }) => (
                            <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-full justify-start text-left font-normal h-9 text-xs mt-1">
                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                {field.value ? format(field.value, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date > new Date()} /></PopoverContent>
                            </Popover>
                        )}
                        />
                        {paymentToSupplierForm.formState.errors.paymentDate && <p className="text-xs text-destructive mt-1">{paymentToSupplierForm.formState.errors.paymentDate.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="amountPaidSupplier" className="text-xs">Jumlah Dibayar* ({selectedBranch?.currency || 'Rp'})</Label>
                        <Input id="amountPaidSupplier" type="number" {...paymentToSupplierForm.register("amountPaid")} className="h-9 text-xs mt-1" placeholder="0"/>
                        {paymentToSupplierForm.formState.errors.amountPaid && <p className="text-xs text-destructive mt-1">{paymentToSupplierForm.formState.errors.amountPaid.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="paymentMethodSupplier" className="text-xs">Metode Pembayaran*</Label>
                        <Controller
                        name="paymentMethod"
                        control={paymentToSupplierForm.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash" className="text-xs">Tunai</SelectItem>
                                <SelectItem value="transfer" className="text-xs">Transfer Bank</SelectItem>
                                <SelectItem value="card" className="text-xs">Kartu</SelectItem>
                                <SelectItem value="other" className="text-xs">Lainnya</SelectItem>
                            </SelectContent>
                            </Select>
                        )}
                        />
                        {paymentToSupplierForm.formState.errors.paymentMethod && <p className="text-xs text-destructive mt-1">{paymentToSupplierForm.formState.errors.paymentMethod.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="notesSupplier" className="text-xs">Catatan (Opsional)</Label>
                        <Textarea id="notesSupplier" {...paymentToSupplierForm.register("notes")} className="text-xs mt-1 min-h-[60px]" placeholder="Catatan tambahan..."/>
                    </div>
                    <DialogModalFooter className="pt-3">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" className="text-xs h-8" disabled={isProcessingPaymentToSupplier}>Batal</Button>
                        </DialogClose>
                        <Button type="submit" className="text-xs h-8" disabled={isProcessingPaymentToSupplier || paymentToSupplierForm.formState.isSubmitting}>
                        {isProcessingPaymentToSupplier || paymentToSupplierForm.formState.isSubmitting ? "Menyimpan..." : "Simpan Pembayaran"}
                        </Button>
                    </DialogModalFooter>
                </form>
            </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
