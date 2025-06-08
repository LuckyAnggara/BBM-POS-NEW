
"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import React from "react";
import Image from "next/image";
import ProtectedRoute from "@/components/auth/ProtectedRoute"; // Import ProtectedRoute

export default function ReportsPage() {
  const { selectedBranch } = useBranch();
  const [dateRange, setDateRange] = React.useState<Date | undefined>(undefined);

  return (
    <ProtectedRoute> {/* Wrap content with ProtectedRoute */}
      <MainLayout>
        <div className="space-y-4">
          <h1 className="text-xl md:text-2xl font-semibold font-headline">
            Laporan Keuangan {selectedBranch ? `- ${selectedBranch.name}` : ''}
          </h1>

          <Card className="shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-base font-semibold">Buat Laporan</CardTitle>
              <CardDescription className="text-xs">Pilih jenis laporan dan filter untuk membuat laporan keuangan.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end p-4 pt-0">
              <div>
                <label htmlFor="reportType" className="block text-xs font-medium mb-1">Jenis Laporan</label>
                <Select defaultValue="income_statement">
                  <SelectTrigger id="reportType" className="rounded-md h-9 text-xs">
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income_statement" className="text-xs">Laporan Laba Rugi</SelectItem>
                    <SelectItem value="balance_sheet" className="text-xs">Neraca Saldo</SelectItem>
                    <SelectItem value="sales_summary" className="text-xs">Ringkasan Penjualan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="branch" className="block text-xs font-medium mb-1">Cabang</label>
                <Select value={selectedBranch?.id || ""} disabled>
                  <SelectTrigger id="branch" className="rounded-md h-9 text-xs">
                    <SelectValue placeholder="Cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={selectedBranch?.id || ""} className="text-xs">{selectedBranch?.name || "Cabang Terpilih"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="dateRange" className="block text-xs font-medium mb-1">Rentang Tanggal</label>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal rounded-md h-9 text-xs"
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {dateRange ? format(dateRange, "PPP") : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                      className="text-xs"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button size="sm" className="w-full sm:w-auto self-end rounded-md text-xs">Buat Laporan</Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-base font-semibold">Pratinjau Laporan</CardTitle>
              <CardDescription className="text-xs">Laporan Laba Rugi untuk {selectedBranch?.name || 'cabang terpilih'} - Mei 2024</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg p-4">
              <div className="text-center text-muted-foreground">
                <Image src="https://placehold.co/800x400.png" alt="Report Placeholder" width={800} height={400} className="rounded-md object-contain" data-ai-hint="financial document" />
                <p className="mt-3 text-xs">Laporan yang dibuat akan muncul di sini.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
