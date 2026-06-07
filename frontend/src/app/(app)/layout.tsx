"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { getInitials, getGreeting } from "@/lib/auth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Logo size="lg" className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/">
            <Logo />
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-border text-text font-display font-bold"
            >
              {getInitials(user.name)}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                <Link
                  href="/insights"
                  className="block px-4 py-3 text-text hover:bg-border transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  Insights
                </Link>
                <Link
                  href="/history"
                  className="block px-4 py-3 text-text hover:bg-border transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  History
                </Link>
                <hr className="border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-error hover:bg-border transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
