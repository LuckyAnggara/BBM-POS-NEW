
"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { PlusCircle, FilePenLine, Trash2, Search } from "lucide-react";
import Image from "next/image";
import ProtectedRoute from "@/components/auth/ProtectedRoute"; // Import ProtectedRoute

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
    <ProtectedRoute> {/* Wrap content with ProtectedRoute */}
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Inventaris {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="search" placeholder="Cari inventaris..." className="pl-8 w-full sm:w-56 rounded-md h-9 text-xs" />
              </div>
              <Button size="sm" className="rounded-md text-xs">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Produk
              </Button>
            </div>
          </div>

          <div className="border rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableCaption className="text-xs">Daftar produk dalam inventaris Anda untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] hidden sm:table-cell text-xs px-2">Gambar</TableHead>
                  <TableHead className="text-xs px-2">Nama</TableHead>
                  <TableHead className="hidden md:table-cell text-xs px-2">SKU</TableHead>
                  <TableHead className="text-right text-xs px-2">Jumlah</TableHead>
                  <TableHead className="text-right hidden sm:table-cell text-xs px-2">Harga</TableHead>
                  <TableHead className="text-right text-xs px-2">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dummyInventory.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell py-1.5 px-2">
                      <Image src={product.image} alt={product.name} width={32} height={32} className="rounded" data-ai-hint={product.hint} />
                    </TableCell>
                    <TableCell className="font-medium py-1.5 px-2 text-xs">{product.name}</TableCell>
                    <TableCell className="hidden md:table-cell py-1.5 px-2 text-xs">{product.sku}</TableCell>
                    <TableCell className="text-right py-1.5 px-2 text-xs">{product.quantity}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell py-1.5 px-2 text-xs">${product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right py-1.5 px-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <FilePenLine className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
