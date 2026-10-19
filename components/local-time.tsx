"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during the server render and hydration, true after; a store, so no effect is needed. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/**
 * A time whose text depends on the viewer's clock or time zone. The server
 * and the hydration pass render the same UTC text, so React keeps the server
 * HTML; the viewer's format replaces it right after.
 */
export function LocalTime({ date, format }: { date: Date; format: (date: Date) => string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={date.toISOString()}>
      {hydrated ? format(date) : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`}
    </time>
  );
}
