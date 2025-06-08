"use client";

import Link from "next/link";
import Image from "next/image"; // Assuming you might want a logo image
import { Building } from "lucide-react"; // Fallback icon

export default function SidebarHeaderBrand() {
  return (
    <div className="p-3">
      <Link href="/" className="flex items-center gap-2.5">
        {/* You can use an Image component here if you have a logo */}
        {/* <Image src="/logo-enterprise.png" alt="BranchWise Enterprise Logo" width={32} height={32} /> */}
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building className="h-5 w-5" />
        </div>
        <div>
          <span className="font-semibold text-sm text-foreground">BranchWise</span>
          <span className="text-xs text-muted-foreground block leading-tight">Enterprise</span>
        </div>
      </Link>
    </div>
  );
}
