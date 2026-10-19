/**
 * The Console's log viewer queries, rebuilt from its bundle: it sends LogQL
 * with these labels and severity prefixes, and the public
 * `/logs/query` endpoint accepts the same LogQL.
 */

export type LogEntity = "storage" | "function" | "realtime";
export type LogLevel = "debug" | "info" | "notice" | "warning" | "error" | "fatal";

export const LOG_LEVELS: { value: LogLevel; label: string }[] = [
  { value: "debug", label: "DEBUG" },
  { value: "info", label: "INFO" },
  { value: "notice", label: "NOTICE" },
  { value: "warning", label: "WARN" },
  { value: "error", label: "ERROR" },
  { value: "fatal", label: "FATAL" },
];

export const LOG_RANGES = ["5m", "15m", "1h", "6h", "24h", "7d"] as const;
export type LogRange = (typeof LOG_RANGES)[number];

export const RANGE_MS: Record<LogRange, number> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "6h": 360 * 60_000,
  "24h": 1440 * 60_000,
  "7d": 10080 * 60_000,
};

/** `severity_text` prefixes and the level each one belongs to. */
const SEVERITY_PREFIXES: [string, LogLevel][] = [
  ["fatal", "fatal"],
  ["panic", "fatal"],
  ["crit", "fatal"],
  ["err", "error"],
  ["warn", "warning"],
  ["notice", "notice"],
  ["info", "info"],
  ["log", "info"],
  ["debug", "debug"],
  ["trace", "debug"],
];

const REALTIME_SERVICE = "neon-function/neonrealtimesocket";
const SERVICE_PREFIX: Record<Exclude<LogEntity, "realtime">, string> = {
  function: "neon-function/",
  storage: "neon-storage/",
};

export function levelOf(severityText: string | undefined): LogLevel | "unknown" {
  if (!severityText) return "unknown";
  const lower = severityText.toLowerCase();
  for (const [prefix, level] of SEVERITY_PREFIXES) {
    if (lower.startsWith(prefix)) return level;
  }
  return "unknown";
}

const escapeLabel = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface LogFilters {
  entity: LogEntity;
  /** Bucket or function name. Ignored for Realtime. */
  serviceName?: string;
  serviceNameMatch?: "exact" | "contains";
  search?: string;
  levels?: LogLevel[];
}

export function buildLogQL({
  entity,
  serviceName,
  serviceNameMatch = "contains",
  search = "",
  levels = [],
}: LogFilters): string {
  const matchers: string[] = [];
  if (entity === "realtime") {
    matchers.push(`service_name="${REALTIME_SERVICE}"`, 'scope_name=~"realtime-proxy|neon_realtime"');
  } else {
    matchers.push(`entity_type="${escapeLabel(entity)}"`);
    if (entity === "function") matchers.push(`service_name!="${REALTIME_SERVICE}"`);
    if (serviceName) {
      matchers.push(
        serviceNameMatch === "exact"
          ? `service_name="${escapeLabel(`${SERVICE_PREFIX[entity]}${serviceName}`)}"`
          : `service_name=~"(?i).*${escapeLabel(escapeRegex(serviceName))}.*"`
      );
    }
  }
  if (levels.length > 0) {
    const prefixes = SEVERITY_PREFIXES.filter(([, level]) => levels.includes(level))
      .map(([prefix]) => prefix)
      .sort();
    if (prefixes.length > 0) matchers.push(`severity_text=~"${escapeLabel(`(?i)^(${prefixes.join("|")}).*`)}"`);
  }
  const selector = `{${matchers.join(", ")}}`;
  const needle = search.trim();
  return needle ? `${selector} |~ "${escapeLabel(`(?i)${escapeRegex(needle)}`)}"` : selector;
}
