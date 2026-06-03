"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

// The nav links, in display order. Reorder this list to reorder the menu.
const LINKS = [
  { href: "/vibe", label: "Vibe search" },
  { href: "/outfits", label: "Outfits" },
  { href: "/suggest", label: "What to wear 🌧️" },
  { href: "/stats", label: "Stats" },
  { href: "/calendar", label: "Calendar" },
  { href: "/pack", label: "Packing" },
  { href: "/gaps", label: "Gaps" },
];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-0.5 text-sm ml-auto overflow-x-auto">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            isActive(l.href)
              ? "bg-accent/10 text-accent font-medium ring-1 ring-accent/15"
              : "text-muted hover:text-foreground hover:bg-foreground/[0.04]"
          }`}
        >
          {l.label}
        </Link>
      ))}
      <Link href="/add" className="btn-primary ml-1.5">
        <span className="text-base leading-none">+</span>
        <span className="hidden sm:inline">Add item</span>
      </Link>
      <button
        onClick={signOut}
        title="Sign out"
        className="ml-1.5 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-foreground/[0.04] transition whitespace-nowrap"
      >
        Sign out
      </button>
    </div>
  );
}
