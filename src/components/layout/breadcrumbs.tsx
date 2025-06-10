"use client";

import { Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {Separator} from '@/components/ui/separator'

// Helper function to capitalize first letter
const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(segment => segment);

  return (
    <nav className="mb-4 flex items-center space-x-1.5 text-xs text-muted-foreground">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
     
      <Link href="/dashboard" className="hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        return (
          <Fragment key={segment}>
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">
                {capitalizeFirstLetter(segment.replace(/-/g, ' '))}
              </span>
            ) : (
              <Link href={href} className="hover:text-foreground">
                {capitalizeFirstLetter(segment.replace(/-/g, ' '))}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
