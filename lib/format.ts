export function formatBytes(bytes: number | undefined | null): string {
  if (!bytes) return "0 kB";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} kB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** "2026-10-18 17:23:57" in the viewer's zone, as the Console prints. */
export function formatDateTime(iso: string | Date | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** "Oct 6, 2026" */
export function formatDate(iso: string | Date | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCu(value: number): string {
  return value === 0.25 ? "0.25" : String(value);
}

export function formatCuRange(min: number, max: number): string {
  return min === max ? `${formatCu(min)} CU` : `${formatCu(min)} ↔ ${formatCu(max)} CU`;
}

export function formatHistoryRetention(seconds: number): string {
  if (seconds === 0) return "Off";
  const hours = seconds / 3600;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = hours / 24;
  return `${days} day${days === 1 ? "" : "s"}`;
}
