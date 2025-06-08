"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, PieChart } from "lucide-react";
import { format } from "date-fns";
import React from "react";
import Image from "next/image";

export default function ReportsPage() {
  const { selectedBranch } = useBranch();
  const [dateRange, setDateRange] = React.useState<Date | undefined>(undefined); // Simplified to single date for example

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">
          Financial Reports {selectedBranch ? `- ${selectedBranch.name}` : ''}
        </h1>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Select report type and filters to generate a financial report.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium mb-1">Report Type</label>
              <Select defaultValue="income_statement">
                <SelectTrigger id="reportType" className="rounded-md">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income_statement">Income Statement</SelectItem>
                  <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                  <SelectItem value="sales_summary">Sales Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="branch" className="block text-sm font-medium mb-1">Branch</label>
              <Select value={selectedBranch?.id || ""} disabled>
                <SelectTrigger id="branch" className="rounded-md">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={selectedBranch?.id || ""}>{selectedBranch?.name || "Selected Branch"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium mb-1">Date Range</label>
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal rounded-md"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange ? format(dateRange, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button className="w-full sm:w-auto self-end rounded-md">Generate Report</Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
            <CardDescription>Income Statement for {selectedBranch?.name || 'selected branch'} - May 2024</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg p-4">
            {/* Placeholder for report content */}
            <div className="text-center text-muted-foreground">
              <Image src="https://placehold.co/800x400.png" alt="Report Placeholder" width={800} height={400} className="rounded-md object-contain" data-ai-hint="financial document" />
              <p className="mt-4">Generated report will appear here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
