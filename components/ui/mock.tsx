"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface MockProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
  inline?: boolean;
}

/**
 * Wraps an element to mark it as non-functional in this demo.
 *
 * - Visually muted (opacity, dashed underline on hover via cursor)
 * - Pointer events still register on the wrapper so hover/title works
 * - Clicks are intercepted and no-op
 * - Inner interactive children are disabled
 */
export function Mock({
  children,
  className,
  label = "Mocked — not wired up in this demo",
  inline,
  ...props
}: MockProps) {
  const interceptClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <span
      aria-disabled="true"
      title={label}
      onClick={interceptClick}
      onMouseDown={interceptClick}
      className={cn(
        "relative",
        inline ? "inline-flex" : "inline-block",
        "opacity-55 grayscale-[15%] cursor-not-allowed",
        "[&_*]:pointer-events-none [&_*]:select-none",
        "[&_a]:cursor-not-allowed [&_button]:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
