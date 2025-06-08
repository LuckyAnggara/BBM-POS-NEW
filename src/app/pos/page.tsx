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

  const cartItems = [
    { productId: "1", name: "Espresso Coffee Beans", quantity: 1, price: 12.99, total: 12.99 },
  ];
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.08; 
  const total = subtotal + tax;

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row gap-4 h-full"> {/* Reduced gap */}
        <div className="lg:w-3/5 space-y-3"> {/* Reduced spacing */}
          <h1 className="text-xl md:text-2xl font-semibold font-headline"> {/* Reduced font size */}
            Point of Sale {selectedBranch ? `- ${selectedBranch.name}` : ''}
          </h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> {/* Adjusted icon */}
            <Input type="search" placeholder="Search for products..." className="pl-8 w-full rounded-md h-9 text-xs" /> {/* text-xs, h-9 */}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[calc(100vh-20rem)] overflow-y-auto p-1"> {/* Reduced gap */}
            {dummyProducts.map(product => (
              <Card key={product.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <Image src={product.image} alt={product.name} width={150} height={150} className="w-full h-28 object-cover" data-ai-hint={product.hint} /> {/* Adjusted image size */}
                <CardContent className="p-2"> {/* Reduced padding */}
                  <h3 className="font-semibold text-xs truncate">{product.name}</h3> {/* text-xs */}
                  <p className="text-primary font-bold text-sm">${product.price.toFixed(2)}</p> {/* text-sm */}
                  <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                  <Button size="sm" className="w-full mt-1.5 text-xs h-8">Add to Cart</Button> {/* text-xs, size-sm, h-8 */}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="lg:w-2/5 flex flex-col shadow-lg rounded-lg">
          <CardHeader className="p-4"> {/* Reduced padding */}
            <CardTitle className="text-lg font-semibold">Current Sale</CardTitle> {/* Reduced font size */}
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs px-2 py-1.5">Item</TableHead> {/* text-xs, reduced padding */}
                  <TableHead className="text-center text-xs px-2 py-1.5">Qty</TableHead> {/* text-xs, reduced padding */}
                  <TableHead className="text-right text-xs px-2 py-1.5">Price</TableHead> {/* text-xs, reduced padding */}
                  <TableHead className="text-right text-xs px-1 py-1.5">Actions</TableHead> {/* text-xs, reduced padding */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map(item => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium text-xs py-1.5 px-2">{item.name}</TableCell> {/* text-xs, reduced padding */}
                    <TableCell className="text-center text-xs py-1.5 px-2"> {/* text-xs, reduced padding */}
                      <div className="flex items-center justify-center gap-0.5"> {/* Reduced gap */}
                        <Button variant="ghost" size="icon" className="h-5 w-5"><MinusCircle className="h-3.5 w-3.5" /></Button> {/* Adjusted size */}
                        <span>{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5"><PlusCircle className="h-3.5 w-3.5" /></Button> {/* Adjusted size */}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs py-1.5 px-2">${item.total.toFixed(2)}</TableCell> {/* text-xs, reduced padding */}
                    <TableCell className="text-right py-1.5 px-1"> {/* Reduced padding */}
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive"><XCircle className="h-3.5 w-3.5" /></Button> {/* Adjusted size */}
                    </TableCell>
                  </TableRow>
                ))}
                {cartItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-3 text-xs">Cart is empty</TableCell> {/* text-xs */}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-col gap-1.5 border-t p-3"> {/* Reduced padding and gap */}
            <div className="flex justify-between text-xs w-full"> {/* text-xs */}
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs w-full"> {/* text-xs */}
              <span>Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold w-full mt-1"> {/* text-base */}
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <Button size="lg" className="w-full mt-2 h-10 text-sm"> {/* Adjusted size & text */}
              <CheckCircle className="mr-1.5 h-4 w-4" /> Finalize Sale {/* Adjusted icon */}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
}
