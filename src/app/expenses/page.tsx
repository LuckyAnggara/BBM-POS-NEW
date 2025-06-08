"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Keep Input if search/filter is added later
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
      <div className="space-y-4"> {/* Reduced spacing */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3"> {/* Reduced gap */}
          <h1 className="text-xl md:text-2xl font-semibold font-headline"> {/* Reduced font size */}
            Expenses {selectedBranch ? `- ${selectedBranch.name}` : ''}
          </h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-md text-xs"> {/* text-xs, size-sm */}
                  <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["Rent", "Utilities", "Supplies", "Marketing", "Salaries"].map(cat => (
                  <DropdownMenuCheckboxItem key={cat} className="text-xs">{cat}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="rounded-md text-xs"> {/* text-xs, size-sm */}
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" className="rounded-md text-xs"> {/* text-xs, size-sm */}
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Expense
            </Button>
          </div>
        </div>

        <div className="border rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableCaption className="text-xs">A list of expenses for {selectedBranch?.name || 'the selected branch'}.</TableCaption> {/* text-xs */}
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead> {/* text-xs */}
                <TableHead className="text-xs">Category</TableHead> {/* text-xs */}
                <TableHead className="hidden sm:table-cell text-xs">Description</TableHead> {/* text-xs */}
                <TableHead className="text-right text-xs">Amount</TableHead> {/* text-xs */}
                <TableHead className="text-right text-xs">Actions</TableHead> {/* text-xs */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="py-2 text-xs">{expense.date}</TableCell> {/* text-xs */}
                  <TableCell className="py-2 text-xs">{expense.category}</TableCell> {/* text-xs */}
                  <TableCell className="hidden sm:table-cell py-2 text-xs">{expense.description}</TableCell> {/* text-xs */}
                  <TableCell className="text-right font-medium py-2 text-xs">${expense.amount.toFixed(2)}</TableCell> {/* text-xs */}
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7"> {/* Reduced size */}
                      <FilePenLine className="h-3.5 w-3.5" /> {/* Reduced icon size */}
                       <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80"> {/* Reduced size */}
                      <Trash2 className="h-3.5 w-3.5" /> {/* Reduced icon size */}
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
