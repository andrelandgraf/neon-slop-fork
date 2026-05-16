import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "muted" | "success" | "warn";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    default: "bg-primary text-primary-foreground",
    outline: "border border-border text-foreground",
    muted: "bg-muted text-foreground border border-border",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border border-amber-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
