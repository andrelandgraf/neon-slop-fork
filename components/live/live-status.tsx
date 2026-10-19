"use client";
import { RotateCw } from "lucide-react";

/**
 * A subscription that ends in `error` stays there: Realtime reports it as
 * final. The rows on screen are still the last synced ones, so say that
 * they stopped updating and offer the reload that starts a fresh one.
 */
export function LiveStatus({ queries }: { queries: { isError: boolean }[] }) {
  if (!queries.some((q) => q.isError)) return null;
  return (
    <p role="alert" className="flex items-center gap-2 text-destructive text-xs">
      Live updates stopped.
      <button type="button" onClick={() => window.location.reload()} className="flex items-center gap-1 font-semibold underline">
        <RotateCw className="size-3" />
        Reload
      </button>
    </p>
  );
}
