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

const dummyExpenses = [
  { id: "exp1", date: "2024-05-01", category: "Rent", amount: 1200.00, description: "Monthly office rent" },
  { id: "exp2", date: "2024-05-03", category: "Utilities", amount: 150.75, description: "Electricity and Water" },
  { id: "exp3", date: "2024-05-05", category: "Supplies", amount: 85.20, description: "Office stationery" },
  { id: "exp4", date: "2024-05-10", category: "Marketing", amount: 300.00, description: "Social media campaign" },
  { id: "exp5", date: "2024-05-15", category: "Salaries", amount: 5500.00, description: "Monthly staff salaries" },
];

export default function ExpensesPage() {
  const { selectedBranch } = useBranch();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold font-headline">
            Expenses {selectedBranch ? `- ${selectedBranch.name}` : ''}
          </h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-md">
                  <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["Rent", "Utilities", "Supplies", "Marketing", "Salaries"].map(cat => (
                  <DropdownMenuCheckboxItem key={cat}>{cat}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="rounded-md">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button className="rounded-md">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </div>
        </div>

        <div className="border rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableCaption>A list of expenses for {selectedBranch?.name || 'the selected branch'}.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="py-2">{expense.date}</TableCell>
                  <TableCell className="py-2">{expense.category}</TableCell>
                  <TableCell className="hidden sm:table-cell py-2">{expense.description}</TableCell>
                  <TableCell className="text-right font-medium py-2">${expense.amount.toFixed(2)}</TableCell>
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
