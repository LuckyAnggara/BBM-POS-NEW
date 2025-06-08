"use client";

import MainLayout from "@/components/layout/main-layout";
import { useBranch } from "@/contexts/branch-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, AlertTriangle } from "lucide-react";
import Image from 'next/image';

export default function DashboardPage() {
  const { selectedBranch } = useBranch();

  return (
    <MainLayout>
      <div className="space-y-4"> {/* Reduced spacing */}
        <h1 className="text-xl md:text-2xl font-semibold font-headline"> {/* Reduced font size */}
          Dashboard {selectedBranch ? `- ${selectedBranch.name}` : ''}
        </h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Total Revenue</CardTitle> {/* Reduced font size */}
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">$45,231.89</div> {/* Reduced font size */}
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Total Expenses</CardTitle> {/* Reduced font size */}
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">$12,543.20</div> {/* Reduced font size */}
              <p className="text-xs text-muted-foreground">+5.2% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Active Sales</CardTitle> {/* Reduced font size */}
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">+2350</div> {/* Reduced font size */}
              <p className="text-xs text-muted-foreground">+180.1% from last month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Sales Trends</CardTitle> {/* Reduced font size */}
              <CardDescription className="text-xs">Overview of sales performance over time.</CardDescription> {/* Reduced font size */}
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg p-4">
              <Image src="https://placehold.co/600x300.png" alt="Sales Trend Placeholder" width={600} height={300} className="rounded-md object-cover" data-ai-hint="sales graph" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Inventory Status</CardTitle> {/* Reduced font size */}
              <CardDescription className="text-xs">Quick look at stock levels.</CardDescription> {/* Reduced font size */}
            </CardHeader>
            <CardContent className="space-y-3"> {/* Reduced spacing */}
                <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-md"> {/* Reduced padding */}
                    <div>
                        <h3 className="font-medium text-xs">Low Stock Items</h3> {/* Reduced font size */}
                        <p className="text-xs text-muted-foreground">5 items are running low</p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-destructive" /> {/* Adjusted icon size */}
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-md"> {/* Reduced padding */}
                    <div>
                        <h3 className="font-medium text-xs">Total Products</h3> {/* Reduced font size */}
                        <p className="text-xs text-muted-foreground">1,280 unique products</p>
                    </div>
                    <Package className="h-5 w-5 text-primary" /> {/* Adjusted icon size */}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
