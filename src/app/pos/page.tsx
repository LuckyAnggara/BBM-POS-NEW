
"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PlusCircle, MinusCircle, XCircle, CheckCircle, LayoutGrid, List, PackagePlus } from "lucide-react";
import Image from "next/image";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { cn } from "@/lib/utils";

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
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  // Dummy cart data - will be replaced with actual state management later
  const cartItems = [
    { productId: "1", name: "Espresso Coffee Beans", quantity: 1, price: 12.99, total: 12.99 },
  ];
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = selectedBranch?.taxRate ? selectedBranch.taxRate / 100 : 0.08; // Example 8% tax or from branch
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const currencySymbol = selectedBranch?.currency === "IDR" ? "Rp" : "$"; // Basic currency handling

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          {/* Products Section */}
          <div className="lg:w-3/5 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <h1 className="text-xl md:text-2xl font-semibold font-headline">
                Point of Sale {selectedBranch ? `- ${selectedBranch.name}` : ''}
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode('card')}
                  aria-label="Card View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode('table')}
                  aria-label="Table View"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Cari produk..." className="pl-8 w-full rounded-md h-9 text-xs" />
            </div>
            
            {/* Product Display Area */}
            <div className={cn(
                "max-h-[calc(100vh-22rem)] overflow-y-auto p-0.5 -m-0.5", // Negative margin to offset padding for scrollbar
                viewMode === 'card' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" : ""
            )}>
              {viewMode === 'card' ? (
                dummyProducts.map(product => (
                  <Card key={product.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-md">
                    <Image 
                        src={product.image} 
                        alt={product.name} 
                        width={150} 
                        height={150} 
                        className="w-full h-28 object-cover" 
                        data-ai-hint={product.hint}
                        onError={(e) => (e.currentTarget.src = "https://placehold.co/150x150.png")}
                    />
                    <CardContent className="p-2.5">
                      <h3 className="font-semibold text-xs truncate leading-snug">{product.name}</h3>
                      <p className="text-primary font-bold text-sm mt-0.5">{currencySymbol}{product.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Stok: {product.stock}</p>
                      <Button size="sm" className="w-full mt-1.5 text-xs h-7">
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
                        <TableHead className="w-[40px] p-2 hidden sm:table-cell"></TableHead>
                        <TableHead className="p-2 text-xs">Nama Produk</TableHead>
                        <TableHead className="p-2 text-xs text-right">Harga</TableHead>
                        <TableHead className="p-2 text-xs text-center hidden md:table-cell">Stok</TableHead>
                        <TableHead className="p-2 text-xs text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dummyProducts.map(product => (
                        <TableRow key={product.id}>
                          <TableCell className="p-1.5 hidden sm:table-cell">
                            <Image 
                                src={product.image} 
                                alt={product.name} 
                                width={32} 
                                height={32} 
                                className="rounded object-cover h-8 w-8" 
                                data-ai-hint={product.hint}
                                onError={(e) => (e.currentTarget.src = "https://placehold.co/32x32.png")}
                            />
                          </TableCell>
                          <TableCell className="p-2 text-xs font-medium">{product.name}</TableCell>
                          <TableCell className="p-2 text-xs text-right">{currencySymbol}{product.price.toFixed(2)}</TableCell>
                          <TableCell className="p-2 text-xs text-center hidden md:table-cell">{product.stock}</TableCell>
                          <TableCell className="p-2 text-xs text-center">
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Tambah
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Current Sale / Cart Panel */}
          <Card className="lg:w-2/5 flex flex-col shadow-lg rounded-lg">
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
                      <TableCell className="font-medium text-xs py-1.5 px-2 truncate">{item.name}</TableCell>
                      <TableCell className="text-center text-xs py-1.5 px-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground"><MinusCircle className="h-3.5 w-3.5" /></Button>
                          <span className="min-w-[20px] text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground"><PlusCircle className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs py-1.5 px-2">{currencySymbol}{item.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right py-1.5 px-1">
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive/80"><XCircle className="h-3.5 w-3.5" /></Button>
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
              <Button size="lg" className="w-full mt-2 h-10 text-sm">
                <CheckCircle className="mr-1.5 h-4 w-4" /> Selesaikan Penjualan
              </Button>
            </CardFooter>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

