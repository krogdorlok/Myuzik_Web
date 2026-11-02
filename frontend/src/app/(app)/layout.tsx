"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { getInitials } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/proxy/auth/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          router.push("/sign-in");
        }
      } catch {
        router.push("/sign-in");
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    document.cookie = "token=; path=/; httponly; secure; samesite=strict; max-age=0";
    router.push("/sign-in");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Logo size="lg" className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface font-display font-bold text-text"
            >
              {getInitials(user.name)}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                <Link
                  href="/insights"
                  className="block px-4 py-3 text-text transition-colors hover:bg-border"
                  onClick={() => setShowDropdown(false)}
                >
                  Insights
                </Link>
                <Link
                  href="/history"
                  className="block px-4 py-3 text-text transition-colors hover:bg-border"
                  onClick={() => setShowDropdown(false)}
                >
                  History
                </Link>
                <hr className="border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-error transition-colors hover:bg-border"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
