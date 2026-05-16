import { cn } from "@/lib/utils";

/**
 * Shimmer block for use in `loading.tsx` files. Inherits the page's
 * border radius so callers don't have to spell out `rounded-…` every
 * time.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}
