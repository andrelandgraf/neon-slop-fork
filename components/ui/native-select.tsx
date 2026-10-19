import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Styled to match the neon-ui `SelectTrigger` surface, but backed by a native
// `<select>`. The console submits most of these inside plain `<form action={…}>`
// server actions, so keeping the native element preserves uncontrolled form
// serialization and mobile pickers for free.
// `size` on a native select means "visible rows"; the design-system meaning
// (control height) is the useful one here, so it shadows the DOM attribute.
type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
  wrapperClassName?: string;
};

function NativeSelect({
  className,
  wrapperClassName,
  size = "default",
  children,
  ...props
}: NativeSelectProps) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          // No vertical padding: a native <select> clips its label to the
          // content box, so `h-8` plus `py-2` would leave 14px for a 20px
          // line and shear the text. The fixed height centers it instead.
          "w-full appearance-none rounded-[3px] border border-panel-border bg-panel py-0 pr-8 pl-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-8 data-[size=sm]:h-7 dark:bg-input/30 dark:hover:bg-input/50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
