
"use client";

import React, { useEffect, useState, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { getShiftsForUserByBranch, type PosShift } from "@/lib/firebase/pos";
import type { PaymentMethod } from "@/lib/firebase/types";
import { Timestamp } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, FilterX, Filter } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ShiftHistoryPage() {
  const { currentUser } = useAuth();
  const { selectedBranch } = useBranch();
  const { toast } = useToast();

  const [allFetchedShifts, setAllFetchedShifts] = useState<PosShift[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<PosShift[]>([]);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfDay(new Date()));
  const [searchTerm, setSearchTerm] = useState("");

  const fetchShifts = useCallback(async () => {
    if (currentUser && selectedBranch && startDate && endDate) {
      if (endDate < startDate) {
        toast({ title: "Rentang Tanggal Tidak Valid", description: "Tanggal akhir tidak boleh sebelum tanggal mulai.", variant: "destructive" });
        setAllFetchedShifts([]);
        return;
      }
      setLoading(true);
      const fetchedShifts = await getShiftsForUserByBranch(
        currentUser.uid,
        selectedBranch.id,
        { 
          startDate: startOfDay(startDate), 
          endDate: endOfDay(endDate), 
          orderByField: "startTime", 
          orderDirection: "desc" 
        }
      );
      setAllFetchedShifts(fetchedShifts);
      if (fetchedShifts.length === 0) {
        toast({ title: "Tidak Ada Shift", description: "Tidak ada riwayat shift ditemukan untuk filter yang dipilih.", variant: "default" });
      }
      setLoading(false);
    } else {
      setAllFetchedShifts([]);
      setLoading(false);
    }
  }, [currentUser, selectedBranch, startDate, endDate, toast]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    let currentShifts = [...allFetchedShifts];
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentShifts = currentShifts.filter(shift => {
        const startTimeString = formatDate(shift.startTime).toLowerCase();
        const initialCashString = formatCurrency(shift.initialCash).toLowerCase();
        const actualCashString = formatCurrency(shift.actualCashAtEnd).toLowerCase();
        return (
          startTimeString.includes(lowerSearchTerm) ||
          initialCashString.includes(lowerSearchTerm) ||
          (shift.actualCashAtEnd !== undefined && actualCashString.includes(lowerSearchTerm)) ||
          (shift.id.toLowerCase().includes(lowerSearchTerm))
        );
      });
    }
    setFilteredShifts(currentShifts);
  }, [searchTerm, allFetchedShifts]);


  const handleApplyFilters = () => {
    fetchShifts();
  };

  const handleClearFilters = () => {
    setStartDate(startOfDay(new Date()));
    setEndDate(endOfDay(new Date()));
    setSearchTerm("");
    // fetchShifts will be called by useEffect due to startDate/endDate change
  };

  const formatDateDisplay = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return format(timestamp.toDate(), "dd MMM yy, HH:mm");
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "N/A";
    return `${selectedBranch?.currency || 'Rp'}${amount.toLocaleString('id-ID')}`;
  };

  const paymentMethods: PaymentMethod[] = ['cash', 'card', 'transfer'];

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-4">
          <h1 className="text-xl md:text-2xl font-semibold font-headline">
            Riwayat Shift {selectedBranch ? `- ${selectedBranch.name}` : ""}
          </h1>

          <Card>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-base font-semibold">Filter Riwayat Shift</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
                    <div>
                        <Label htmlFor="startDateShift" className="text-xs">Tanggal Mulai</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-8 text-xs mt-0.5", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {startDate ? format(startDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label htmlFor="endDateShift" className="text-xs">Tanggal Akhir</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-8 text-xs mt-0.5", !endDate && "text-muted-foreground")} disabled={!startDate}>
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {endDate ? format(endDate, "dd MMM yyyy") : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={startDate ? { before: startDate } : undefined} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="lg:col-span-1">
                        <Label htmlFor="searchTermShift" className="text-xs">Cari (Waktu/Modal/Kas)</Label>
                        <Input id="searchTermShift" placeholder="Ketik untuk mencari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 text-xs mt-0.5"/>
                    </div>
                   <div className="flex gap-2 lg:col-start-4">
                        <Button onClick={handleApplyFilters} size="sm" className="h-8 text-xs flex-grow" disabled={loading || !selectedBranch}>
                            <Filter className="mr-1.5 h-3.5 w-3.5"/> Terapkan
                        </Button>
                         <Button onClick={handleClearFilters} variant="outline" size="sm" className="h-8 text-xs flex-grow" disabled={loading || !selectedBranch}>
                            <FilterX className="mr-1.5 h-3.5 w-3.5"/> Reset
                        </Button>
                    </div>
                </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">Daftar Shift</CardTitle>
                <CardDescription className="text-xs">Menampilkan riwayat shift berdasarkan filter yang dipilih.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                     <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                ) : !selectedBranch ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Pilih cabang untuk melihat riwayat shift.</p>
                ) : filteredShifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        {allFetchedShifts.length === 0 ? "Tidak ada data shift untuk filter saat ini." : "Tidak ada hasil yang cocok dengan pencarian Anda."}
                    </p>
                ) : (
                    <div className="border rounded-md overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Waktu Mulai</TableHead>
                                <TableHead className="text-xs">Waktu Selesai</TableHead>
                                <TableHead className="text-xs text-right">Modal Awal</TableHead>
                                {paymentMethods.map(method => (
                                    <TableHead key={method} className="text-xs text-right hidden md:table-cell">Total {method.charAt(0).toUpperCase() + method.slice(1)}</TableHead>
                                ))}
                                <TableHead className="text-xs text-right hidden lg:table-cell">Estimasi Kas Akhir</TableHead>
                                <TableHead className="text-xs text-right">Kas Aktual</TableHead>
                                <TableHead className="text-xs text-right">Selisih Kas</TableHead>
                                <TableHead className="text-xs text-center">Status</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredShifts.map((shift) => (
                                <TableRow key={shift.id}>
                                <TableCell className="text-xs py-2">{formatDateDisplay(shift.startTime)}</TableCell>
                                <TableCell className="text-xs py-2">{shift.endTime ? formatDateDisplay(shift.endTime) : "Aktif"}</TableCell>
                                <TableCell className="text-xs text-right py-2">{formatCurrency(shift.initialCash)}</TableCell>
                                {paymentMethods.map(method => (
                                     <TableCell key={method} className="text-xs text-right py-2 hidden md:table-cell">
                                        {formatCurrency(shift.totalSalesByPaymentMethod?.[method] || 0)}
                                     </TableCell>
                                ))}
                                <TableCell className="text-xs text-right py-2 hidden lg:table-cell">{formatCurrency(shift.expectedCashAtEnd)}</TableCell>
                                <TableCell className="text-xs text-right py-2">{formatCurrency(shift.actualCashAtEnd)}</TableCell>
                                <TableCell 
                                    className={cn("text-xs text-right py-2 font-medium",
                                        shift.cashDifference && shift.cashDifference < 0 ? "text-destructive" : 
                                        shift.cashDifference && shift.cashDifference > 0 ? "text-green-600" : ""
                                    )}>
                                    {formatCurrency(shift.cashDifference)}
                                    {shift.cashDifference !== undefined && shift.cashDifference !== 0 && (
                                       <span className="ml-1 text-[0.65rem]">({shift.cashDifference < 0 ? "Kurang" : "Lebih"})</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs text-center py-2">
                                    <span className={cn("px-1.5 py-0.5 rounded-full text-[0.7rem] font-medium",
                                    shift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    )}>
                                    {shift.status === 'active' ? 'Aktif' : 'Selesai'}
                                    </span>
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
