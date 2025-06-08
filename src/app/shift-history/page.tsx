
"use client";

import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { getShiftsForUserByBranch, type PosShift, type PaymentMethod } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ShiftHistoryPage() {
  const { currentUser, userData } = useAuth();
  const { selectedBranch } = useBranch();
  const [shifts, setShifts] = useState<PosShift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShifts = async () => {
      if (currentUser && selectedBranch) {
        setLoading(true);
        const fetchedShifts = await getShiftsForUserByBranch(
          currentUser.uid, 
          selectedBranch.id,
          { limit: 30, orderByField: "startTime", orderDirection: "desc" }
        );
        setShifts(fetchedShifts);
        setLoading(false);
      } else {
        setShifts([]);
        setLoading(false);
      }
    };

    fetchShifts();
  }, [currentUser, selectedBranch]);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp.toDate());
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
            <CardHeader>
                <CardTitle className="text-base font-semibold">Daftar Shift</CardTitle>
                <CardDescription className="text-xs">Menampilkan 30 shift terakhir Anda di cabang ini.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                     <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                ) : shifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Belum ada riwayat shift di cabang ini.</p>
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
                                <TableHead className="text-xs text-right">Estimasi Kas Akhir</TableHead>
                                <TableHead className="text-xs text-right">Kas Aktual</TableHead>
                                <TableHead className="text-xs text-right">Selisih Kas</TableHead>
                                <TableHead className="text-xs text-center">Status</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {shifts.map((shift) => (
                                <TableRow key={shift.id}>
                                <TableCell className="text-xs py-2">{formatDate(shift.startTime)}</TableCell>
                                <TableCell className="text-xs py-2">{shift.endTime ? formatDate(shift.endTime) : "Aktif"}</TableCell>
                                <TableCell className="text-xs text-right py-2">{formatCurrency(shift.initialCash)}</TableCell>
                                {paymentMethods.map(method => (
                                     <TableCell key={method} className="text-xs text-right py-2 hidden md:table-cell">
                                        {formatCurrency(shift.totalSalesByPaymentMethod?.[method] || 0)}
                                     </TableCell>
                                ))}
                                <TableCell className="text-xs text-right py-2">{formatCurrency(shift.expectedCashAtEnd)}</TableCell>
                                <TableCell className="text-xs text-right py-2">{formatCurrency(shift.actualCashAtEnd)}</TableCell>
                                <TableCell 
                                    className={cn("text-xs text-right py-2 font-medium",
                                        shift.cashDifference && shift.cashDifference < 0 ? "text-destructive" : 
                                        shift.cashDifference && shift.cashDifference > 0 ? "text-green-600" : ""
                                    )}>
                                    {formatCurrency(shift.cashDifference)}
                                    {shift.cashDifference && shift.cashDifference !== 0 && (
                                       <span className="ml-1">({shift.cashDifference < 0 ? "Kurang" : "Lebih"})</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs text-center py-2">
                                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
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

    