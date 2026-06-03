"use client";

import { useEffect, useState } from "react";

// A light/dark switch. Flips the `dark` class on <html> and remembers the
// choice in localStorage. The no-flash script in layout.tsx applies it on load.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle dark mode"
      className="grid place-items-center w-10 h-10 rounded-full bg-surface-3 hover:brightness-95 transition text-lg shrink-0"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
