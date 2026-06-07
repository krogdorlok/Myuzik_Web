import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
