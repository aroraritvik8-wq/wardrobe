"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import { useItemModal } from "@/components/ItemModalProvider";

// Left-rail navigation (Facebook Marketplace style).
const NAV = [
  { href: "/", label: "Browse all", icon: "🛍️" },
  { href: "/vibe", label: "Vibe search", icon: "✨" },
  { href: "/outfits", label: "Outfits", icon: "👔" },
  { href: "/suggest", label: "What to wear", icon: "🌦️" },
  { href: "/stats", label: "Insights", icon: "📊" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/pack", label: "Packing", icon: "🧳" },
  { href: "/gaps", label: "Wardrobe gaps", icon: "🔍" },
];

const CATEGORIES = [
  { c: "top", label: "Tops", icon: "👕" },
  { c: "bottom", label: "Bottoms", icon: "👖" },
  { c: "shoes", label: "Shoes", icon: "👟" },
  { c: "outerwear", label: "Outerwear", icon: "🧥" },
  { c: "dress", label: "Dresses", icon: "👗" },
  { c: "accessory", label: "Accessories", icon: "🧢" },
];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { openAdd } = useItemModal();

  useEffect(() => {
    getBrowserSupabase()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : "/");
  }

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  // The login page gets no chrome (you're not signed in yet).
  if (path.startsWith("/login")) return <>{children}</>;

  // The sidebar contents — reused by the desktop rail and the mobile drawer.
  const close = () => setDrawerOpen(false);
  const sidebarBody = (
    <>
      <h1 className="text-2xl font-bold px-2 mb-3">Wardrobe</h1>

      <nav className="space-y-0.5">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={close}
            className={`mk-navitem ${isActive(n.href) ? "is-active" : ""}`}
          >
            <span className="mk-icon">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={() => {
          close();
          openAdd();
        }}
        className="block mt-3 w-full text-center rounded-md bg-surface-3 px-4 py-2.5 text-[15px] font-semibold hover:brightness-95 transition"
      >
        Add item
      </button>

      <hr className="my-4 border-border" />

      <h2 className="font-bold text-[17px] px-2 mb-1">Categories</h2>
      <nav className="space-y-0.5">
        {CATEGORIES.map((cat) => (
          <Link key={cat.c} href={`/?category=${cat.c}`} onClick={close} className="mk-navitem">
            <span className="mk-icon">{cat.icon}</span>
            {cat.label}
          </Link>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* ---------- Top bar ---------- */}
      <header className="sticky top-0 z-30 h-14 bg-surface border-b border-border flex items-center gap-2 px-3 sm:px-4">
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="lg:hidden grid place-items-center w-10 h-10 rounded-full hover:bg-black/5 text-xl shrink-0"
        >
          ☰
        </button>

        <Link href="/" className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-accent text-white text-xl">
          👕
        </Link>

        <form onSubmit={onSearch} className="relative max-w-[240px] w-full hidden sm:block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wardrobe"
            className="w-full rounded-full bg-surface-2 pl-9 pr-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-accent/30"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={openAdd} className="btn-primary hidden sm:inline-flex">
            <span className="text-base leading-none">+</span> Add item
          </button>
          <span className="hidden md:block text-sm text-muted max-w-[160px] truncate">{email}</span>
          <div className="grid place-items-center w-10 h-10 rounded-full bg-surface-3 font-semibold uppercase shrink-0">
            {email ? email[0] : "👤"}
          </div>
          <button onClick={signOut} className="btn-ghost px-3 py-2">
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ---------- Mobile drawer ---------- */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <aside className="absolute left-0 top-0 h-full w-[300px] max-w-[85%] bg-surface overflow-y-auto px-3 py-4 shadow-xl">
            <button
              onClick={close}
              aria-label="Close menu"
              className="absolute right-3 top-3 grid place-items-center w-9 h-9 rounded-full hover:bg-black/5 text-lg"
            >
              ✕
            </button>
            {sidebarBody}
          </aside>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* ---------- Desktop rail ---------- */}
        <aside className="hidden lg:flex flex-col w-[340px] shrink-0 bg-surface border-r border-border sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-3 py-4">
          {sidebarBody}
        </aside>

        {/* ---------- Main content ---------- */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
