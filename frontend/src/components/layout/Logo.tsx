import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <span className={cn("font-display font-extrabold tracking-tight", sizes[size], className)}>
      MY<span className="text-accent">U</span>ZIK
    </span>
  );
}
