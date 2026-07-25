import * as React from "react";

import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  info: "border-border/60 bg-muted/40 text-foreground",
  success:
    "border-primary/30 bg-primary/8 text-foreground [&_[data-slot=callout-icon]]:text-primary",
  warning:
    "border-status-scaling/35 bg-status-scaling/10 text-foreground [&_[data-slot=callout-icon]]:text-status-scaling",
  danger:
    "border-destructive/35 bg-destructive/10 text-foreground [&_[data-slot=callout-icon]]:text-destructive",
} as const;

type CalloutTone = keyof typeof TONE_CLASSES;

// Replaces the console's hand-rolled amber/emerald alert boxes. Tones map to
// design tokens so both themes stay in step and the accents follow the brand.
function Callout({
  className,
  tone = "info",
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  tone?: CalloutTone;
  icon?: React.ReactNode;
}) {
  return (
    <div
      data-slot="callout"
      data-tone={tone}
      className={cn(
        "flex gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-5",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {icon ? (
        <span
          data-slot="callout-icon"
          className="mt-px shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export { Callout };
export type { CalloutTone };
