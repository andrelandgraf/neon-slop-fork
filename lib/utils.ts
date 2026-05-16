import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/**
 * Like `relativeTime` but expresses a future timestamp as "in 5m" /
 * "in 2h" / "in 3d". Returns "expired" for timestamps in the past so
 * the auto-delete badge stays accurate even after the deadline (the
 * Neon background job can lag by a few minutes).
 */
export function relativeFuture(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = then - now;
  if (diff <= 0) return "expired";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `in ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `in ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `in ${hr}h`;
  const day = Math.floor(hr / 24);
  return `in ${day}d`;
}
