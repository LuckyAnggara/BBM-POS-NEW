import type {Metadata} from 'next';
import './globals.css';
import { BranchProvider } from '@/contexts/branch-context';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'BranchWise',
  description: 'Manage your branches efficiently',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <BranchProvider>
          {children}
        </BranchProvider>
        <Toaster />
      </body>
    </html>
  );
}
