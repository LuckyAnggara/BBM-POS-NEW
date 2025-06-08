
"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, PlusCircle, MinusCircle, XCircle, CheckCircle, LayoutGrid, List, PackagePlus, X as ExitIcon, PlayCircle, StopCircle, DollarSign } from "lucide-react";
import Image from "next/image";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation"; // For exiting POS mode

const dummyProducts = [
  { id: "1", name: "Espresso Coffee Beans", price: 12.99, stock: 50, image: "https://placehold.co/100x100.png", hint: "coffee beans", sku: "SKU001" },
  { id: "2", name: "Organic Green Tea Leaves", price: 8.50, stock: 30, image: "https://placehold.co/100x100.png", hint: "tea leaves", sku: "SKU002" },
  { id: "3", name: "Artisan Sourdough Bread", price: 5.75, stock: 15, image: "https://placehold.co/100x100.png", hint: "bread loaf", sku: "SKU003" },
  { id: "4", name: "Dark Chocolate Bar (70%)", price: 4.20, stock: 75, image: "https://placehold.co/100x100.png", hint: "chocolate bar", sku: "SKU004" },
  { id: "5", name: "Freshly Squeezed Orange Juice", price: 3.50, stock: 22, image: "https://placehold.co/100x100.png", hint: "orange juice", sku: "SKU005" },
];

type ViewMode = "card" | "table";

export default function POSPage() {
  const { selectedBranch } = useBranch();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [initialCash, setInitialCash] = useState("");
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  
  // Prevent hydration mismatch for localStorage access
  const [posModeActive, setPosModeActive] = useState(false);
  useEffect(() => {
    setPosModeActive(true); // Assume POS page always tries to be in focus mode initially
  }, []);


  // Dummy cart data
  const cartItems = [
    { productId: "1", name: "Espresso Coffee Beans", quantity: 1, price: 12.99, total: 12.99 },
  ];
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = selectedBranch?.taxRate ? selectedBranch.taxRate / 100 : 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const currencySymbol = selectedBranch?.currency === "IDR" ? "Rp" : "$";

  const handleStartShift = () => {
    if (parseFloat(initialCash) >= 0) {
      setIsShiftActive(true);
      setShowStartShiftModal(false);
      // In a real app, save initialCash and shift start time to Firestore here
      console.log("Shift started with initial cash:", initialCash);
    } else {
      // Simple validation feedback, ideally use react-hook-form for better UX
      alert("Modal awal kas tidak valid.");
    }
  };

  const handleEndShiftConfirm = () => {
    setIsShiftActive(false);
    setShowEndShiftModal(false);
    setInitialCash(""); // Reset for next shift
    // In a real app, calculate final amounts, save to Firestore, and generate report
    console.log("Shift ended.");
  };

  if (!posModeActive) {
    return <div className="flex h-screen items-center justify-center">Memuat Mode POS...</div>;
  }

  return (
    <ProtectedRoute>
      <MainLayout focusMode={true}>
        <div className="flex flex-col h-screen bg-background">
          {/* POS Header */}
          <header className="flex items-center justify-between p-3 border-b bg-card shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-semibold font-headline">
                    POS {selectedBranch ? `- ${selectedBranch.name}` : ''}
                </h1>
            </div>
            {isShiftActive ? (
                <div className="flex items-center gap-3">
                    <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full flex items-center">
                        <PlayCircle className="h-3.5 w-3.5 mr-1" /> Shift Aktif
                    </span>
                    <Button variant="destructive" size="sm" className="text-xs h-8" onClick={() => setShowEndShiftModal(true)}>
                        <StopCircle className="mr-1.5 h-3.5 w-3.5" /> Akhiri Shift
                    </Button>
                </div>
            ) : (
                <Button variant="default" size="sm" className="text-xs h-8" onClick={() => setShowStartShiftModal(true)}>
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Mulai Shift
                </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/dashboard')}>
              <ExitIcon className="h-5 w-5" />
              <span className="sr-only">Keluar dari Mode POS</span>
            </Button>
          </header>

          {/* Main POS Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Products Section */}
            <div className="w-3/5 p-3 space-y-3 flex flex-col">
              <div className="flex justify-between items-center gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="search" placeholder="Cari produk atau SKU..." className="pl-8 w-full rounded-md h-8 text-xs" disabled={!isShiftActive} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={viewMode === 'card' ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setViewMode('card')}
                    aria-label="Card View"
                    disabled={!isShiftActive}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setViewMode('table')}
                    aria-label="Table View"
                    disabled={!isShiftActive}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className={cn(
                  "flex-grow overflow-y-auto p-0.5 -m-0.5",
                  viewMode === 'card' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5" : "",
                  !isShiftActive && "opacity-50 pointer-events-none"
              )}>
                {viewMode === 'card' ? (
                  dummyProducts.map(product => (
                    <Card key={product.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-md">
                      <Image 
                          src={product.image} 
                          alt={product.name} 
                          width={150} 
                          height={150} 
                          className="w-full h-24 object-cover" 
                          data-ai-hint={product.hint}
                          onError={(e) => (e.currentTarget.src = "https://placehold.co/150x150.png")}
                      />
                      <CardContent className="p-2">
                        <h3 className="font-semibold text-xs truncate leading-snug">{product.name}</h3>
                        <p className="text-primary font-bold text-sm mt-0.5">{currencySymbol}{product.price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mb-1">Stok: {product.stock}</p>
                        <Button size="sm" className="w-full text-xs h-7" disabled={!isShiftActive}>
                          <PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Tambah
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px] p-1.5 hidden sm:table-cell"></TableHead>
                          <TableHead className="p-1.5 text-xs">Nama Produk</TableHead>
                          <TableHead className="p-1.5 text-xs text-right">Harga</TableHead>
                          <TableHead className="p-1.5 text-xs text-center hidden md:table-cell">Stok</TableHead>
                          <TableHead className="p-1.5 text-xs text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dummyProducts.map(product => (
                          <TableRow key={product.id}>
                            <TableCell className="p-1 hidden sm:table-cell">
                              <Image 
                                  src={product.image} 
                                  alt={product.name} 
                                  width={28} 
                                  height={28} 
                                  className="rounded object-cover h-7 w-7" 
                                  data-ai-hint={product.hint}
                                  onError={(e) => (e.currentTarget.src = "https://placehold.co/28x28.png")}
                              />
                            </TableCell>
                            <TableCell className="p-1.5 text-xs font-medium">{product.name}</TableCell>
                            <TableCell className="p-1.5 text-xs text-right">{currencySymbol}{product.price.toFixed(2)}</TableCell>
                            <TableCell className="p-1.5 text-xs text-center hidden md:table-cell">{product.stock}</TableCell>
                            <TableCell className="p-1.5 text-xs text-center">
                              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!isShiftActive}>
                                <PackagePlus className="mr-1 h-3 w-3" /> Tambah
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {!isShiftActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                        <p className="text-sm font-medium text-muted-foreground p-4 bg-card border rounded-lg shadow-md">
                            Mulai shift untuk mengaktifkan penjualan.
                        </p>
                    </div>
                )}
              </div>
            </div>

            {/* Current Sale / Cart Panel */}
            <Card className="w-2/5 m-3 ml-0 flex flex-col shadow-lg rounded-lg">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-base font-semibold">Penjualan Saat Ini</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs px-2 py-1.5">Item</TableHead>
                      <TableHead className="text-center text-xs px-2 py-1.5 w-[80px]">Jml</TableHead>
                      <TableHead className="text-right text-xs px-2 py-1.5">Total</TableHead>
                      <TableHead className="text-right text-xs px-1 py-1.5 w-[30px]"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cartItems.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium text-xs py-1 px-2 truncate">{item.name}</TableCell>
                        <TableCell className="text-center text-xs py-1 px-2">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" disabled={!isShiftActive}><MinusCircle className="h-3.5 w-3.5" /></Button>
                            <span className="min-w-[20px] text-center">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" disabled={!isShiftActive}><PlusCircle className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-2">{currencySymbol}{item.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right py-1 px-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive/80" disabled={!isShiftActive}><XCircle className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cartItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs">
                          <PackagePlus className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                          Keranjang kosong
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex flex-col gap-1.5 border-t p-3">
                <div className="flex justify-between text-xs w-full">
                  <span>Subtotal:</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs w-full">
                  <span>Pajak ({selectedBranch?.taxRate || (taxRate*100).toFixed(0)}%):</span>
                  <span>{currencySymbol}{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold w-full mt-1">
                  <span>Total:</span>
                  <span>{currencySymbol}{total.toFixed(2)}</span>
                </div>
                {/* Payment Method Placeholders */}
                <div className="w-full mt-2 pt-2 border-t">
                    <Label className="text-xs font-medium mb-1 block">Metode Pembayaran:</Label>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs flex-1" disabled={!isShiftActive}>Tunai</Button>
                        <Button variant="outline" size="sm" className="text-xs flex-1" disabled={!isShiftActive}>Transfer</Button>
                        <Button variant="outline" size="sm" className="text-xs flex-1" disabled={!isShiftActive}>Kartu</Button>
                    </div>
                </div>
                <Button size="lg" className="w-full mt-2 h-10 text-sm" disabled={!isShiftActive || cartItems.length === 0}>
                  <CheckCircle className="mr-1.5 h-4 w-4" /> Selesaikan Penjualan
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Start Shift Modal */}
        <Dialog open={showStartShiftModal} onOpenChange={setShowStartShiftModal}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="text-base">Mulai Shift Baru</DialogTitle>
                    <DialogDescription className="text-xs">
                        Masukkan jumlah modal awal kas di laci kas.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2 space-y-2">
                    <Label htmlFor="initialCash" className="text-xs">Modal Awal Kas ({currencySymbol})</Label>
                    <Input 
                        id="initialCash" 
                        type="number" 
                        value={initialCash} 
                        onChange={(e) => setInitialCash(e.target.value)} 
                        placeholder="Contoh: 500000" 
                        className="h-9 text-sm" 
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="text-xs h-8">Batal</Button>
                    </DialogClose>
                    <Button onClick={handleStartShift} className="text-xs h-8">Mulai Shift</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* End Shift Modal/AlertDialog */}
        <AlertDialog open={showEndShiftModal} onOpenChange={setShowEndShiftModal}>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Akhiri Shift</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                        Apakah Anda yakin ingin mengakhiri shift saat ini? Pastikan semua transaksi sudah selesai.
                        <div className="mt-2 p-2 border rounded-md bg-muted/50 text-xs space-y-1">
                            <p>Modal Awal: {currencySymbol}{parseFloat(initialCash || "0").toLocaleString()}</p>
                            <p>Total Penjualan Tunai: {currencySymbol} (Placeholder)</p>
                            <p>Total Penjualan Transfer: {currencySymbol} (Placeholder)</p>
                            <p>Total Penjualan Kartu: {currencySymbol} (Placeholder)</p>
                            <p className="font-semibold">Estimasi Kas Akhir: {currencySymbol} (Placeholder)</p>
                        </div>
                         {/* Placeholder for actual cash count input later */}
                        <div className="mt-2">
                            <Label htmlFor="finalCash" className="text-xs">Kas Aktual di Laci ({currencySymbol})</Label>
                            <Input id="finalCash" type="number" placeholder="Hitung dan masukkan kas aktual" className="h-9 text-sm mt-1" />
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs h-8" onClick={() => setShowEndShiftModal(false)}>Batal</AlertDialogCancel>
                    <AlertDialogAction className="text-xs h-8 bg-destructive hover:bg-destructive/90" onClick={handleEndShiftConfirm}>
                        Ya, Akhiri Shift
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
