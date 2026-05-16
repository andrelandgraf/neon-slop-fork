"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

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

export function SqlEditor({ runAction }: Props) {
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onRun() {
    setResult(null);
    startTransition(async () => {
      const res = await runAction(sql);
      setResult(res);
    });
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="text-xs text-muted-foreground font-mono">
            query.sql
          </div>
          <Button
            size="sm"
            onClick={onRun}
            disabled={pending}
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

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
