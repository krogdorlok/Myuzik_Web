import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-display font-extrabold",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-accent text-background hover:bg-accent/90": variant === "primary",
          "border border-border bg-surface text-text hover:bg-border": variant === "secondary",
          "bg-transparent text-text hover:bg-surface": variant === "ghost",
        },
        {
          "rounded-sm px-3 py-1.5 text-sm": size === "sm",
          "rounded-md px-4 py-2 text-base": size === "md",
          "rounded-lg px-6 py-3 text-lg": size === "lg",
        },
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
