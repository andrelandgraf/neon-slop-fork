"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Loader2, Play, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  runSqlScriptAction,
  type RunScriptResult,
} from "@/lib/sql-editor/actions";

const DEFAULT_SQL = `/*
In Neon, databases are stored on branches. By default, a project has one branch and one database.
You can select the branch and database to use from the drop-down menus above.

Try generating sample data and querying it by running the example statements below, or click
New Query to clear the editor.
*/
CREATE TABLE IF NOT EXISTS playing_with_neon(id SERIAL PRIMARY KEY, name TEXT NOT NULL, value REAL);
INSERT INTO playing_with_neon(name, value)
  SELECT LEFT(md5(i::TEXT), 10), random() FROM generate_series(1, 10) s(i);
SELECT * FROM playing_with_neon;`;

interface StoredQuery {
  id: string;
  sql: string;
  at: number;
  name?: string;
}

/** Reads the lists written by earlier versions of this editor, same keys. */
function readList(key: string): StoredQuery[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry: unknown): StoredQuery[] => {
    if (typeof entry !== "object" || entry === null) return [];
    if (!("id" in entry) || !("sql" in entry)) return [];
    const { id, sql } = entry;
    if (typeof id !== "string" || typeof sql !== "string") return [];
    const at =
      "ranAt" in entry && typeof entry.ranAt === "number"
        ? entry.ranAt
        : "savedAt" in entry && typeof entry.savedAt === "number"
          ? entry.savedAt
          : null;
    if (at === null) return [];
    const name = "name" in entry && typeof entry.name === "string" ? entry.name : undefined;
    return [{ id, sql, at, name }];
  });
}

function writeHistory(key: string, list: StoredQuery[]) {
  window.localStorage.setItem(
    key,
    JSON.stringify(list.map((q) => ({ id: q.id, sql: q.sql, ranAt: q.at })))
  );
}

function writeSaved(key: string, list: StoredQuery[]) {
  window.localStorage.setItem(
    key,
    JSON.stringify(
      list.map((q) => ({ id: q.id, sql: q.sql, savedAt: q.at, name: q.name ?? "Untitled" }))
    )
  );
}

export function SqlEditor({
  projectId,
  projectName,
  branchId,
  branchName,
  isDefault,
  databases,
}: {
  projectId: string;
  projectName: string;
  branchId: string;
  branchName: string;
  isDefault: boolean;
  databases: string[];
}) {
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [database, setDatabase] = useState(databases[0] ?? "");
  const [result, setResult] = useState<RunScriptResult | null>(null);
  const [activeResult, setActiveResult] = useState(0);
  const [pending, startTransition] = useTransition();
  const [list, setList] = useState<"saved" | "history">("history");
  const [saved, setSaved] = useState<StoredQuery[]>([]);
  const [history, setHistory] = useState<StoredQuery[]>([]);

  const savedKey = `neon-slop-fork:saved-queries:${projectId}:${branchId}`;
  const historyKey = `neon-slop-fork:query-history:${projectId}:${branchId}`;

  // Saved queries and history live in this browser's localStorage.
  useEffect(() => {
    setSaved(readList(savedKey));
    setHistory(readList(historyKey));
  }, [savedKey, historyKey]);

  function run(script: string) {
    startTransition(async () => {
      const res = await runSqlScriptAction(projectId, branchId, database, script);
      setResult(res);
      setActiveResult(res.ok ? res.statements.length - 1 : 0);
      const next = [
        { id: crypto.randomUUID(), sql: script, at: Date.now() },
        ...history.filter((q) => q.sql !== script),
      ].slice(0, 30);
      setHistory(next);
      writeHistory(historyKey, next);
    });
  }

  function save() {
    const firstLine = sql.trim().split("\n")[0]?.slice(0, 60) || "Untitled";
    const next = [{ id: crypto.randomUUID(), sql, at: Date.now(), name: firstLine }, ...saved].slice(0, 50);
    setSaved(next);
    writeSaved(savedKey, next);
    setList("saved");
  }

  const items = list === "saved" ? saved : history;
  const statements = result?.ok ? result.statements : [];
  const shown = statements[activeResult];

  return (
    <div className="flex h-full min-h-[640px]">
      <div className="flex w-[180px] shrink-0 flex-col border-panel-border border-r px-4 py-5">
        <h1 className="font-semibold text-2xl">SQL Editor</h1>
        <div className="mt-1 flex items-center gap-1 truncate text-xs">
          <Link href="/projects" className="text-link">
            All …
          </Link>
          <span className="truncate text-muted-foreground">/ {projectName}</span>
          {isDefault && <Badge variant="secondary">Default</Badge>}
        </div>
        <span className="sr-only">{branchName}</span>
        <Button
          variant="outline"
          size="icon-sm"
          className="mt-3"
          aria-label="New query"
          onClick={() => {
            setSql("");
            setResult(null);
          }}
        >
          <Plus className="size-4" />
        </Button>
        <div className="mt-4 grid grid-cols-2 rounded-[3px] bg-muted p-0.5 text-xs">
          {(["saved", "history"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setList(key)}
              className={cn(
                "rounded-[2px] py-1 capitalize",
                list === key && "bg-panel font-semibold shadow-sm"
              )}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
          {items.length === 0 && (
            <p className="text-muted-foreground text-xs">
              {list === "saved" ? "No saved queries yet." : "Run a query to see it here."}
            </p>
          )}
          {items.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setSql(q.sql)}
              className="block w-full text-left"
            >
              <span className="line-clamp-2 font-semibold text-xs">{q.name ?? q.sql}</span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(q.at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-panel-border border-b px-3 py-2.5">
          <span className="font-semibold text-sm">Untitled</span>
          <Button variant="outline" size="sm" onClick={save} disabled={!sql.trim()}>
            <Save className="size-3.5" />
            Save
          </Button>
          <div className="ml-3 flex items-center gap-1.5 rounded-[3px] border border-panel-border px-2 py-1 text-xs">
            Primary
            <Badge className="bg-primary/15 text-foreground">Active</Badge>
          </div>
          <NativeSelect
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            className="w-44"
            aria-label="Database"
          >
            {databases.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </NativeSelect>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              run(sql);
            }
          }}
          spellCheck={false}
          aria-label="SQL"
          className="h-[260px] w-full resize-y border-panel-border border-b bg-panel px-4 py-2 font-mono text-[12.5px] leading-5 outline-none"
        />
        <div className="flex items-center gap-2 border-panel-border border-b px-3 py-1.5 text-xs">
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Running…
            </>
          ) : result?.ok ? (
            <>
              <CheckCircle2 className="size-3.5 text-primary" />
              Connected ({statements.length} {statements.length === 1 ? "query" : "queries"})
            </>
          ) : result ? (
            <>
              <CircleAlert className="size-3.5 text-destructive" />
              Error
            </>
          ) : (
            <span className="text-muted-foreground">Ready</span>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button onClick={() => run(sql)} disabled={pending || !sql.trim()}>
            <Play className="size-3.5" />
            Run
          </Button>
          <span className="mx-1 h-5 border-panel-border border-l" />
          <Button variant="outline" onClick={() => run(`EXPLAIN ${sql.trim()}`)} disabled={pending || !sql.trim()}>
            Explain
          </Button>
          <Button
            variant="outline"
            onClick={() => run(`EXPLAIN ANALYZE ${sql.trim()}`)}
            disabled={pending || !sql.trim()}
          >
            Explain (Analyze)
          </Button>
          {result?.ok && (
            <span className="ml-auto flex gap-6 text-muted-foreground text-xs">
              <span>{result.durationMs}ms</span>
              <span>{shown?.rowCount ?? 0} rows</span>
            </span>
          )}
        </div>
        {result && !result.ok && (
          <pre className="mx-3 mb-3 whitespace-pre-wrap rounded-[3px] border border-destructive/30 bg-destructive/5 p-3 font-mono text-destructive text-xs">
            {result.error}
          </pre>
        )}
        {statements.length > 0 && (
          <div className="min-h-0 flex-1 overflow-auto border-panel-border border-t">
            <div className="flex gap-4 border-panel-border border-b px-3">
              {statements.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveResult(i)}
                  className={cn(
                    "-mb-px border-b-2 py-2 font-semibold text-xs",
                    i === activeResult ? "border-primary" : "border-transparent text-muted-foreground"
                  )}
                >
                  {i + 1}: {s.command}
                  {s.command === "SELECT" || s.command === "INSERT" ? ` ${s.rowCount}` : ""}
                </button>
              ))}
            </div>
            {shown && <ResultGrid result={shown} />}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultGrid({
  result,
}: {
  result: { columns: string[]; rows: Record<string, unknown>[]; command: string; rowCount: number };
}) {
  const columns = useMemo(() => result.columns, [result.columns]);
  if (columns.length === 0) {
    return (
      <p className="px-4 py-4 text-muted-foreground text-sm">
        {result.command} completed, {result.rowCount} rows affected.
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-table-head text-left">
        <tr>
          <th className="w-12 px-4 py-2 font-semibold">#</th>
          {columns.map((c) => (
            <th key={c} className="px-4 py-2 font-semibold">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="font-mono text-xs">
        {result.rows.map((row, i) => (
          <tr key={i} className="border-panel-border border-t">
            <td className="px-4 py-2 font-sans text-muted-foreground">{i + 1}</td>
            {columns.map((c) => (
              <td key={c} className="max-w-[320px] truncate px-4 py-2">
                {formatCell(row[c])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
