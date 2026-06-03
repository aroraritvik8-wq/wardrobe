"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";

// The top bar. Hidden on the login page (you're not signed in there yet).
export default function SiteHeader() {
  const path = usePathname();
  if (path.startsWith("/login")) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold shrink-0 group">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-foreground to-foreground/80 text-background text-lg shadow-sm transition-transform group-hover:scale-105 group-hover:rotate-3">
            👕
          </span>
          <span className="hidden sm:inline tracking-tight text-[15px]">My Wardrobe</span>
        </Link>
        <Nav />
      </nav>
    </header>
  );
}
