
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, PlusCircle, MinusCircle, XCircle, CheckCircle, LayoutGrid, List, PackagePlus, LogOut, PlayCircle, StopCircle, DollarSign, ShoppingCart, Printer, UserPlus, CreditCard, CalendarIcon, QrCode, Banknote, ChevronsUpDown, Info, Eye, History as HistoryIcon, Percent, ChevronLeft, ChevronRight, Edit3, Trash2 } from "lucide-react";
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
  getTransactionById,
  type PosShift,
  type PosTransaction,
  type TransactionItem,
  type PaymentTerms,
  type ShiftPaymentMethod
} from "@/lib/firebase/pos";
import { Timestamp, type DocumentSnapshot, type DocumentData } from "firebase/firestore";
import ScanCustomerDialog from "@/components/pos/scan-customer-dialog";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type ViewMode = "card" | "table";
const LOCALSTORAGE_POS_VIEW_MODE_KEY = "branchwise_posViewMode";
const POS_ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96];


interface CartItem extends TransactionItem {
  itemDiscountType?: 'nominal' | 'percentage';
  itemDiscountValue?: number;
}

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
  
  const [itemsPerPagePOS, setItemsPerPagePOS] = useState<number>(POS_ITEMS_PER_PAGE_OPTIONS[2]); // Default 48
  const [currentPagePOS, setCurrentPagePOS] = useState(1);
  const [lastVisibleProductPOS, setLastVisibleProductPOS] = useState<DocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleProductPOS, setFirstVisibleProductPOS] = useState<DocumentSnapshot<DocumentData> | null>(null);
  const [isLastPagePOS, setIsLastPagePOS] = useState(false);


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
  const [showShiftCashDetailsDialog, setShowShiftCashDetailsDialog] = useState(false);
  const [showAllShiftTransactionsDialog, setShowAllShiftTransactionsDialog] = useState(false);

  const [shippingCostInput, setShippingCostInput] = useState("");
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [voucherDiscountInput, setVoucherDiscountInput] = useState("");

  const [isItemDiscountDialogOpen, setIsItemDiscountDialogOpen] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<CartItem | null>(null);
  const [currentDiscountType, setCurrentDiscountType] = useState<'nominal' | 'percentage'>('nominal');
  const [currentDiscountValue, setCurrentDiscountValue] = useState<string>("");


  useEffect(() => {
    setPosModeActive(true);
    const savedViewMode = localStorage.getItem(LOCALSTORAGE_POS_VIEW_MODE_KEY) as ViewMode | null;
    if (savedViewMode && (savedViewMode === 'card' || savedViewMode === 'table')) {
      setViewMode(savedViewMode);
    }
  }, []);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(LOCALSTORAGE_POS_VIEW_MODE_KEY, mode);
  };

  const currencySymbol = selectedBranch?.currency === "IDR" ? "Rp" : (selectedBranch?.currency || "$");
  const taxRate = selectedBranch?.taxRate ? selectedBranch.taxRate / 100 : 0.0;

  const fetchPOSProducts = useCallback(async (page: number, direction?: 'next' | 'prev' | 'reset') => {
    if (!selectedBranch) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);

    let startAfterDoc = lastVisibleProductPOS;
    let endBeforeDoc = firstVisibleProductPOS;

    if (direction === 'reset' || page === 1) {
      startAfterDoc = null;
      endBeforeDoc = null;
      setCurrentPagePOS(1);
    } else if (direction === 'prev' && page > 1) {
      startAfterDoc = null; // endBefore will be used
    } else if (direction === 'next') {
      endBeforeDoc = null; // startAfter will be used
    }


    try {
      const { items, lastDoc, firstDoc, hasMore } = await getInventoryItems(selectedBranch.id, {
        limit: itemsPerPagePOS,
        startAfterDoc: direction === 'next' ? startAfterDoc : null,
        endBeforeDoc: direction === 'prev' ? endBeforeDoc : null,
        searchTerm: searchTerm.trim() || undefined,
      });
      
      setProducts(items);
      setLastVisibleProductPOS(lastDoc || null);
      setFirstVisibleProductPOS(firstDoc || null);
      setIsLastPagePOS(!hasMore);

    } catch (error) {
      console.error("Error fetching products for POS:", error);
      toast({ title: "Gagal Memuat Produk", description: "Tidak dapat memuat daftar produk.", variant: "destructive" });
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedBranch, itemsPerPagePOS, searchTerm, lastVisibleProductPOS, firstVisibleProductPOS, toast]);

  const handlePageChangePOS = (newPage: number, direction: 'next' | 'prev') => {
    if (newPage < 1) return;
    setCurrentPagePOS(newPage);
    fetchPOSProducts(newPage, direction);
  };

  useEffect(() => {
    fetchPOSProducts(1, 'reset'); 
  }, [selectedBranch, searchTerm, itemsPerPagePOS]); 


  const fetchCustomersAndBankAccounts = useCallback(async () => {
    if (!selectedBranch) {
      setAllCustomers([]);
      setAvailableBankAccounts([]);
      setLoadingCustomers(false);
      setLoadingBankAccounts(false);
      return;
    }
    setLoadingCustomers(true);
    setLoadingBankAccounts(true);
    try {
      const [fetchedCustomers, fetchedBankAccounts] = await Promise.all([
        getCustomers(selectedBranch.id),
        getBankAccounts({ branchId: selectedBranch.id, isActive: true })
      ]);
      setAllCustomers(fetchedCustomers);
      setFilteredCustomers(fetchedCustomers.slice(0,5));
      setAvailableBankAccounts(fetchedBankAccounts);
    } catch (error) {
        console.error("Error fetching customers/banks for POS:", error);
        toast({title: "Gagal Memuat Data", description: "Tidak dapat memuat pelanggan atau rekening bank.", variant: "destructive"});
    } finally {
        setLoadingCustomers(false);
        setLoadingBankAccounts(false);
    }
  }, [selectedBranch, toast]);

  useEffect(() => {
    fetchCustomersAndBankAccounts();
  }, [fetchCustomersAndBankAccounts]);


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
    checkForActiveShift();
  }, [checkForActiveShift]);


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
    await fetchShiftTransactions(); 
    const currentShiftTransactions = shiftTransactions; 

    const salesByPayment: Record<ShiftPaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };

    currentShiftTransactions.forEach(tx => { 
        if (tx.paymentTerms === 'cash' || tx.paymentTerms === 'card' || tx.paymentTerms === 'transfer') {
             if (tx.status === 'completed') {
                const paymentMethodForShift = tx.paymentTerms as ShiftPaymentMethod;
                salesByPayment[paymentMethodForShift] = (salesByPayment[paymentMethodForShift] || 0) + tx.totalAmount;
             }
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
          originalPrice: product.price,
          price: product.price,
          discountAmount: 0,
          itemDiscountType: 'nominal',
          itemDiscountValue: 0,
          quantity: 1,
          costPrice: product.costPrice || 0,
          total: product.price
      }];
    });
  };
  
  const handleOpenItemDiscountDialog = (item: CartItem) => {
    setSelectedItemForDiscount(item);
    setCurrentDiscountType(item.itemDiscountType || 'nominal');
    setCurrentDiscountValue((item.itemDiscountValue || 0).toString());
    setIsItemDiscountDialogOpen(true);
  };

  const handleItemDiscountTypeChange = (type: 'nominal' | 'percentage') => {
    setCurrentDiscountType(type);
    setCurrentDiscountValue("");
  };

  const handleItemDiscountValueChange = (value: string) => {
    setCurrentDiscountValue(value);
  };

  const calculateDiscountedPrice = () => {
    if (!selectedItemForDiscount || !selectedItemForDiscount.originalPrice) return { discountedPrice: 0, actualDiscountAmount: 0 };
    const originalPrice = selectedItemForDiscount.originalPrice;
    const discountValueNum = parseFloat(currentDiscountValue);

    if (isNaN(discountValueNum) || discountValueNum < 0) {
      return { discountedPrice: originalPrice, actualDiscountAmount: 0 };
    }

    let actualDiscountAmount = 0;
    if (currentDiscountType === 'percentage') {
      actualDiscountAmount = originalPrice * (discountValueNum / 100);
    } else { 
      actualDiscountAmount = discountValueNum;
    }

    if (actualDiscountAmount > originalPrice) {
      actualDiscountAmount = originalPrice; 
    }
    
    const discountedPrice = originalPrice - actualDiscountAmount;
    return { discountedPrice: discountedPrice < 0 ? 0 : discountedPrice, actualDiscountAmount };
  };

  const handleConfirmItemDiscount = () => {
    if (!selectedItemForDiscount) return;
    const { discountedPrice, actualDiscountAmount } = calculateDiscountedPrice();

    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.productId === selectedItemForDiscount.productId) {
          return {
            ...item,
            price: discountedPrice,
            discountAmount: actualDiscountAmount, 
            itemDiscountType: currentDiscountType,
            itemDiscountValue: parseFloat(currentDiscountValue) || 0,
            total: discountedPrice * item.quantity,
          };
        }
        return item;
      })
    );
    setIsItemDiscountDialogOpen(false);
    setSelectedItemForDiscount(null);
    setCurrentDiscountValue("");
  };

  const handleRemoveCurrentItemDiscount = () => {
    if (!selectedItemForDiscount) return;
    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.productId === selectedItemForDiscount.productId) {
          return {
            ...item,
            price: item.originalPrice || item.price, // Revert to original price
            discountAmount: 0,
            itemDiscountType: undefined,
            itemDiscountValue: 0,
            total: (item.originalPrice || item.price) * item.quantity,
          };
        }
        return item;
      })
    );
    setIsItemDiscountDialogOpen(false);
    setSelectedItemForDiscount(null);
    setCurrentDiscountValue("");
    toast({ title: "Diskon Dihapus", description: `Diskon untuk ${selectedItemForDiscount.productName} telah dihapus.` });
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

  const totalItemDiscount = useMemo(() => cartItems.reduce((sum, item) => sum + (item.discountAmount || 0) * item.quantity, 0), [cartItems]);
  const subtotalAfterItemDiscounts = useMemo(() => cartItems.reduce((sum, item) => sum + item.total, 0), [cartItems]);
  const tax = useMemo(() => subtotalAfterItemDiscounts * taxRate, [subtotalAfterItemDiscounts, taxRate]);
  
  const shippingCost = parseFloat(shippingCostInput) || 0;
  const voucherDiscount = parseFloat(voucherDiscountInput) || 0;
  
  const totalDiscountAmount = useMemo(() => totalItemDiscount + voucherDiscount, [totalItemDiscount, voucherDiscount]);
  
  const total = useMemo(() => {
    return subtotalAfterItemDiscounts + tax + shippingCost - voucherDiscount;
  }, [subtotalAfterItemDiscounts, tax, shippingCost, voucherDiscount]);
  
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
    const amountPaidNum = parseFloat(cashAmountPaidInput);
    if (isNaN(amountPaidNum) || amountPaidNum < total) {
      toast({ title: "Pembayaran Tidak Cukup", description: "Jumlah yang dibayar kurang dari total belanja.", variant: "destructive" });
      return;
    }

    const change = amountPaidNum - total;
    setIsProcessingSale(true);

    const transactionData: Omit<PosTransaction, 'id' | 'invoiceNumber' | 'timestamp'> = {
      shiftId: activeShift.id,
      branchId: selectedBranch.id,
      userId: currentUser.uid,
      items: cartItems, 
      subtotal: subtotalAfterItemDiscounts,
      taxAmount: tax,
      shippingCost: shippingCost,
      voucherCode: voucherCodeInput || undefined,
      voucherDiscountAmount: voucherDiscount,
      totalDiscountAmount: totalDiscountAmount,
      totalAmount: total,
      totalCost: totalCost,
      paymentTerms: 'cash',
      amountPaid: amountPaidNum,
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
      setShippingCostInput("");
      setVoucherCodeInput("");
      setVoucherDiscountInput("");
      setCashAmountPaidInput("");
      setCustomerNameInputCash("");
      setCalculatedChange(null);
      fetchPOSProducts(1, 'reset');
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
      subtotal: subtotalAfterItemDiscounts,
      taxAmount: tax,
      shippingCost: shippingCost,
      voucherCode: voucherCodeInput || undefined,
      voucherDiscountAmount: voucherDiscount,
      totalDiscountAmount: totalDiscountAmount,
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
      setShippingCostInput("");
      setVoucherCodeInput("");
      setVoucherDiscountInput("");
      setSelectedBankName("");
      setBankRefNumberInput("");
      setCustomerNameInputBank("");
      fetchPOSProducts(1, 'reset');
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
      subtotal: subtotalAfterItemDiscounts,
      taxAmount: tax,
      shippingCost: shippingCost,
      voucherCode: voucherCodeInput || undefined,
      voucherDiscountAmount: voucherDiscount,
      totalDiscountAmount: totalDiscountAmount,
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
      setShippingCostInput("");
      setVoucherCodeInput("");
      setVoucherDiscountInput("");
      setSelectedCustomerId(undefined);
      setCreditDueDate(undefined);
      setCustomerSearchTerm("");
      fetchPOSProducts(1, 'reset');
    }
    setIsProcessingSale(false);
  };

  const handlePrintInvoice = async (transactionIdToPrint?: string) => {
    const targetTransactionId = transactionIdToPrint || lastTransactionId;

    if (!targetTransactionId || !selectedBranch || !currentUser || !userData) {
      toast({ title: "Data Tidak Lengkap", description: "Tidak dapat mencetak invoice, data kurang.", variant: "destructive" });
      setShowPrintInvoiceDialog(false); // Close if it was open from a new sale
      setLastTransactionId(null); // Always reset if we were relying on this state
      return;
    }

    if (userData.localPrinterUrl) {
      try {
        const transactionDetails = await getTransactionById(targetTransactionId);
        if (!transactionDetails) {
          toast({ title: "Gagal Cetak", description: "Detail transaksi tidak ditemukan.", variant: "destructive" });
          setShowPrintInvoiceDialog(false);
          setLastTransactionId(null);
          return;
        }

        const payload = {
          branchName: selectedBranch.invoiceName || selectedBranch.name,
          branchAddress: selectedBranch.address || "",
          branchPhone: selectedBranch.phoneNumber || "",
          invoiceNumber: transactionDetails.invoiceNumber,
          transactionDate: format(transactionDetails.timestamp.toDate(), "dd MMM yyyy, HH:mm"),
          cashierName: userData.name || currentUser.displayName || "Kasir",
          customerName: transactionDetails.customerName || "",
          items: transactionDetails.items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            originalPrice: item.originalPrice, 
            price: item.price, 
            discountAmount: item.discountAmount, 
            total: item.total,
          })),
          subtotal: transactionDetails.subtotal, 
          taxAmount: transactionDetails.taxAmount,
          shippingCost: transactionDetails.shippingCost || 0, 
          totalItemDiscount: transactionDetails.items.reduce((sum, item) => sum + (item.discountAmount || 0) * item.quantity, 0), 
          voucherDiscount: transactionDetails.voucherDiscountAmount || 0, 
          overallTotalDiscount: transactionDetails.totalDiscountAmount || 0, 
          totalAmount: transactionDetails.totalAmount, 
          paymentMethod: transactionDetails.paymentTerms.charAt(0).toUpperCase() + transactionDetails.paymentTerms.slice(1),
          amountPaid: transactionDetails.amountPaid,
          changeGiven: transactionDetails.changeGiven,
          notes: "", 
        };

        const response = await fetch(userData.localPrinterUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          toast({ title: "Terkirim ke Printer", description: "Data invoice berhasil dikirim ke printer lokal." });
        } else {
          const errorData = await response.text();
          toast({ title: "Gagal Kirim ke Printer", description: `Printer lokal merespons dengan kesalahan: ${response.status} - ${errorData || response.statusText}`, variant: "destructive", duration: 7000 });
          window.open(`/invoice/${targetTransactionId}/view`, '_blank');
        }
      } catch (error: any) {
        console.error("Error sending to local printer:", error);
        toast({ title: "Error Printer Lokal", description: `Tidak dapat terhubung ke printer lokal: ${error.message}. Invoice web akan dibuka.`, variant: "destructive", duration: 7000 });
        window.open(`/invoice/${targetTransactionId}/view`, '_blank');
      }
    } else {
      toast({
        title: "Printer Lokal Belum Diatur",
        description: "URL printer lokal belum diatur di Pengaturan Akun. Membuka invoice web.",
        variant: "default",
        duration: 7000
      });
      window.open(`/invoice/${targetTransactionId}/view`, '_blank');
    }

    setShowPrintInvoiceDialog(false); // Always close the confirmation dialog
    setLastTransactionId(null); // Reset for next new sale
  };
  
  const handlePrintInvoiceFromHistory = (transactionIdForReprint: string) => {
    handlePrintInvoice(transactionIdForReprint);
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

  const totalSalesShift = useMemo(() => {
    return shiftTransactions
      .filter(tx => tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [shiftTransactions]);

  const totalReturnsShift = useMemo(() => {
    return shiftTransactions
      .filter(tx => tx.status === 'returned')
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [shiftTransactions]);

  const { discountedPrice: previewDiscountedPrice, actualDiscountAmount: previewActualDiscountAmount } = calculateDiscountedPrice();


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
              <div className="col-span-1 text-center">
                 <p className="text-green-600 font-medium flex items-center justify-center text-sm">
                    <PlayCircle className="h-4 w-4 mr-1.5" /> Shift Aktif
                </p>
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
                  <>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAllShiftTransactionsDialog(true)}>
                        <HistoryIcon className="mr-1.5 h-3.5 w-3.5" /> Riwayat Shift Ini
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowShiftCashDetailsDialog(true)}>
                        <Info className="mr-1.5 h-3.5 w-3.5" /> Info Kas Shift
                    </Button>
                    <Button variant="destructive" size="sm" className="text-xs h-8" onClick={prepareEndShiftCalculations} disabled={isEndingShift}>
                        {isEndingShift ? "Memproses..." : <><StopCircle className="mr-1.5 h-3.5 w-3.5" /> Akhiri Shift</>}
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/dashboard')}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Keluar
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
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPagePOS(1); }}
                  />
                </div>
                 <Select value={itemsPerPagePOS.toString()} onValueChange={(value) => {setItemsPerPagePOS(Number(value)); setCurrentPagePOS(1);}}>
                    <SelectTrigger className="h-8 text-xs rounded-md w-auto sm:w-[120px]">
                        <SelectValue placeholder="Tampil" />
                    </SelectTrigger>
                    <SelectContent>
                        {POS_ITEMS_PER_PAGE_OPTIONS.map(option => (
                            <SelectItem key={option} value={option.toString()} className="text-xs">Tampil {option}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Button variant={viewMode === 'card' ? 'secondary' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => handleSetViewMode('card')} aria-label="Card View" disabled={!activeShift}><LayoutGrid className="h-4 w-4" /></Button>
                  <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => handleSetViewMode('table')} aria-label="Table View" disabled={!activeShift}><List className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className={cn("flex-grow overflow-y-auto p-0.5 -m-0.5 relative min-h-0", 
                                viewMode === 'card' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5" : "")}>
                {loadingProducts ? (<div className={cn(viewMode === 'card' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5" : "space-y-2")}>
                    {[...Array(itemsPerPagePOS)].map((_,i) => <Skeleton key={i} className={cn(viewMode === 'card' ? "h-48 w-full" : "h-10 w-full")} />)}
                    </div>
                ) : products.length === 0 ? (<div className="text-center py-10 text-muted-foreground text-sm">{ "Produk tidak ditemukan atau belum ada produk."}</div>
                ) : viewMode === 'card' ? (
                  products.map(product => (
                    <Card key={product.id} className={cn("overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-md cursor-pointer flex flex-col", product.quantity <= 0 && "opacity-60 cursor-not-allowed")} onClick={() => product.quantity > 0 && handleAddToCart(product)}>
                      <div className="relative w-full aspect-[4/3]">
                        <Image src={product.imageUrl || `https://placehold.co/150x100.png`} alt={product.name} layout="fill" objectFit="cover" className="rounded-t-md" data-ai-hint={product.imageHint || product.name.split(" ").slice(0,2).join(" ").toLowerCase()} onError={(e) => (e.currentTarget.src = "https://placehold.co/150x100.png")} />
                      </div>
                      <CardContent className="p-2 flex flex-col flex-grow"><h3 className="font-semibold text-xs truncate leading-snug flex-grow">{product.name}</h3><p className="text-primary font-bold text-sm mt-0.5">{currencySymbol}{product.price.toLocaleString('id-ID')}</p><p className="text-xs text-muted-foreground mb-1">Stok: {product.quantity}</p>
                        <Button size="sm" className="w-full text-xs h-7 mt-auto" disabled={!activeShift || product.quantity <= 0} onClick={(e) => { e.stopPropagation(); if (product.quantity > 0) handleAddToCart(product); }}><PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Tambah</Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="border rounded-md overflow-hidden"><Table><TableHeader><TableRow><TableHead className="w-[40px] p-1.5 hidden sm:table-cell"></TableHead><TableHead className="p-1.5 text-xs">Nama Produk</TableHead><TableHead className="p-1.5 text-xs text-right">Harga</TableHead><TableHead className="p-1.5 text-xs text-center hidden md:table-cell">Stok</TableHead><TableHead className="p-1.5 text-xs text-center">Aksi</TableHead></TableRow></TableHeader><TableBody>
                        {products.map(product => (<TableRow key={product.id} className={cn(product.quantity <= 0 && "opacity-60")}><TableCell className="p-1 hidden sm:table-cell"><Image src={product.imageUrl || `https://placehold.co/28x28.png`} alt={product.name} width={28} height={28} className="rounded object-cover h-7 w-7" data-ai-hint={product.imageHint || product.name.split(" ").slice(0,2).join(" ").toLowerCase()} onError={(e) => (e.currentTarget.src = "https://placehold.co/28x28.png")} /></TableCell><TableCell className="p-1.5 text-xs font-medium">{product.name}</TableCell><TableCell className="p-1.5 text-xs text-right">{currencySymbol}{product.price.toLocaleString('id-ID')}</TableCell><TableCell className="p-1.5 text-xs text-center hidden md:table-cell">{product.quantity}</TableCell><TableCell className="p-1.5 text-xs text-center"><Button variant="outline" size="sm" className="h-7 text-xs" disabled={!activeShift || product.quantity <= 0} onClick={() => product.quantity > 0 && handleAddToCart(product)}><PackagePlus className="mr-1 h-3 w-3" /> Tambah</Button></TableCell></TableRow>))}
                      </TableBody></Table></div>
                )}
                {!activeShift && (<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md z-10"><p className="text-sm font-medium text-muted-foreground p-4 bg-card border rounded-lg shadow-md">Mulai shift untuk mengaktifkan penjualan.</p></div>)}
              </div>
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handlePageChangePOS(currentPagePOS - 1, 'prev')} disabled={currentPagePOS <= 1 || loadingProducts}>
                    <ChevronLeft className="mr-1 h-4 w-4"/> Sebelumnya
                </Button>
                <span className="text-xs text-muted-foreground">Halaman {currentPagePOS}</span>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handlePageChangePOS(currentPagePOS + 1, 'next')} disabled={isLastPagePOS || loadingProducts}>
                    Berikutnya <ChevronRight className="ml-1 h-4 w-4"/>
                </Button>
              </div>
            </div>

            <Card className="w-2/5 m-3 ml-0 flex flex-col shadow-lg rounded-lg">
              <CardHeader className="p-3 border-b"><CardTitle className="text-base font-semibold">Penjualan Saat Ini</CardTitle></CardHeader>
              <CardContent className="flex-grow overflow-y-auto p-0"><Table><TableHeader><TableRow><TableHead className="text-xs px-2 py-1.5">Item</TableHead><TableHead className="text-center text-xs px-1 py-1.5 w-[60px]">Jml</TableHead><TableHead className="text-xs px-1 py-1.5 text-center w-[60px]">Diskon</TableHead><TableHead className="text-right text-xs px-2 py-1.5">Total</TableHead><TableHead className="text-right text-xs px-1 py-1.5 w-[30px]"> </TableHead></TableRow></TableHeader><TableBody>
                    {cartItems.map(item => (<TableRow key={item.productId}>
                        <TableCell className="font-medium text-xs py-1 px-2 truncate">
                            {item.productName}
                            {item.discountAmount && item.discountAmount > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[0.65rem] text-muted-foreground line-through">{currencySymbol}{(item.originalPrice || 0).toLocaleString('id-ID')}</span>
                                  <span className="text-[0.65rem] text-destructive">(-{currencySymbol}{(item.discountAmount).toLocaleString('id-ID')})</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="text-center text-xs py-1 px-1"><div className="flex items-center justify-center gap-0.5"><Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" disabled={!activeShift} onClick={() => handleUpdateCartQuantity(item.productId, item.quantity - 1)}><MinusCircle className="h-3.5 w-3.5" /></Button><Input type="number" value={item.quantity} onChange={(e) => handleUpdateCartQuantity(item.productId, parseInt(e.target.value) || 0)} className="h-6 w-9 text-center text-xs p-0 border-0 focus-visible:ring-0 bg-transparent" disabled={!activeShift}/><Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" disabled={!activeShift} onClick={() => handleUpdateCartQuantity(item.productId, item.quantity + 1)}><PlusCircle className="h-3.5 w-3.5" /></Button></div></TableCell>
                        <TableCell className="text-center py-1 px-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenItemDiscountDialog(item)} disabled={!activeShift}>
                                <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                                <span className="sr-only">Edit Diskon</span>
                            </Button>
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-2">{currencySymbol}{item.total.toLocaleString('id-ID')}</TableCell><TableCell className="text-right py-1 px-1"><Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive/80" disabled={!activeShift} onClick={() => handleRemoveFromCart(item.productId)}><XCircle className="h-3.5 w-3.5" /></Button></TableCell></TableRow>))}
                    {cartItems.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs"><ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />Keranjang kosong</TableCell></TableRow>)}
                  </TableBody></Table></CardContent>
              <CardFooter className="flex flex-col gap-1.5 border-t p-3">
                <div className="flex justify-between text-xs w-full"><span>Subtotal (Stlh Diskon Item):</span><span>{currencySymbol}{subtotalAfterItemDiscounts.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-xs w-full"><span>Pajak ({selectedBranch?.taxRate || (taxRate*100).toFixed(0)}%):</span><span>{currencySymbol}{tax.toLocaleString('id-ID')}</span></div>
                
                <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
                    <div>
                        <Label htmlFor="shippingCostInput" className="text-[0.7rem] text-muted-foreground">Ongkos Kirim ({currencySymbol})</Label>
                        <Input id="shippingCostInput" type="number" value={shippingCostInput} onChange={(e) => setShippingCostInput(e.target.value)} placeholder="0" className="h-8 text-xs mt-0.5"/>
                    </div>
                    <div>
                        <Label htmlFor="voucherCodeInput" className="text-[0.7rem] text-muted-foreground">Kode Voucher</Label>
                        <Input id="voucherCodeInput" type="text" value={voucherCodeInput} onChange={(e) => setVoucherCodeInput(e.target.value)} placeholder="Opsional" className="h-8 text-xs mt-0.5"/>
                    </div>
                    <div className="col-span-2">
                        <Label htmlFor="voucherDiscountInput" className="text-[0.7rem] text-muted-foreground">Diskon Voucher ({currencySymbol})</Label>
                        <Input id="voucherDiscountInput" type="number" value={voucherDiscountInput} onChange={(e) => setVoucherDiscountInput(e.target.value)} placeholder="0" className="h-8 text-xs mt-0.5"/>
                    </div>
                </div>

                {totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-xs w-full text-destructive pt-1">
                        <span>Total Diskon Keseluruhan:</span>
                        <span>-{currencySymbol}{totalDiscountAmount.toLocaleString('id-ID')}</span>
                    </div>
                )}

                <div className="flex justify-between text-base font-bold w-full mt-1.5 pt-1.5 border-t"><span>Total:</span><span>{currencySymbol}{total.toLocaleString('id-ID')}</span></div>

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

        {/* Item Discount Dialog */}
        <Dialog open={isItemDiscountDialogOpen} onOpenChange={(open) => {
            if (!open) {
                setSelectedItemForDiscount(null);
                setCurrentDiscountValue("");
            }
            setIsItemDiscountDialogOpen(open);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base">Diskon untuk: {selectedItemForDiscount?.productName}</DialogTitle>
                    <DialogDescription className="text-xs">
                        Harga Asli: {currencySymbol}{(selectedItemForDiscount?.originalPrice || 0).toLocaleString('id-ID')} per item
                    </DialogDescription>
                </DialogHeader>
                <div className="py-3 space-y-3">
                    <div>
                        <Label className="text-xs">Tipe Diskon</Label>
                        <RadioGroup value={currentDiscountType} onValueChange={handleItemDiscountTypeChange} className="flex gap-4 mt-1">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="nominal" id="nominal" />
                                <Label htmlFor="nominal" className="text-xs font-normal">Nominal ({currencySymbol})</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="percentage" id="percentage" />
                                <Label htmlFor="percentage" className="text-xs font-normal">Persentase (%)</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div>
                        <Label htmlFor="discountValue" className="text-xs">Nilai Diskon</Label>
                        <Input
                            id="discountValue"
                            type="number"
                            value={currentDiscountValue}
                            onChange={(e) => handleItemDiscountValueChange(e.target.value)}
                            placeholder={currentDiscountType === 'nominal' ? 'Contoh: 5000' : 'Contoh: 10'}
                            className="h-9 text-sm mt-1"
                        />
                    </div>
                    {selectedItemForDiscount && currentDiscountValue && (
                        <div className="text-xs space-y-0.5 pt-1">
                            <p>Diskon Dihitung: <span className="font-medium">{currencySymbol}{previewActualDiscountAmount.toLocaleString('id-ID')}</span></p>
                            <p>Harga Baru per Item: <span className="font-medium">{currencySymbol}{previewDiscountedPrice.toLocaleString('id-ID')}</span></p>
                        </div>
                    )}
                </div>
                <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
                    <Button 
                        type="button" 
                        variant="destructive" 
                        className="text-xs h-8 col-span-1" 
                        onClick={handleRemoveCurrentItemDiscount}
                        disabled={!selectedItemForDiscount || (selectedItemForDiscount.discountAmount || 0) === 0}
                    >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5"/> Hapus Diskon
                    </Button>
                    <div className="col-span-1 flex justify-end gap-2">
                        <Button type="button" variant="outline" className="text-xs h-8" onClick={() => setIsItemDiscountDialogOpen(false)}>Batal</Button>
                        <Button type="button" className="text-xs h-8" onClick={handleConfirmItemDiscount} disabled={!selectedItemForDiscount}>
                            Terapkan
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>


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
                <DialogFooter className="sm:justify-center"><Button type="button" variant="outline" className="text-xs h-8" onClick={() => {setShowPrintInvoiceDialog(false); setLastTransactionId(null);}}>Tutup</Button><Button onClick={() => handlePrintInvoice()} className="text-xs h-8" disabled={!lastTransactionId}><Printer className="mr-1.5 h-4 w-4" /> Cetak Invoice</Button></DialogFooter></DialogContent></Dialog>

        <ScanCustomerDialog isOpen={showScanCustomerDialog} onClose={() => setShowScanCustomerDialog(false)} onScanSuccess={handleScanCustomerSuccess} branchId={selectedBranch?.id || ""}/>

        <Dialog open={showBankHistoryDialog} onOpenChange={setShowBankHistoryDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">Riwayat Transaksi Transfer Bank (Shift Ini)</DialogTitle>
              <DialogDescription className="text-xs">
                Menampilkan semua transaksi dengan metode pembayaran transfer bank selama shift berjalan.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] py-3">
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
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="text-xs h-8">Tutup</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showShiftCashDetailsDialog} onOpenChange={setShowShiftCashDetailsDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base">Informasi Kas Shift Saat Ini</DialogTitle>
                    <DialogDescription className="text-xs">
                        Detail keuangan untuk shift yang sedang berjalan.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-3 space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded-md">
                        <span>Modal Awal Shift:</span>
                        <span className="font-semibold">{currencySymbol}{(activeShift?.initialCash || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <Separator/>
                    <div className="flex justify-between p-2">
                        <span>Total Penjualan Tunai:</span>
                        <span className="font-semibold">{currencySymbol}{totalCashSalesInShift.toLocaleString('id-ID')}</span>
                    </div>
                     <div className="flex justify-between p-2 bg-muted/30 rounded-md">
                        <span>Estimasi Kas di Laci:</span>
                        <span className="font-semibold">{currencySymbol}{estimatedCashInDrawer.toLocaleString('id-ID')}</span>
                    </div>
                    <Separator/>
                    <div className="flex justify-between p-2">
                        <span>Total Penjualan Kartu:</span>
                        <span className="font-semibold">{currencySymbol}{totalCardSalesInShift.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                        <span>Total Penjualan Transfer:</span>
                        <div className="flex items-center gap-2">
                           <span className="font-semibold">{currencySymbol}{totalTransferSalesInShift.toLocaleString('id-ID')}</span>
                           <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => {setShowShiftCashDetailsDialog(false); setShowBankHistoryDialog(true);}} disabled={bankTransactionsInShift.length === 0}>
                                Detail
                           </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="text-xs h-8">Tutup</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={showAllShiftTransactionsDialog} onOpenChange={setShowAllShiftTransactionsDialog}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-base">Riwayat Transaksi Shift Ini</DialogTitle>
                    <DialogDescription className="text-xs">
                        Semua transaksi yang tercatat selama shift ini.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] py-3">
                     {loadingShiftTransactions ? (
                        <Skeleton className="h-40 w-full" />
                    ) : shiftTransactions.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">No. Inv</TableHead>
                                    <TableHead className="text-xs hidden sm:table-cell">Waktu</TableHead>
                                    <TableHead className="text-xs">Pelanggan</TableHead>
                                    <TableHead className="text-xs">Metode</TableHead>
                                    <TableHead className="text-xs text-right">Total</TableHead>
                                    <TableHead className="text-xs text-center">Status</TableHead>
                                    <TableHead className="text-xs text-center">Cetak</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shiftTransactions.map((tx) => (
                                <TableRow key={tx.id} className={cn(tx.status === 'returned' && "bg-muted/40")}>
                                    <TableCell className="text-xs py-1.5 font-medium">{tx.invoiceNumber}</TableCell>
                                    <TableCell className="text-xs hidden sm:table-cell py-1.5">{formatDateTimestamp(tx.timestamp)}</TableCell>
                                    <TableCell className="text-xs py-1.5">{tx.customerName || '-'}</TableCell>
                                    <TableCell className="text-xs py-1.5 capitalize">{tx.paymentTerms}</TableCell>
                                    <TableCell className="text-xs text-right py-1.5">{currencySymbol}{tx.totalAmount.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-xs text-center py-1.5">
                                        <span className={cn("px-1.5 py-0.5 rounded-full text-[0.65rem] font-medium",
                                            tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        )}>
                                            {tx.status === 'completed' ? 'Selesai' : 'Diretur'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-center py-1.5">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePrintInvoiceFromHistory(tx.id)}>
                                        <Printer className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                        <span className="sr-only">Cetak Ulang</span>
                                      </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">Belum ada transaksi pada shift ini.</p>
                    )}
                </ScrollArea>
                 <DialogFooter className="items-center pt-3 border-t">
                     <div className="text-xs text-muted-foreground mr-auto">
                        <p>Total Penjualan (Bersih): {currencySymbol}{totalSalesShift.toLocaleString('id-ID')} ({shiftTransactions.filter(tx => tx.status === 'completed').length} transaksi)</p>
                        <p>Total Retur: {currencySymbol}{totalReturnsShift.toLocaleString('id-ID')} ({shiftTransactions.filter(tx => tx.status === 'returned').length} transaksi)</p>
                    </div>
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

    

    