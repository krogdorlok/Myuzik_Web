"use client";
// Top bar: logo, primary tabs (scrollable on phones) and a <details>-based account menu.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { api } from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";
import type { User } from "@/types";

const LINKS = [
  { href: "/", label: "Analyze" },
  { href: "/live", label: "Live" },
  { href: "/history", label: "History" },
  { href: "/insights", label: "Insights" },
];

export function Nav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    try {
      await api.logout();
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError("Couldn't sign out. Try again.");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b-[0.5px] border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 px-4 sm:flex-nowrap sm:px-6">
        <Link href="/" aria-label="MYUZIK home" className="py-4">
          <Logo size="sm" />
        </Link>
        <nav
          aria-label="Primary"
          className="order-last -mb-px flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1"
        >
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex-1 whitespace-nowrap border-b-2 px-3 py-3 text-center text-sm transition-colors sm:flex-none sm:py-4",
                  active
                    ? "border-accent text-text"
                    : "border-transparent text-muted hover:text-text",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <details className="group relative">
          <summary
            aria-label={`Account menu for ${user.name}`}
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border-[0.5px] border-border bg-surface font-display text-xs font-bold [&::-webkit-details-marker]:hidden"
          >
            {getInitials(user.name)}
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-lg border-[0.5px] border-border bg-surface p-2">
            <p className="truncate px-3 pb-2 pt-1 text-sm">{user.name}</p>
            <p className="truncate px-3 pb-3 text-xs text-muted">{user.email}</p>
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-error hover:bg-border"
            >
              Sign out
            </button>
            {error && (
              <p role="alert" className="px-3 pt-2 text-xs text-error">
                {error}
              </p>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
