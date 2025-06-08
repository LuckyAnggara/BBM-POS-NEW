"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react"; // Removed unused icons
import { format } from "date-fns";
import React from "react";
import Image from "next/image";

export default function ReportsPage() {
  const { selectedBranch } = useBranch();
  const [dateRange, setDateRange] = React.useState<Date | undefined>(undefined);

  return (
    <MainLayout>
      <div className="space-y-4"> {/* Reduced spacing */}
        <h1 className="text-xl md:text-2xl font-semibold font-headline"> {/* Reduced font size */}
          Financial Reports {selectedBranch ? `- ${selectedBranch.name}` : ''}
        </h1>

        <Card className="shadow-sm">
          <CardHeader className="p-4"> {/* Reduced padding */}
            <CardTitle className="text-base font-semibold">Generate Report</CardTitle> {/* Reduced font size */}
            <CardDescription className="text-xs">Select report type and filters to generate a financial report.</CardDescription> {/* text-xs */}
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end p-4 pt-0"> {/* Reduced gap and padding */}
            <div>
              <label htmlFor="reportType" className="block text-xs font-medium mb-1">Report Type</label> {/* text-xs */}
              <Select defaultValue="income_statement">
                <SelectTrigger id="reportType" className="rounded-md h-9 text-xs"> {/* h-9, text-xs */}
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income_statement" className="text-xs">Income Statement</SelectItem> {/* text-xs */}
                  <SelectItem value="balance_sheet" className="text-xs">Balance Sheet</SelectItem> {/* text-xs */}
                  <SelectItem value="sales_summary" className="text-xs">Sales Summary</SelectItem> {/* text-xs */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="branch" className="block text-xs font-medium mb-1">Branch</label> {/* text-xs */}
              <Select value={selectedBranch?.id || ""} disabled>
                <SelectTrigger id="branch" className="rounded-md h-9 text-xs"> {/* h-9, text-xs */}
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={selectedBranch?.id || ""} className="text-xs">{selectedBranch?.name || "Selected Branch"}</SelectItem> {/* text-xs */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="dateRange" className="block text-xs font-medium mb-1">Date Range</label> {/* text-xs */}
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal rounded-md h-9 text-xs" /* h-9, text-xs */
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" /> {/* Adjusted icon */}
                    {dateRange ? format(dateRange, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                    className="text-xs" // Apply text-xs to calendar
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button size="sm" className="w-full sm:w-auto self-end rounded-md text-xs">Generate Report</Button> {/* text-xs, size-sm */}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4"> {/* Reduced padding */}
            <CardTitle className="text-base font-semibold">Report Preview</CardTitle> {/* Reduced font size */}
            <CardDescription className="text-xs">Income Statement for {selectedBranch?.name || 'selected branch'} - May 2024</CardDescription> {/* text-xs */}
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg p-4">
            <div className="text-center text-muted-foreground">
              <Image src="https://placehold.co/800x400.png" alt="Report Placeholder" width={800} height={400} className="rounded-md object-contain" data-ai-hint="financial document" />
              <p className="mt-3 text-xs">Generated report will appear here.</p> {/* text-xs */}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
