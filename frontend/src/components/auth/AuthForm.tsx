"use client";
// Sign-in / sign-up form: native constraint validation first, then server errors announced inline.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/layout/Logo";
import { api, ApiError } from "@/lib/api";

type Mode = "sign-in" | "sign-up";

const COPY = {
  "sign-in": {
    title: "Welcome back",
    cta: "Sign in",
    busy: "Signing in…",
    alt: "New here?",
    altHref: "/sign-up",
    altCta: "Create an account",
  },
  "sign-up": {
    title: "Create your account",
    cta: "Create account",
    busy: "Creating…",
    alt: "Have an account?",
    altHref: "/sign-in",
    altCta: "Sign in",
  },
} as const;

/** Same-origin paths only: resolving against our origin defeats "//evil", "/\\evil" and absolute URLs. */
function safeNext(next: string | null): string {
  if (!next) return "/";
  const url = new URL(next, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const [name, email, password] = ["name", "email", "password"].map((k) =>
      String(form.get(k) ?? ""),
    );
    if (mode === "sign-up" && password !== form.get("confirm"))
      return setError("Passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await (mode === "sign-in" ? api.login(email, password) : api.register(name, email, password));
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Network error. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-page-in">
        <Link href="/sign-in" className="mb-10 flex justify-center" aria-label="MYUZIK home">
          <Logo size="lg" />
        </Link>
        <h1 className="mb-8 text-center font-display text-2xl font-extrabold">{copy.title}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "sign-up" && (
            <Input label="Name" name="name" autoComplete="name" required maxLength={100} />
          )}
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={mode === "sign-up" ? 8 : undefined}
            maxLength={72}
            hint={mode === "sign-up" ? "At least 8 characters" : undefined}
          />
          {mode === "sign-up" && (
            <Input
              label="Confirm password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          )}
          <p role="alert" className="min-h-5 text-sm text-error">
            {error}
          </p>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? copy.busy : copy.cta}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {copy.alt}{" "}
          <Link
            href={copy.altHref}
            className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            {copy.altCta}
          </Link>
        </p>
      </div>
    </main>
  );
}
