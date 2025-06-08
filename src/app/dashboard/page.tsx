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
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">
          Dashboard {selectedBranch ? `- ${selectedBranch.name}` : ''}
        </h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,543.20</div>
              <p className="text-xs text-muted-foreground">+5.2% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+2350</div>
              <p className="text-xs text-muted-foreground">+180.1% from last month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Sales Trends</CardTitle>
              <CardDescription>Overview of sales performance over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg p-4">
              <Image src="https://placehold.co/600x300.png" alt="Sales Trend Placeholder" width={600} height={300} className="rounded-md object-cover" data-ai-hint="sales graph" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Inventory Status</CardTitle>
              <CardDescription>Quick look at stock levels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                    <div>
                        <h3 className="font-medium">Low Stock Items</h3>
                        <p className="text-sm text-muted-foreground">5 items are running low</p>
                    </div>
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                    <div>
                        <h3 className="font-medium">Total Products</h3>
                        <p className="text-sm text-muted-foreground">1,280 unique products</p>
                    </div>
                    <Package className="h-6 w-6 text-primary" />
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
