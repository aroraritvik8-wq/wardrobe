import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Wardrobe",
  description: "Catalogue your clothes and build outfits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* The top bar shows on every page so you can always navigate. */}
        <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="text-xl">👕</span>
              <span>My Wardrobe</span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2 text-sm ml-auto">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg hover:bg-foreground/[0.05] transition"
              >
                Wardrobe
              </Link>
              <Link
                href="/outfits"
                className="px-3 py-1.5 rounded-lg hover:bg-foreground/[0.05] transition"
              >
                Outfits
              </Link>
              <Link href="/add" className="btn-primary">
                <span className="text-base leading-none">+</span> Add item
              </Link>
            </div>
          </nav>
        </header>

        <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">
          {children}
        </main>

        <footer className="border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-4 text-xs text-muted">
            Your personal digital wardrobe.
          </div>
        </footer>
      </body>
    </html>
  );
}
