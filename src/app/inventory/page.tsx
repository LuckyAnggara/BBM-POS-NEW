"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { PlusCircle, FilePenLine, Trash2, Search } from "lucide-react";
import Image from "next/image";

const dummyInventory = [
  { id: "prod1", sku: "CB001", name: "Espresso Coffee Beans", quantity: 50, price: 12.99, category: "Coffee", image: "https://placehold.co/40x40.png", hint: "coffee beans" },
  { id: "prod2", sku: "GT001", name: "Organic Green Tea", quantity: 30, price: 8.50, category: "Tea", image: "https://placehold.co/40x40.png", hint: "tea leaves" },
  { id: "prod3", sku: "AB001", name: "Artisan Bread Loaf", quantity: 15, price: 5.75, category: "Bakery", image: "https://placehold.co/40x40.png", hint: "bread loaf" },
  { id: "prod4", sku: "PC001", name: "Premium Croissants", quantity: 25, price: 2.50, category: "Bakery", image: "https://placehold.co/40x40.png", hint: "croissants pastry" },
  { id: "prod5", sku: "MJ001", name: "Fresh Orange Juice", quantity: 40, price: 4.00, category: "Beverages", image: "https://placehold.co/40x40.png", hint: "orange juice" },
];

export default function InventoryPage() {
  const { selectedBranch } = useBranch();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold font-headline">
            Inventory {selectedBranch ? `- ${selectedBranch.name}` : ''}
          </h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search inventory..." className="pl-9 w-full sm:w-64 rounded-md" />
            </div>
            <Button className="rounded-md">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </div>
        </div>

        <div className="border rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableCaption>A list of products in your inventory for {selectedBranch?.name || 'the selected branch'}.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] hidden sm:table-cell">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyInventory.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="hidden sm:table-cell py-2">
                    <Image src={product.image} alt={product.name} width={40} height={40} className="rounded" data-ai-hint={product.hint} />
                  </TableCell>
                  <TableCell className="font-medium py-2">{product.name}</TableCell>
                  <TableCell className="hidden md:table-cell py-2">{product.sku}</TableCell>
                  <TableCell className="text-right py-2">{product.quantity}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell py-2">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <FilePenLine className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
