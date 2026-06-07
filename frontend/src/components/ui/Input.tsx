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
          "w-full px-4 py-2.5 bg-[#141414] border rounded-md",
          "text-text placeholder-muted",
          "focus:outline-none focus:border-accent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
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
