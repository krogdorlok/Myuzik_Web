import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ className, error, ...props }: InputProps) {
  return (
    <div className="w-full">
      <input
        className={cn(
          "w-full rounded-md border bg-[#141414] px-4 py-2.5",
          "text-text placeholder-muted",
          "focus:border-accent focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error",
          className,
        )}
        style={{ borderColor: error ? "var(--color-error)" : "#2a2a2a" }}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
