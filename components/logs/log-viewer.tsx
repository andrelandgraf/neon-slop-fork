"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2, Radio, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LOG_LEVELS,
  LOG_RANGES,
  type LogEntity,
  type LogLevel,
  type LogRange,
} from "@/lib/logs/logql";
import { queryLogsAction, type LogLine, type LogsResult } from "@/lib/logs/actions";

const LIVE_INTERVAL_MS = 5000;
const BUCKETS = 48;

const LEVEL_COLOR: Record<string, string> = {
  debug: "text-muted-foreground",
  info: "text-foreground",
  notice: "text-link",
  warning: "text-amber-600",
  error: "text-destructive",
  fatal: "text-destructive font-semibold",
  unknown: "text-muted-foreground",
};

const FILTER_PLACEHOLDER: Record<LogEntity, string> = {
  storage: "Filter by bucket name",
  function: "Filter by function name",
  realtime: "",
};

function isRange(value: string | null): value is LogRange {
  return LOG_RANGES.some((r) => r === value);
}

/**
 * The Console's service log viewer. Filters live in the URL
 * (`log-levels`, `log-range`, `log-search`, `service_name`,
 * `service_name_match`) so a "View logs" link can preselect a function.
 */
export function LogViewer({
  projectId,
  branchId,
  entity,
}: {
  projectId: string;
  branchId: string;
  entity: LogEntity;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const rangeParam = params.get("log-range");
  const range: LogRange = isRange(rangeParam) ? rangeParam : "1h";
  const levels = (params.get("log-levels") ?? "")
    .split(",")
    .filter((l): l is LogLevel => LOG_LEVELS.some((x) => x.value === l));
  const search = params.get("log-search") ?? "";
  const serviceName = entity === "realtime" ? "" : (params.get("service_name") ?? "");
  const exact = params.get("service_name_match") === "exact";
  const [live, setLive] = useState(false);
  const [result, setResult] = useState<LogsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search);
  const [serviceDraft, setServiceDraft] = useState(serviceName);

  function setParam(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`?${next}`, { scroll: false });
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await queryLogsAction(
      projectId,
      branchId,
      {
        entity,
        serviceName: serviceName || undefined,
        serviceNameMatch: exact ? "exact" : "contains",
        search,
        levels,
      },
      range
    );
    setResult(res);
    setLoading(false);
    // `levels` is derived from the URL each render; its string form is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, branchId, entity, serviceName, exact, search, levels.join(","), range]);

  // The log store is an external system: refetch when filters change and
  // every few seconds while "Go live" is on.
  useEffect(() => {
    void load();
    if (!live) return;
    const timer = window.setInterval(() => void load(), LIVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load, live]);

  const lines: LogLine[] = result?.ok ? result.lines : [];

  function download() {
    const blob = new Blob([lines.map((l) => JSON.stringify(l)).join("\n")], {
      type: "application/x-ndjson",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}-logs-${new Date().toISOString()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-[3px] border border-panel-border">
          {LOG_LEVELS.map((l) => {
            const on = levels.includes(l.value);
            return (
              <button
                key={l.value}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setParam({
                    "log-levels": (on ? levels.filter((x) => x !== l.value) : [...levels, l.value]).join(",") || null,
                  })
                }
                className={cn(
                  "border-panel-border border-r px-2 py-1 font-mono text-[11px] last:border-r-0",
                  on && "bg-foreground text-background"
                )}
              >
                {l.label}
              </button>
            );
          })}
        </div>
        <div className="flex rounded-[3px] border border-panel-border">
          {LOG_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setParam({ "log-range": r === "1h" ? null : r })}
              className={cn(
                "border-panel-border border-r px-2 py-1 text-xs last:border-r-0",
                range === r && "bg-muted font-semibold"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Button variant={live ? "default" : "outline"} size="sm" onClick={() => setLive(!live)}>
          <Radio className="size-3.5" />
          Go live
        </Button>
        <Button variant="outline" size="sm" onClick={download} disabled={lines.length === 0}>
          <Download className="size-3.5" />
          Download
        </Button>
        {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex gap-2">
        {entity !== "realtime" && (
          <form
            className="flex h-8 w-[280px] items-center gap-2 rounded-[3px] border border-panel-border px-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ service_name: serviceDraft.trim() || null });
            }}
          >
            <Tag className="size-3.5 text-muted-foreground" />
            <input
              value={serviceDraft}
              onChange={(e) => setServiceDraft(e.target.value)}
              onBlur={() => setParam({ service_name: serviceDraft.trim() || null })}
              placeholder={FILTER_PLACEHOLDER[entity]}
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              aria-pressed={exact}
              title={
                exact
                  ? "Exact match — click to match any name containing this text"
                  : "Contains match — click to match this exact name only"
              }
              onClick={() => setParam({ service_name_match: exact ? null : "exact" })}
              className="font-mono text-muted-foreground text-xs"
            >
              {exact ? "=" : "~"}
            </button>
          </form>
        )}
        <form
          className="flex h-8 flex-1 items-center gap-2 rounded-[3px] border border-panel-border px-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ "log-search": searchDraft.trim() || null });
          }}
        >
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onBlur={() => setParam({ "log-search": searchDraft.trim() || null })}
            placeholder="Search in message body"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </form>
      </div>
      {result && !result.ok && (
        <p className="rounded-[3px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm">
          {result.error}
        </p>
      )}
      {result?.ok && <Histogram lines={lines} start={result.start} end={result.end} />}
      <div className="rounded-[3px] border border-panel-border">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <div className="font-semibold">No logs in this time range</div>
            <p className="text-muted-foreground text-sm">
              Widen the time range, or check back once the {entity === "storage" ? "bucket is used" : "function has run"}{" "}
              — new logs stream in as it&apos;s invoked.
            </p>
            {range !== "7d" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ "log-range": LOG_RANGES[LOG_RANGES.indexOf(range) + 1] ?? "7d" })}
              >
                Widen time range
              </Button>
            )}
          </div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto font-mono text-xs">
            {lines.map((l, i) => (
              <div key={`${l.timestamp}-${i}`} className="flex gap-3 border-panel-border border-b px-3 py-1 last:border-0">
                <span className="shrink-0 text-muted-foreground">
                  {new Date(l.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                </span>
                <span className={cn("w-14 shrink-0 uppercase", LEVEL_COLOR[l.level])}>{l.level}</span>
                <span className="w-40 shrink-0 truncate text-muted-foreground">{l.service}</span>
                <span className="whitespace-pre-wrap break-all">{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-muted-foreground text-xs">
        {lines.length} lines{result?.ok && result.truncated ? " (latest 1,000 shown)" : ""}
      </div>
    </div>
  );
}

function Histogram({ lines, start, end }: { lines: LogLine[]; start: string; end: string }) {
  const from = new Date(start).getTime();
  const span = Math.max(new Date(end).getTime() - from, 1);
  const counts = new Array<number>(BUCKETS).fill(0);
  for (const l of lines) {
    const i = Math.min(BUCKETS - 1, Math.max(0, Math.floor(((new Date(l.timestamp).getTime() - from) / span) * BUCKETS)));
    counts[i] += 1;
  }
  const max = Math.max(...counts, 1);
  return (
    <div className="flex h-12 items-end gap-px rounded-[3px] border border-panel-border px-2 py-1" aria-hidden>
      {counts.map((c, i) => (
        <div key={i} className="flex-1 rounded-sm bg-primary/60" style={{ height: `${(c / max) * 100}%`, minHeight: c ? 2 : 0 }} />
      ))}
    </div>
  );
}

