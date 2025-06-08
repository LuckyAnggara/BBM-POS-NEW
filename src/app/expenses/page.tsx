
"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { PlusCircle, Filter, Download, FilePenLine, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProtectedRoute from "@/components/auth/ProtectedRoute"; // Import ProtectedRoute

const dummyExpenses = [
  { id: "exp1", date: "2024-05-01", category: "Sewa", amount: 1200.00, description: "Sewa kantor bulanan" },
  { id: "exp2", date: "2024-05-03", category: "Utilitas", amount: 150.75, description: "Listrik dan Air" },
  { id: "exp3", date: "2024-05-05", category: "Perlengkapan", amount: 85.20, description: "Alat tulis kantor" },
  { id: "exp4", date: "2024-05-10", category: "Pemasaran", amount: 300.00, description: "Kampanye media sosial" },
  { id: "exp5", date: "2024-05-15", category: "Gaji", amount: 5500.00, description: "Gaji staf bulanan" },
];

export default function ExpensesPage() {
  const { selectedBranch } = useBranch();

  return (
    <ProtectedRoute> {/* Wrap content with ProtectedRoute */}
      <MainLayout>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              Pengeluaran {selectedBranch ? `- ${selectedBranch.name}` : ''}
            </h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-md text-xs">
                    <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">Filter berdasarkan Kategori</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {["Sewa", "Utilitas", "Perlengkapan", "Pemasaran", "Gaji"].map(cat => (
                    <DropdownMenuCheckboxItem key={cat} className="text-xs">{cat}</DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="rounded-md text-xs">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Ekspor
              </Button>
              <Button size="sm" className="rounded-md text-xs">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Pengeluaran
              </Button>
            </div>
          </div>

          <div className="border rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableCaption className="text-xs">Daftar pengeluaran untuk {selectedBranch?.name || 'cabang terpilih'}.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tanggal</TableHead>
                  <TableHead className="text-xs">Kategori</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs">Deskripsi</TableHead>
                  <TableHead className="text-right text-xs">Jumlah</TableHead>
                  <TableHead className="text-right text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dummyExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="py-2 text-xs">{expense.date}</TableCell>
                    <TableCell className="py-2 text-xs">{expense.category}</TableCell>
                    <TableCell className="hidden sm:table-cell py-2 text-xs">{expense.description}</TableCell>
                    <TableCell className="text-right font-medium py-2 text-xs">${expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right py-2">
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
