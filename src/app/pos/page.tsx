"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PlusCircle, MinusCircle, XCircle, CheckCircle } from "lucide-react";
import Image from "next/image";

const dummyProducts = [
  { id: "1", name: "Espresso Coffee Beans", price: 12.99, stock: 50, image: "https://placehold.co/100x100.png", hint: "coffee beans" },
  { id: "2", name: "Organic Green Tea", price: 8.50, stock: 30, image: "https://placehold.co/100x100.png", hint: "tea leaves" },
  { id: "3", name: "Artisan Bread Loaf", price: 5.75, stock: 15, image: "https://placehold.co/100x100.png", hint: "bread loaf" },
];

export default function POSPage() {
  const { selectedBranch } = useBranch();

  // Dummy cart state
  const cartItems = [
    { productId: "1", name: "Espresso Coffee Beans", quantity: 1, price: 12.99, total: 12.99 },
  ];
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Product Selection Area */}
        <div className="lg:w-3/5 space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold font-headline">
            Point of Sale {selectedBranch ? `- ${selectedBranch.name}` : ''}
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="search" placeholder="Search for products..." className="pl-10 w-full rounded-md" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[calc(100vh-20rem)] overflow-y-auto p-1">
            {dummyProducts.map(product => (
              <Card key={product.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <Image src={product.image} alt={product.name} width={200} height={200} className="w-full h-32 object-cover" data-ai-hint={product.hint} />
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                  <p className="text-primary font-bold text-md">${product.price.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                  <Button size="sm" className="w-full mt-2 text-xs">Add to Cart</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart Area */}
        <Card className="lg:w-2/5 flex flex-col shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Current Sale</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-center text-xs">Qty</TableHead>
                  <TableHead className="text-right text-xs">Price</TableHead>
                  <TableHead className="text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map(item => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium text-sm py-2">{item.name}</TableCell>
                    <TableCell className="text-center text-sm py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6"><MinusCircle className="h-4 w-4" /></Button>
                        <span>{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><PlusCircle className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm py-2">${item.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right py-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><XCircle className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {cartItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">Cart is empty</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-t p-4">
            <div className="flex justify-between text-sm w-full">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm w-full">
              <span>Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold w-full mt-1">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <Button size="lg" className="w-full mt-3">
              <CheckCircle className="mr-2 h-5 w-5" /> Finalize Sale
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
}
