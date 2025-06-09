
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, PlusCircle, MinusCircle, XCircle, CheckCircle, LayoutGrid, List, PackagePlus, X as ExitIcon, PlayCircle, StopCircle, DollarSign, ShoppingCart, Printer, UserPlus, CreditCard, CalendarIcon, QrCode, Banknote, ChevronsUpDown, Info, Eye } from "lucide-react";
import Image from "next/image";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItem } from "@/lib/firebase/inventory";
import type { Customer } from "@/lib/firebase/customers";
import type { BankAccount } from "@/lib/firebase/bankAccounts";
import { getInventoryItems } from "@/lib/firebase/inventory";
import { getCustomers } from "@/lib/firebase/customers";
import { getBankAccounts } from "@/lib/firebase/bankAccounts";
import { 
  startNewShift, 
  getActiveShift, 
  endShift, 
  recordTransaction, 
  getTransactionsForShift, 
  type PosShift, 
  type PosTransaction, 
  type TransactionItem, 
  type PaymentTerms,
  type ShiftPaymentMethod 
} from "@/lib/firebase/pos";
import { Timestamp } from "firebase/firestore";
import ScanCustomerDialog from "@/components/pos/scan-customer-dialog"; 
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

type ViewMode = "card" | "table";

interface CartItem extends TransactionItem {}

const COMMON_BANKS = ["BCA", "Mandiri", "BRI", "BNI", "CIMB Niaga", "Danamon", "Lainnya"];

export default function POSPage() {
  const { selectedBranch } = useBranch();
  const { userData, currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("card");
  
  const [activeShift, setActiveShift] = useState<PosShift | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [initialCashInput, setInitialCashInput] = useState("");
  
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [actualCashAtEndInput, setActualCashAtEndInput] = useState("");
  const [endShiftCalculations, setEndShiftCalculations] = useState<{
    expectedCash: number;
    totalSalesByPaymentMethod: Record<ShiftPaymentMethod, number>;
  } | null>(null);
  const [isEndingShift, setIsEndingShift] = useState(false);

  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState<PaymentTerms>('cash');
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  
  const [posModeActive, setPosModeActive] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [showPrintInvoiceDialog, setShowPrintInvoiceDialog] = useState(false);

  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
  const [cashAmountPaidInput, setCashAmountPaidInput] = useState("");
  const [customerNameInputCash, setCustomerNameInputCash] = useState(""); 
  const [calculatedChange, setCalculatedChange] = useState<number | null>(null);

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]); 
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]); 
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [creditDueDate, setCreditDueDate] = useState<Date | undefined>(undefined);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [isCustomerComboboxOpen, setIsCustomerComboboxOpen] = useState(false);

  const [showScanCustomerDialog, setShowScanCustomerDialog] = useState(false);

  const [availableBankAccounts, setAvailableBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);
  const [showBankPaymentModal, setShowBankPaymentModal] = useState(false);
  const [selectedBankName, setSelectedBankName] = useState<string>(""); 
  const [bankRefNumberInput, setBankRefNumberInput] = useState("");
  const [customerNameInputBank, setCustomerNameInputBank] = useState("");

  const [shiftTransactions, setShiftTransactions] = useState<PosTransaction[]>([]);
  const [loadingShiftTransactions, setLoadingShiftTransactions] = useState(false);
  const [showBankHistoryDialog, setShowBankHistoryDialog] = useState(false);


   useEffect(() => {
    setPosModeActive(true);
  }, []);


  const currencySymbol = selectedBranch?.currency === "IDR" ? "Rp" : (selectedBranch?.currency || "$");
  const taxRate = selectedBranch?.taxRate ? selectedBranch.taxRate / 100 : 0.0;


  const fetchBranchData = useCallback(async () => {
    if (!selectedBranch) {
      setProducts([]);
      setAllCustomers([]);
      setAvailableBankAccounts([]);
      setLoadingProducts(false);
      setLoadingCustomers(false);
      setLoadingBankAccounts(false);
      return;
    }
    setLoadingProducts(true);
    setLoadingCustomers(true);
    setLoadingBankAccounts(true);
    try {
      const [items, fetchedCustomers, fetchedBankAccounts] = await Promise.all([
        getInventoryItems(selectedBranch.id),
        getCustomers(selectedBranch.id),
        getBankAccounts({ branchId: selectedBranch.id, isActive: true }) 
      ]);
      setProducts(items);
      setAllCustomers(fetchedCustomers);
      setFilteredCustomers(fetchedCustomers.slice(0,5)); 
      setAvailableBankAccounts(fetchedBankAccounts);
    } catch (error) {
        console.error("Error fetching branch data for POS:", error);
        toast({title: "Gagal Memuat Data", description: "Tidak dapat memuat produk, pelanggan, atau rekening bank.", variant: "destructive"});
    } finally {
        setLoadingProducts(false);
        setLoadingCustomers(false);
        setLoadingBankAccounts(false);
    }
  }, [selectedBranch, toast]);

  useEffect(() => {
    if (!customerSearchTerm.trim()) {
      setFilteredCustomers(allCustomers.slice(0, 5));
    } else {
      const lowerSearch = customerSearchTerm.toLowerCase();
      setFilteredCustomers(
        allCustomers.filter(
          (customer) =>
            customer.name.toLowerCase().includes(lowerSearch) ||
            (customer.id && customer.id.toLowerCase().includes(lowerSearch)) ||
            (customer.phone && customer.phone.includes(lowerSearch))
        ).slice(0,10) 
      );
    }
  }, [customerSearchTerm, allCustomers]);

  const fetchShiftTransactions = useCallback(async () => {
    if (activeShift) {
      setLoadingShiftTransactions(true);
      const transactions = await getTransactionsForShift(activeShift.id);
      setShiftTransactions(transactions);
      setLoadingShiftTransactions(false);
    } else {
      setShiftTransactions([]);
    }
  }, [activeShift]);

  useEffect(() => {
    fetchShiftTransactions();
  }, [fetchShiftTransactions, lastTransactionId]);


  const checkForActiveShift = useCallback(async () => {
    if (!currentUser || !selectedBranch) {
      setActiveShift(null);
      setLoadingShift(false);
      return;
    }
    setLoadingShift(true);
    const shift = await getActiveShift(currentUser.uid, selectedBranch.id);
    setActiveShift(shift);
    if(shift) {
        setInitialCashInput(shift.initialCash.toString()); 
    } else {
        setInitialCashInput(""); 
    }
    setLoadingShift(false);
  }, [currentUser, selectedBranch]);

  useEffect(() => {
    fetchBranchData();
    checkForActiveShift();
  }, [fetchBranchData, checkForActiveShift]);


  const handleStartShift = async () => {
    if (!currentUser || !selectedBranch) {
      toast({ title: "Kesalahan", description: "Pengguna atau cabang tidak valid.", variant: "destructive" });
      return;
    }
    const cash = parseFloat(initialCashInput);
    if (isNaN(cash) || cash < 0) {
      toast({ title: "Input Tidak Valid", description: "Modal awal kas tidak valid.", variant: "destructive" });
      return;
    }
    const result = await startNewShift(currentUser.uid, selectedBranch.id, cash);
    if ("error" in result) {
      toast({ title: "Gagal Memulai Shift", description: result.error, variant: "destructive" });
    } else {
      setActiveShift(result);
      setShowStartShiftModal(false);
      toast({ title: "Shift Dimulai", description: `Shift dimulai dengan modal awal ${currencySymbol}${cash.toLocaleString()}` });
    }
  };

  const prepareEndShiftCalculations = async () => {
    if (!activeShift) return;
    setIsEndingShift(true);
    const transactions = await getTransactionsForShift(activeShift.id); // Reuse fetched transactions if already up-to-date
    const salesByPayment: Record<ShiftPaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };

    transactions.forEach(tx => {
        if (tx.paymentTerms === 'cash' || tx.paymentTerms === 'card' || tx.paymentTerms === 'transfer') {
            const paymentMethodForShift = tx.paymentTerms as ShiftPaymentMethod; 
            salesByPayment[paymentMethodForShift] = (salesByPayment[paymentMethodForShift] || 0) + tx.totalAmount;
        }
    });
    
    const expected = (activeShift.initialCash || 0) + salesByPayment.cash;
    setEndShiftCalculations({ expectedCash: expected, totalSalesByPaymentMethod: salesByPayment });
    setShowEndShiftModal(true);
    setIsEndingShift(false);
  };

  const handleEndShiftConfirm = async () => {
    if (!activeShift || endShiftCalculations === null) return;
    
    const actualCash = parseFloat(actualCashAtEndInput);
    if (isNaN(actualCash) || actualCash < 0) {
      toast({ title: "Input Tidak Valid", description: "Kas aktual di laci tidak valid.", variant: "destructive" });
      return;
    }
    setIsEndingShift(true);

    const cashDifference = actualCash - endShiftCalculations.expectedCash;
    
    const result = await endShift(
      activeShift.id,
      actualCash,
      endShiftCalculations.expectedCash,
      cashDifference,
      endShiftCalculations.totalSalesByPaymentMethod
    );

    if (result && "error" in result) {
      toast({ title: "Gagal Mengakhiri Shift", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Shift Diakhiri", description: "Data shift telah disimpan." });
      setActiveShift(null);
      setInitialCashInput("");
      setActualCashAtEndInput("");
      setEndShiftCalculations(null);
      setShowEndShiftModal(false);
      setCartItems([]); 
      setShiftTransactions([]);
    }
    setIsEndingShift(false);
  };

  const handleAddToCart = (product: InventoryItem) => {
    if (!activeShift) {
        toast({title: "Shift Belum Dimulai", description: "Silakan mulai shift untuk menambah item.", variant: "destructive"});
        return;
    }
    if (product.quantity <= 0) {
        toast({title: "Stok Habis", description: `${product.name} tidak tersedia.`, variant: "destructive"});
        return;
    }
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.quantity) { 
            return prevItems.map(item =>
            item.productId === product.id
                ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
                : item
            );
        } else {
            toast({title: "Stok Tidak Cukup", description: `Stok maksimal untuk ${product.name} telah ditambahkan.`, variant: "default"});
            return prevItems;
        }
      }
      return [...prevItems, { 
          productId: product.id, 
          productName: product.name, 
          quantity: 1, 
          price: product.price,
          costPrice: product.costPrice || 0,
          total: product.price 
      }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    const productInStock = products.find(p => p.id === productId);
    if (!productInStock) return;

    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    if (newQuantity > productInStock.quantity) {
        toast({title: "Stok Tidak Cukup", description: `Stok maksimal untuk produk ini adalah ${productInStock.quantity}.`, variant: "default"});
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.productId === productId
                ? { ...item, quantity: productInStock.quantity, total: productInStock.quantity * item.price }
                : item
            )
        );
        return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      )
    );
  };
  
  const handleRemoveFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.productId !== productId));
  };

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.total, 0), [cartItems]);
  const tax = useMemo(() => subtotal * taxRate, [subtotal, taxRate]);
  const total = useMemo(() => subtotal + tax, [subtotal, taxRate]);
  const totalCost = useMemo(() => cartItems.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0), [cartItems]);


  const openCashPaymentModal = () => {
    setCashAmountPaidInput(total.toString()); 
    setCustomerNameInputCash("");
    setCalculatedChange(0);
    setShowCashPaymentModal(true);
  };

  const handleCashAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const paidAmountStr = e.target.value;
    setCashAmountPaidInput(paidAmountStr);
    const paidAmount = parseFloat(paidAmountStr);
    if (!isNaN(paidAmount) && paidAmount >= total) {
      setCalculatedChange(paidAmount - total);
    } else {
      setCalculatedChange(null);
    }
  };

  const handleConfirmCashPayment = async () => {
    if (!activeShift || !selectedBranch || !currentUser) {
      toast({ title: "Kesalahan", description: "Shift, cabang, atau pengguna tidak aktif.", variant: "destructive" });
      return;
    }
    const amountPaid = parseFloat(cashAmountPaidInput);
    if (isNaN(amountPaid) || amountPaid < total) {
      toast({ title: "Pembayaran Tidak Cukup", description: "Jumlah yang dibayar kurang dari total belanja.", variant: "destructive" });
      return;
    }
    
    const change = amountPaid - total;
    setIsProcessingSale(true);

    const transactionData: Omit<PosTransaction, 'id' | 'invoiceNumber' | 'timestamp'> = {
      shiftId: activeShift.id,
      branchId: selectedBranch.id,
      userId: currentUser.uid,
      items: cartItems,
      subtotal,
      taxAmount: tax,
      totalAmount: total,
      totalCost: totalCost,
      paymentTerms: 'cash',
      amountPaid: amountPaid, 
      changeGiven: change, 
      customerName: customerNameInputCash.trim() || undefined,
      status: 'completed',
    };

    const result = await recordTransaction(transactionData);
    setIsProcessingSale(false);
    setShowCashPaymentModal(false);

    if ("error" in result || !result.id) {
      toast({ title: "Gagal Merekam Transaksi", description: result.error || "ID transaksi tidak ditemukan.", variant: "destructive" });
      setLastTransactionId(null);
    } else {
      toast({ title: "Transaksi Berhasil", description: "Penjualan telah direkam." });
      setLastTransactionId(result.id);
      setShowPrintInvoiceDialog(true);
      setCartItems([]);
      setSelectedPaymentTerms('cash');
      setCashAmountPaidInput("");
      setCustomerNameInputCash("");
      setCalculatedChange(null);
      await fetchBranchData(); 
    }
  };

  const handleConfirmBankPayment = async () => {
     if (!activeShift || !selectedBranch || !currentUser) {
      toast({ title: "Kesalahan", description: "Shift, cabang, atau pengguna tidak aktif.", variant: "destructive" });
      return;
    }
    if (!selectedBankName) { 
      toast({ title: "Bank Diperlukan", description: "Pilih nama bank.", variant: "destructive" });
      return;
    }
    if (!bankRefNumberInput.trim()) {
      toast({ title: "No. Referensi Diperlukan", description: "Masukkan nomor referensi transaksi bank.", variant: "destructive" });
      return;
    }

    setIsProcessingSale(true);
    const transactionData: Omit<PosTransaction, 'id' | 'invoiceNumber' | 'timestamp'> = {
      shiftId: activeShift.id,
      branchId: selectedBranch.id,
      userId: currentUser.uid,
      items: cartItems,
      subtotal,
      taxAmount: tax,
      totalAmount: total,
      totalCost: totalCost,
      paymentTerms: 'transfer',
      amountPaid: total, 
      changeGiven: 0,
      customerName: customerNameInputBank.trim() || undefined,
      status: 'completed',
      bankName: selectedBankName, 
      bankTransactionRef: bankRefNumberInput.trim(),
    };

    const result = await recordTransaction(transactionData);
    setIsProcessingSale(false);
    setShowBankPaymentModal(false);

    if ("error" in result || !result.id) {
      toast({ title: "Gagal Merekam Transaksi", description: result.error || "ID transaksi tidak ditemukan.", variant: "destructive" });
      setLastTransactionId(null);
    } else {
      toast({ title: "Transaksi Berhasil", description: "Penjualan transfer telah direkam." });
      setLastTransactionId(result.id);
      setShowPrintInvoiceDialog(true);
      setCartItems([]);
      setSelectedPaymentTerms('cash'); 
      setSelectedBankName("");
      setBankRefNumberInput("");
      setCustomerNameInputBank("");
      await fetchBranchData(); 
    }
  };


  const handleCompleteSale = async () => {
    if (!activeShift || !selectedBranch || !currentUser) {
      toast({ title: "Kesalahan", description: "Shift, cabang, atau pengguna tidak aktif.", variant: "destructive" });
      return;
    }
    if (cartItems.length === 0) {
      toast({ title: "Keranjang Kosong", description: "Tidak ada item di keranjang.", variant: "destructive" });
      return;
    }

    if (selectedPaymentTerms === 'cash') {
      openCashPaymentModal();
      return; 
    }
    if (selectedPaymentTerms === 'transfer') {
      setSelectedBankName(""); 
      setBankRefNumberInput("");
      setCustomerNameInputBank("");
      setShowBankPaymentModal(true);
      return;
    }


    let customerNameForTx: string | undefined = undefined;
    if (selectedPaymentTerms === 'credit') {
        if (!selectedCustomerId) {
            toast({ title: "Pelanggan Diperlukan", description: "Pilih pelanggan untuk penjualan kredit.", variant: "destructive" });
            return;
        }
        if (!creditDueDate) {
            toast({ title: "Tanggal Jatuh Tempo Diperlukan", description: "Pilih tanggal jatuh tempo untuk penjualan kredit.", variant: "destructive" });
            return;
        }
        const cust = allCustomers.find(c => c.id === selectedCustomerId);
        customerNameForTx = cust?.name;
    }

    setIsProcessingSale(true);
    const transactionData: Omit<PosTransaction, 'id' | 'invoiceNumber' | 'timestamp'> = {
      shiftId: activeShift.id,
      branchId: selectedBranch.id,
      userId: currentUser.uid,
      items: cartItems,
      subtotal,
      taxAmount: tax,
      totalAmount: total,
      totalCost: totalCost,
      paymentTerms: selectedPaymentTerms,
      amountPaid: selectedPaymentTerms === 'credit' ? 0 : total, 
      changeGiven: 0, 
      customerId: selectedPaymentTerms === 'credit' ? selectedCustomerId : undefined,
      customerName: customerNameForTx,
      creditDueDate: selectedPaymentTerms === 'credit' && creditDueDate ? Timestamp.fromDate(creditDueDate) : undefined,
      isCreditSale: selectedPaymentTerms === 'credit',
      outstandingAmount: selectedPaymentTerms === 'credit' ? total : 0,
      paymentStatus: selectedPaymentTerms === 'credit' ? 'unpaid' : 'paid',
      status: 'completed',
    };

    const result = await recordTransaction(transactionData);

    if ("error" in result || !result.id) {
      toast({ title: "Gagal Merekam Transaksi", description: result.error || "ID transaksi tidak ditemukan.", variant: "destructive" });
      setLastTransactionId(null);
    } else {
      toast({ title: "Transaksi Berhasil", description: "Penjualan telah direkam." });
      setLastTransactionId(result.id);
      setShowPrintInvoiceDialog(true); 
      setCartItems([]);
      setSelectedPaymentTerms('cash');
      setSelectedCustomerId(undefined);
      setCreditDueDate(undefined);
      setCustomerSearchTerm("");
      await fetchBranchData();
    }
    setIsProcessingSale(false);
  };

  const handlePrintInvoice = () => {
    if (lastTransactionId) {
        window.open(`/invoice/${lastTransactionId}/view`, '_blank');
    }
    setShowPrintInvoiceDialog(false);
    setLastTransactionId(null);
  };

  const handleScanCustomerSuccess = (scannedId: string) => {
    const foundCustomer = allCustomers.find(c => c.id === scannedId || c.qrCodeId === scannedId);
    if (foundCustomer) {
        setSelectedCustomerId(foundCustomer.id);
        setCustomerSearchTerm(foundCustomer.name); 
        setSelectedPaymentTerms('credit'); 
        toast({title: "Pelanggan Ditemukan", description: `Pelanggan "${foundCustomer.name}" dipilih.`});
    } else {
        toast({title: "Pelanggan Tidak Ditemukan", description: "ID pelanggan dari QR code tidak terdaftar.", variant: "destructive"});
    }
    setShowScanCustomerDialog(false);
  };


  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCashSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter(tx => tx.paymentTerms === 'cash' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [shiftTransactions]);

  const totalCardSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter(tx => tx.paymentTerms === 'card' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [shiftTransactions]);

  const totalTransferSalesInShift = useMemo(() => {
    return shiftTransactions
      .filter(tx => tx.paymentTerms === 'transfer' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [shiftTransactions]);
  
  const estimatedCashInDrawer = useMemo(() => {
    return (activeShift?.initialCash || 0) + totalCashSalesInShift;
  }, [activeShift, totalCashSalesInShift]);

  const bankTransactionsInShift = useMemo(() => {
    return shiftTransactions.filter(tx => tx.paymentTerms === 'transfer' && tx.status === 'completed');
  }, [shiftTransactions]);

  const formatDateTimestamp = (timestamp?: Timestamp, includeTime = true) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return format(date, includeTime ? "dd MMM yy, HH:mm" : "dd MMM yyyy");
  };


  if (!posModeActive || loadingShift ) {
    return <div className="flex h-screen items-center justify-center">Memuat Mode POS...</div>;
  }

  return (
    <ProtectedRoute>
      <MainLayout focusMode={true}>
        <div className="flex flex-col h-screen bg-background">
          <header className="grid grid-cols-3 items-center justify-between p-3 border-b bg-card shadow-sm sticky top-0 z-10 gap-3">
            <div className="flex items-center gap-2 col-span-1">
                <DollarSign className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-semibold font-headline">
                    POS {selectedBranch ? `- ${selectedBranch.name}` : '(Pilih Cabang)'}
                </h1>
            </div>
            {activeShift ? (
              <div className="col-span-1 text-xs text-center space-y-0.5">
                 <p className="text-green-600 font-medium flex items-center justify-center">
                    <PlayCircle className="h-3.5 w-3.5 mr-1" /> Shift Aktif
                </p>
                <Separator className="my-0.5"/>
                <div className="grid grid-cols-2 gap-x-2">
                  <p>Modal Awal: <span className="font-semibold">{currencySymbol}{(activeShift.initialCash || 0).toLocaleString('id-ID')}</span></p>
                  <p>Kas Seharusnya: <span className="font-semibold">{currencySymbol}{estimatedCashInDrawer.toLocaleString('id-ID')}</span></p>
                  <p>Total Kartu: <span className="font-semibold">{currencySymbol}{totalCardSalesInShift.toLocaleString('id-ID')}</span></p>
                  <p>
                    Total Transfer: <span className="font-semibold">{currencySymbol}{totalTransferSalesInShift.toLocaleString('id-ID')}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs text-blue-600 hover:text-blue-800" onClick={() => setShowBankHistoryDialog(true)} disabled={bankTransactionsInShift.length === 0}>
                       (Lihat Detail)
                    </Button>
                  </p>
                </div>
              </div>
            ) : (
                 <div className="col-span-1 text-center">
                     <Button variant="default" size="sm" className="text-xs h-8" onClick={() => setShowStartShiftModal(true)} disabled={!selectedBranch || !currentUser}>
                        <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Mulai Shift
                    </Button>
                 </div>
            )}
            <div className="col-span-1 flex justify-end items-center gap-2">
                {activeShift && (
                     <Button variant="destructive" size="sm" className="text-xs h-8" onClick={prepareEndShiftCalculations} disabled={isEndingShift}>
                        {isEndingShift ? "Memproses..." : <><StopCircle className="mr-1.5 h-3.5 w-3.5" /> Akhiri Shift</>}
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/dashboard')}>
                  <ExitIcon className="h-5 w-5" />
                  <span className="sr-only">Keluar dari Mode POS</span>
                </Button>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-3/5 p-3 space-y-3 flex flex-col">
              <div className="flex justify-between items-center gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Cari produk atau SKU..." 
                    className="pl-8 w-full rounded-md h-8 text-xs" 
                    disabled={!activeShift || loadingProducts} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant={viewMode === 'card' ? 'secondary' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode('card')} aria-label="Card View" disabled={!activeShift}><LayoutGrid className="h-4 w-4" /></Button>
                  <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode('table')} aria-label="Table View" disabled={!activeShift}><List className="h-4 w-4" /></Button>
                </div>
              </div>
              
              <div className={cn("flex-grow overflow-y-auto p-0.5 -m-0.5 relative", viewMode === 'card' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5" : "")}>
                {loadingProducts ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">{[...Array(8)].map((_,i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
                ) : filteredProducts.length === 0 ? (<div className="text-center py-10 text-muted-foreground text-sm">{products.length === 0 ? "Belum ada produk di cabang ini." : "Produk tidak ditemukan."}</div>
                ) : viewMode === 'card' ? (
                  filteredProducts.map(product => (
                    <Card key={product.id} className={cn("overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-md cursor-pointer", product.quantity <= 0 && "opacity-60 cursor-not-allowed")} onClick={() => product.quantity > 0 && handleAddToCart(product)}>
                      <Image src={product.imageUrl || `https://placehold.co/150x150.png`} alt={product.name} width={150} height={150} className="w-full h-24 object-cover" data-ai-hint={product.imageHint || product.name.split(" ").slice(0,2).join(" ").toLowerCase()} onError={(e) => (e.currentTarget.src = "https://placehold.co/150x150.png")} />
                      <CardContent className="p-2"><h3 className="font-semibold text-xs truncate leading-snug">{product.name}</h3><p className="text-primary font-bold text-sm mt-0.5">{currencySymbol}{product.price.toLocaleString('id-ID')}</p><p className="text-xs text-muted-foreground mb-1">Stok: {product.quantity}</p>
                        <Button size="sm" className="w-full text-xs h-7" disabled={!activeShift || product.quantity <= 0} onClick={(e) => { e.stopPropagation(); if (product.quantity > 0) handleAddToCart(product); }}><PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Tambah</Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="border rounded-md overflow-hidden"><Table><TableHeader><TableRow><TableHead className="w-[40px] p-1.5 hidden sm:table-cell"></TableHead><TableHead className="p-1.5 text-xs">Nama Produk</TableHead><TableHead className="p-1.5 text-xs text-right">Harga</TableHead><TableHead className="p-1.5 text-xs text-center hidden md:table-cell">Stok</TableHead><TableHead className="p-1.5 text-xs text-center">Aksi</TableHead></TableRow></TableHeader><TableBody>
                        {filteredProducts.map(product => (<TableRow key={product.id} className={cn(product.quantity <= 0 && "opacity-60")}><TableCell className="p-1 hidden sm:table-cell"><Image src={product.imageUrl || `https://placehold.co/28x28.png`} alt={product.name} width={28} height={28} className="rounded object-cover h-7 w-7" data-ai-hint={product.imageHint || product.name.split(" ").slice(0,2).join(" ").toLowerCase()} onError={(e) => (e.currentTarget.src = "https://placehold.co/28x28.png")} /></TableCell><TableCell className="p-1.5 text-xs font-medium">{product.name}</TableCell><TableCell className="p-1.5 text-xs text-right">{currencySymbol}{product.price.toLocaleString('id-ID')}</TableCell><TableCell className="p-1.5 text-xs text-center hidden md:table-cell">{product.quantity}</TableCell><TableCell className="p-1.5 text-xs text-center"><Button variant="outline" size="sm" className="h-7 text-xs" disabled={!activeShift || product.quantity <= 0} onClick={() => product.quantity > 0 && handleAddToCart(product)}><PackagePlus className="mr-1 h-3 w-3" /> Tambah</Button></TableCell></TableRow>))}
                      </TableBody></Table></div>
                )}
                {!activeShift && (<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md z-10"><p className="text-sm font-medium text-muted-foreground p-4 bg-card border rounded-lg shadow-md">Mulai shift untuk mengaktifkan penjualan.</p></div>)}
              </div>
            </div>

            <Card className="w-2/5 m-3 ml-0 flex flex-col shadow-lg rounded-lg">
              <CardHeader className="p-3 border-b"><CardTitle className="text-base font-semibold">Penjualan Saat Ini</CardTitle></CardHeader>
              <CardContent className="flex-grow overflow-y-auto p-0"><Table><TableHeader><TableRow><TableHead className="text-xs px-2 py-1.5">Item</TableHead><TableHead className="text-center text-xs px-2 py-1.5 w-[90px]">Jml</TableHead><TableHead className="text-right text-xs px-2 py-1.5">Total</TableHead><TableHead className="text-right text-xs px-1 py-1.5 w-[30px]"> </TableHead></TableRow></TableHeader><TableBody>
                    {cartItems.map(item => (<TableRow key={item.productId}><TableCell className="font-medium text-xs py-1 px-2 truncate">{item.productName}</TableCell><TableCell className="text-center text-xs py-1 px-2"><div className="flex items-center justify-center gap-0.5"><Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" disabled={!activeShift} onClick={() => handleUpdateCartQuantity(item.productId, item.quantity - 1)}><MinusCircle className="h-3.5 w-3.5" /></Button><Input type="number" value={item.quantity} onChange={(e) => handleUpdateCartQuantity(item.productId, parseInt(e.target.value) || 0)} className="h-6 w-10 text-center text-xs p-0 border-0 focus-visible:ring-0 bg-transparent" disabled={!activeShift}/><Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" disabled={!activeShift} onClick={() => handleUpdateCartQuantity(item.productId, item.quantity + 1)}><PlusCircle className="h-3.5 w-3.5" /></Button></div></TableCell><TableCell className="text-right text-xs py-1 px-2">{currencySymbol}{item.total.toLocaleString('id-ID')}</TableCell><TableCell className="text-right py-1 px-1"><Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive/80" disabled={!activeShift} onClick={() => handleRemoveFromCart(item.productId)}><XCircle className="h-3.5 w-3.5" /></Button></TableCell></TableRow>))}
                    {cartItems.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs"><ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />Keranjang kosong</TableCell></TableRow>)}
                  </TableBody></Table></CardContent>
              <CardFooter className="flex flex-col gap-1.5 border-t p-3">
                <div className="flex justify-between text-xs w-full"><span>Subtotal:</span><span>{currencySymbol}{subtotal.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-xs w-full"><span>Pajak ({selectedBranch?.taxRate || (taxRate*100).toFixed(0)}%):</span><span>{currencySymbol}{tax.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-base font-bold w-full mt-1"><span>Total:</span><span>{currencySymbol}{total.toLocaleString('id-ID')}</span></div>
                
                <div className="w-full mt-2 pt-2 border-t"><Label className="text-xs font-medium mb-1 block">Termin Pembayaran:</Label>
                     <Select value={selectedPaymentTerms} onValueChange={(value) => {setSelectedPaymentTerms(value as PaymentTerms); if (value !== 'credit') {setSelectedCustomerId(undefined); setCreditDueDate(undefined); setCustomerSearchTerm("");}}} disabled={!activeShift || cartItems.length === 0}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih termin pembayaran" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash" className="text-xs"><DollarSign className="inline-block mr-2 h-4 w-4" />Tunai</SelectItem>
                            <SelectItem value="card" className="text-xs"><CreditCard className="inline-block mr-2 h-4 w-4" />Kartu</SelectItem>
                            <SelectItem value="transfer" className="text-xs"><Banknote className="inline-block mr-2 h-4 w-4" />Transfer Bank</SelectItem>
                            <SelectItem value="credit" className="text-xs"><UserPlus className="inline-block mr-2 h-4 w-4" />Kredit</SelectItem>
                        </SelectContent></Select>
                </div>

                {selectedPaymentTerms === 'credit' && (
                    <div className="w-full mt-2 space-y-2 p-2 border rounded-md bg-muted/30">
                        <div className="flex items-center gap-2"><div className="flex-grow">
                                <Label htmlFor="selectedCustomer" className="text-xs">Pelanggan</Label>
                                <Popover open={isCustomerComboboxOpen} onOpenChange={setIsCustomerComboboxOpen}><PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={isCustomerComboboxOpen} className="w-full justify-between h-8 text-xs mt-1 font-normal" disabled={loadingCustomers || allCustomers.length === 0}>
                                            {selectedCustomerId ? allCustomers.find((customer) => customer.id === selectedCustomerId)?.name : (loadingCustomers ? "Memuat..." : (allCustomers.length === 0 ? "Tidak ada pelanggan" : "Pilih Pelanggan"))}
                                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" /></Button>
                                    </PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command shouldFilter={false}>
                                            <CommandInput placeholder="Cari pelanggan (nama/ID)..." value={customerSearchTerm} onValueChange={setCustomerSearchTerm} className="h-9 text-xs"/>
                                            <CommandEmpty className="p-2 text-xs text-center">{loadingCustomers ? "Memuat..." : "Pelanggan tidak ditemukan."}</CommandEmpty>
                                            <CommandList><CommandGroup>
                                                    {filteredCustomers.map((customer) => (<CommandItem key={customer.id} value={customer.id} onSelect={(currentValue) => { setSelectedCustomerId(currentValue === selectedCustomerId ? undefined : currentValue); setCustomerSearchTerm(currentValue === selectedCustomerId ? "" : customer.name); setIsCustomerComboboxOpen(false);}} className="text-xs">
                                                        <CheckCircle className={cn("mr-2 h-3.5 w-3.5", selectedCustomerId === customer.id ? "opacity-100" : "opacity-0")}/>{customer.name}</CommandItem>))}
                                            </CommandGroup></CommandList></Command></PopoverContent></Popover>
                            </div>
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 mt-[18px]" onClick={() => setShowScanCustomerDialog(true)} disabled={loadingCustomers}><QrCode className="h-4 w-4"/><span className="sr-only">Scan Pelanggan</span></Button>
                        </div>
                        <div><Label htmlFor="creditDueDate" className="text-xs">Tgl Jatuh Tempo</Label>
                            <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-8 text-xs mt-1", !creditDueDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />{creditDueDate ? format(creditDueDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}</Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={creditDueDate} onSelect={setCreditDueDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} /></PopoverContent></Popover>
                        </div></div>
                )}

                <Button size="lg" className="w-full mt-2 h-10 text-sm" disabled={!activeShift || cartItems.length === 0 || isProcessingSale || (selectedPaymentTerms === 'credit' && (!selectedCustomerId || !creditDueDate))} onClick={handleCompleteSale}>
                  {isProcessingSale ? "Memproses..." : <><CheckCircle className="mr-1.5 h-4 w-4" /> Selesaikan Penjualan</>}</Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        <Dialog open={showStartShiftModal} onOpenChange={setShowStartShiftModal}><DialogContent className="sm:max-w-xs"><DialogHeader><DialogTitle className="text-base">Mulai Shift Baru</DialogTitle><DialogDescription className="text-xs">Masukkan jumlah modal awal kas di laci kas.</DialogDescription></DialogHeader><div className="py-2 space-y-2"><Label htmlFor="initialCashInput" className="text-xs">Modal Awal Kas ({currencySymbol})</Label><Input id="initialCashInput" type="number" value={initialCashInput} onChange={(e) => setInitialCashInput(e.target.value)} placeholder="Contoh: 500000" className="h-9 text-sm" /></div><DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8">Batal</Button></DialogClose><Button onClick={handleStartShift} className="text-xs h-8">Mulai Shift</Button></DialogFooter></DialogContent></Dialog>

        <AlertDialog open={showEndShiftModal} onOpenChange={setShowEndShiftModal}><AlertDialogContent className="sm:max-w-md"><AlertDialogHeader><AlertDialogTitle>Konfirmasi Akhiri Shift</AlertDialogTitle><AlertDialogDescription className="text-xs">
                        {activeShift && endShiftCalculations && (<div className="mt-2 p-2 border rounded-md bg-muted/50 text-xs space-y-1"><p>Modal Awal: {currencySymbol}{activeShift.initialCash.toLocaleString('id-ID')}</p><p>Total Penjualan Tunai: {currencySymbol}{endShiftCalculations.totalSalesByPaymentMethod.cash.toLocaleString('id-ID')}</p><p>Total Penjualan Kartu: {currencySymbol}{endShiftCalculations.totalSalesByPaymentMethod.card.toLocaleString('id-ID')}</p><p>Total Penjualan Transfer: {currencySymbol}{endShiftCalculations.totalSalesByPaymentMethod.transfer.toLocaleString('id-ID')}</p><p className="font-semibold">Estimasi Kas Seharusnya: {currencySymbol}{endShiftCalculations.expectedCash.toLocaleString('id-ID')}</p></div>)}
                        <div className="mt-2"><Label htmlFor="actualCashAtEndInput" className="text-xs">Kas Aktual di Laci ({currencySymbol})</Label><Input id="actualCashAtEndInput" type="number" value={actualCashAtEndInput} onChange={(e) => setActualCashAtEndInput(e.target.value)} placeholder="Hitung dan masukkan kas aktual" className="h-9 text-sm mt-1" /></div>
                        {activeShift && endShiftCalculations && actualCashAtEndInput && !isNaN(parseFloat(actualCashAtEndInput)) && (<p className="mt-1 font-medium text-xs">Selisih Kas: <span className={cn(parseFloat(actualCashAtEndInput) - endShiftCalculations.expectedCash < 0 ? "text-destructive" : "text-green-600")}>{currencySymbol}{(parseFloat(actualCashAtEndInput) - endShiftCalculations.expectedCash).toLocaleString('id-ID')}</span>{parseFloat(actualCashAtEndInput) - endShiftCalculations.expectedCash === 0 ? " (Sesuai)" : ""}{parseFloat(actualCashAtEndInput) - endShiftCalculations.expectedCash < 0 ? " (Kurang)" : ""}{parseFloat(actualCashAtEndInput) - endShiftCalculations.expectedCash > 0 ? " (Lebih)" : ""}</p>)}
                    </AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs h-8" onClick={() => {setShowEndShiftModal(false); setActualCashAtEndInput(""); setEndShiftCalculations(null);}}>Batal</AlertDialogCancel><AlertDialogAction className="text-xs h-8 bg-destructive hover:bg-destructive/90" onClick={handleEndShiftConfirm} disabled={isEndingShift || !actualCashAtEndInput.trim()}>{isEndingShift ? "Memproses..." : "Ya, Akhiri Shift"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

        <Dialog open={showCashPaymentModal} onOpenChange={setShowCashPaymentModal}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle className="text-base">Pembayaran Tunai</DialogTitle><DialogDescription className="text-xs">Total Belanja: <span className="font-semibold">{currencySymbol}{total.toLocaleString('id-ID')}</span></DialogDescription></DialogHeader><div className="py-3 space-y-3"><div><Label htmlFor="cashAmountPaidInput" className="text-xs">Jumlah Dibayar Pelanggan ({currencySymbol})</Label><Input id="cashAmountPaidInput" type="number" value={cashAmountPaidInput} onChange={handleCashAmountPaidChange} placeholder="Masukkan jumlah bayar" className="h-9 text-sm mt-1" /></div>
              {calculatedChange !== null && (<p className={cn("text-sm font-medium", calculatedChange < 0 ? "text-destructive" : "text-green-600")}>Kembalian: {currencySymbol}{calculatedChange.toLocaleString('id-ID')}</p>)}
              <div><Label htmlFor="customerNameInputCash" className="text-xs">Nama Pelanggan (Opsional)</Label><div className="flex items-center mt-1"><UserPlus className="h-4 w-4 mr-2 text-muted-foreground"/><Input id="customerNameInputCash" type="text" value={customerNameInputCash} onChange={(e) => setCustomerNameInputCash(e.target.value)} placeholder="Masukkan nama pelanggan" className="h-9 text-sm flex-1" /></div><p className="text-xs text-muted-foreground mt-1">Kosongkan jika tidak ada nama pelanggan.</p></div></div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8" onClick={() => setShowCashPaymentModal(false)}>Batal</Button></DialogClose><Button onClick={handleConfirmCashPayment} className="text-xs h-8" disabled={isProcessingSale || calculatedChange === null || calculatedChange < 0}>{isProcessingSale ? "Memproses..." : "Konfirmasi Pembayaran"}</Button></DialogFooter></DialogContent></Dialog>

        <Dialog open={showBankPaymentModal} onOpenChange={setShowBankPaymentModal}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle className="text-base">Pembayaran via Transfer Bank</DialogTitle><DialogDescription className="text-xs">Total Belanja: <span className="font-semibold">{currencySymbol}{total.toLocaleString('id-ID')}</span></DialogDescription></DialogHeader><div className="py-3 space-y-3">
              <div><Label htmlFor="selectedBankName" className="text-xs">Nama Bank*</Label>
                <Select value={selectedBankName} onValueChange={setSelectedBankName} disabled={loadingBankAccounts}>
                  <SelectTrigger id="selectedBankName" className="h-9 text-xs mt-1"><SelectValue placeholder={loadingBankAccounts ? "Memuat..." : "Pilih bank tujuan"} /></SelectTrigger>
                  <SelectContent>
                    {availableBankAccounts.length === 0 && !loadingBankAccounts ? (<SelectItem value="" disabled className="text-xs text-muted-foreground">Tidak ada rekening bank aktif</SelectItem>) : (availableBankAccounts.map(acc => (<SelectItem key={acc.id} value={acc.bankName} className="text-xs">{acc.bankName} ({acc.accountNumber}) - A/N: {acc.accountHolderName}</SelectItem>)))}
                  </SelectContent></Select></div>
              <div><Label htmlFor="bankRefNumberInput" className="text-xs">Nomor Referensi Transaksi*</Label><Input id="bankRefNumberInput" type="text" value={bankRefNumberInput} onChange={(e) => setBankRefNumberInput(e.target.value)} placeholder="Masukkan nomor referensi" className="h-9 text-sm mt-1" /></div>
               <div><Label htmlFor="customerNameInputBank" className="text-xs">Nama Pelanggan (Opsional)</Label><div className="flex items-center mt-1"><UserPlus className="h-4 w-4 mr-2 text-muted-foreground"/><Input id="customerNameInputBank" type="text" value={customerNameInputBank} onChange={(e) => setCustomerNameInputBank(e.target.value)} placeholder="Masukkan nama pelanggan" className="h-9 text-sm flex-1" /></div></div></div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="text-xs h-8" onClick={() => setShowBankPaymentModal(false)}>Batal</Button></DialogClose><Button onClick={handleConfirmBankPayment} className="text-xs h-8" disabled={isProcessingSale || !selectedBankName || !bankRefNumberInput.trim()}>{isProcessingSale ? "Memproses..." : "Konfirmasi Pembayaran"}</Button></DialogFooter></DialogContent></Dialog>

        <Dialog open={showPrintInvoiceDialog} onOpenChange={(open) => { if (!open) {setShowPrintInvoiceDialog(false); setLastTransactionId(null);} else {setShowPrintInvoiceDialog(true);}}}>
            <DialogContent className="sm:max-w-xs"><DialogHeader><DialogTitle className="text-base">Transaksi Berhasil</DialogTitle><DialogDescription className="text-xs">Penjualan telah berhasil direkam.</DialogDescription></DialogHeader><div className="py-4"><p className="text-sm text-center">Apakah Anda ingin mencetak invoice untuk transaksi ini?</p></div>
                <DialogFooter className="sm:justify-center"><Button type="button" variant="outline" className="text-xs h-8" onClick={() => {setShowPrintInvoiceDialog(false); setLastTransactionId(null);}}>Tutup</Button><Button onClick={handlePrintInvoice} className="text-xs h-8" disabled={!lastTransactionId}><Printer className="mr-1.5 h-4 w-4" /> Cetak Invoice</Button></DialogFooter></DialogContent></Dialog>
        
        <ScanCustomerDialog isOpen={showScanCustomerDialog} onClose={() => setShowScanCustomerDialog(false)} onScanSuccess={handleScanCustomerSuccess} branchId={selectedBranch?.id || ""}/>
      
        <Dialog open={showBankHistoryDialog} onOpenChange={setShowBankHistoryDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">Riwayat Transaksi Transfer Bank (Shift Ini)</DialogTitle>
              <DialogDescription className="text-xs">
                Menampilkan semua transaksi dengan metode pembayaran transfer bank selama shift berjalan.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 max-h-[60vh] overflow-y-auto">
              {loadingShiftTransactions ? (
                <Skeleton className="h-20 w-full" />
              ) : bankTransactionsInShift.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">No. Inv</TableHead>
                      <TableHead className="text-xs">Tanggal</TableHead>
                      <TableHead className="text-xs">Bank</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Ref.</TableHead>
                      <TableHead className="text-xs text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankTransactionsInShift.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs py-1.5 font-medium">{tx.invoiceNumber}</TableCell>
                        <TableCell className="text-xs py-1.5">{formatDateTimestamp(tx.timestamp)}</TableCell>
                        <TableCell className="text-xs py-1.5">{tx.bankName || "-"}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell py-1.5">{tx.bankTransactionRef || "-"}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{currencySymbol}{tx.totalAmount.toLocaleString('id-ID')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada transaksi transfer bank pada shift ini.
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="text-xs h-8">Tutup</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}

