"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FilePlus2,
  History,
  Loader2,
  Save,
  SearchCheck,
} from "lucide-react";

type RunResult =
  | {
      ok: true;
      columns: string[];
      rows: Record<string, unknown>[];
      rowCount: number;
      durationMs: number;
    }
  | { ok: false; error: string };

interface Props {
  branchId: string;
  projectId: string;
  runAction: (sql: string) => Promise<RunResult>;
}

const DEFAULT_SQL = `-- Create a sample table and seed some rows.
-- After running, open the Tables tab to inspect it.
CREATE TABLE IF NOT EXISTS playing_with_neon (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  value      REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO playing_with_neon (name, value)
SELECT LEFT(md5(i::TEXT), 10), random()
FROM generate_series(1, 10) AS s(i);

SELECT * FROM playing_with_neon ORDER BY id;`;

type SavedQuery = {
  id: string;
  name: string;
  savedAt: number;
  sql: string;
};

type QueryHistory = {
  id: string;
  ranAt: number;
  sql: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSavedQuery(value: unknown): value is SavedQuery {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.savedAt === "number" &&
    typeof value.sql === "string"
  );
}

function isHistoryEntry(value: unknown): value is QueryHistory {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.ranAt === "number" &&
    typeof value.sql === "string"
  );
}

function readList<T>(
  key: string,
  guard: (value: unknown) => value is T
): T[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function SqlEditor({ branchId, projectId, runAction }: Props) {
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [saveName, setSaveName] = useState("");

  const savedKey = useMemo(
    () => `neon-slop-fork:saved-queries:${projectId}:${branchId}`,
    [branchId, projectId]
  );
  const historyKey = useMemo(
    () => `neon-slop-fork:query-history:${projectId}:${branchId}`,
    [branchId, projectId]
  );

  useEffect(() => {
    setSavedQueries(readList(savedKey, isSavedQuery));
    setHistory(readList(historyKey, isHistoryEntry));
  }, [historyKey, savedKey]);

  function onRun(query = sql) {
    setResult(null);
    startTransition(async () => {
      const res = await runAction(query);
      setResult(res);
      const next = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          ranAt: Date.now(),
          sql: query,
        },
        ...history.filter((entry) => entry.sql !== query),
      ].slice(0, 30);
      setHistory(next);
      writeList(historyKey, next);
    });
  }

  function saveQuery() {
    const name = saveName.trim() || "Untitled query";
    const next = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        savedAt: Date.now(),
        sql,
      },
      ...savedQueries,
    ].slice(0, 50);
    setSavedQueries(next);
    writeList(savedKey, next);
    setSaveName("");
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="text-xs text-muted-foreground font-mono">
            query.sql
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSql("");
                setResult(null);
              }}
              disabled={pending}
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              New Query
            </Button>
            <QueryPicker
              icon={History}
              items={history.map((entry) => ({
                id: entry.id,
                label: new Date(entry.ranAt).toLocaleString(),
                sql: entry.sql,
              }))}
              label="History"
              onSelect={setSql}
            />
            <QueryPicker
              icon={Save}
              items={savedQueries.map((entry) => ({
                id: entry.id,
                label: entry.name,
                sql: entry.sql,
              }))}
              label="Saved"
              onSelect={setSql}
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" disabled={pending}>
                  <Save className="h-3.5 w-3.5" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save query locally</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Saved queries are stored in this browser for the selected
                  project and branch. The public Neon API does not expose the
                  Console’s server-side saved-query store.
                </p>
                <Input
                  value={saveName}
                  onChange={(event) => setSaveName(event.target.value)}
                  placeholder="e.g. Find active users"
                  autoFocus
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={saveQuery}>Save query</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRun(`EXPLAIN ${sql}`)}
              disabled={pending || !sql.trim()}
              title="Run EXPLAIN for the current query"
            >
              <SearchCheck className="h-3.5 w-3.5" />
              Explain
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRun(`EXPLAIN ANALYZE ${sql}`)}
              disabled={pending || !sql.trim()}
              title="EXPLAIN ANALYZE executes the current query"
            >
              Analyze
            </Button>
            <Button
              size="sm"
              onClick={() => onRun()}
              disabled={pending || !sql.trim()}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run
            </Button>
          </div>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onRun();
            }
          }}
          spellCheck={false}
          rows={10}
          className="w-full p-4 font-mono text-[13px] leading-relaxed bg-background outline-none resize-y min-h-[180px]"
        />
        <div className="px-3 py-1.5 border-t bg-muted/20 text-[11px] text-muted-foreground">
          ⌘+Enter to run
        </div>
      </Card>

      {result && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <div className="flex items-center gap-2 text-sm">
              {result.ok ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{result.rowCount} rows</span>
                  <span className="text-muted-foreground">
                    in {result.durationMs} ms
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">Query failed</span>
                </>
              )}
            </div>
          </div>

          {result.ok ? (
            result.rows.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No rows returned.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      {result.columns.map((c) => (
                        <th
                          key={c}
                          className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                        {result.columns.map((c) => (
                          <td
                            key={c}
                            className="px-3 py-1.5 font-mono text-[12px] align-top max-w-[280px] truncate"
                            title={formatCell(row[c])}
                          >
                            {formatCell(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <pre className="p-4 text-[13px] font-mono whitespace-pre-wrap text-destructive">
              {result.error}
            </pre>
          )}
        </Card>
      )}
    </div>
  );
}

function QueryPicker({
  icon: Icon,
  items,
  label,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  items: { id: string; label: string; sql: string }[];
  label: string;
  onSelect: (sql: string) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {label.toLowerCase()} queries for this branch yet.
          </p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <DialogClose asChild key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.sql)}
                  className="w-full rounded-md border p-3 text-left hover:bg-muted"
                >
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                    {item.sql}
                  </div>
                </button>
              </DialogClose>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
