"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signInWithGoogle() {
    setError("");
    setLoading(true);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google, so nothing else runs.
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card p-8 w-full max-w-sm text-center">
        <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 text-background text-3xl mx-auto mb-5">
          👕
        </div>
        <h1 className="text-2xl font-bold tracking-tight">My Wardrobe</h1>
        <p className="text-muted text-sm mt-1.5 mb-6">
          Sign in to access your own private wardrobe.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="btn-ghost w-full justify-center gap-3"
        >
          {/* Google "G" logo */}
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
