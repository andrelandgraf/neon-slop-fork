"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Minimal headless switch. Renders as a button with `role="switch"`
 * and `aria-checked`, which is exactly what assistive tech expects
 * and what Radix's Switch does — we don't pull in another Radix
 * dependency just for this. Colors match the Neon console: bright
 * green track when on, neutral grey when off.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  ...aria
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={aria["aria-label"]}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-[#00b27a] border-[#00b27a]"
          : "bg-muted border-border",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
