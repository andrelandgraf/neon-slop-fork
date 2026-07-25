import Link from "next/link";
import { runProjectSql } from "@/lib/sql";
import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/neon-ui/empty-state";
import { TableProperties, ChevronLeft, ChevronRight } from "lucide-react";
import { TablePreviewActions } from "./table-preview-actions";

export const dynamic = "force-dynamic";

interface TableRow {
  table_schema: string;
  table_name: string;
  row_estimate: number;
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

export default async function TablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    table?: string;
    schema?: string;
    branch?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { id } = await params;
  const {
    table,
    schema = "public",
    branch: branchParam,
    page: pageParam,
    pageSize: pageSizeParam,
  } = await searchParams;
  const page = positiveInt(pageParam, 1);
  const pageSize = allowedPageSize(pageSizeParam);
  const offset = (page - 1) * pageSize;

  // Resolve the active branch from the URL.
  const bRes = await neon.listProjectBranches({ projectId: id });
  const defaultBranch =
    bRes.data.branches.find((b) => b.default) ?? bRes.data.branches[0];
  const activeBranch =
    bRes.data.branches.find((b) => b.id === branchParam) ?? defaultBranch;

  let tables: TableRow[] = [];
  let listError: string | null = null;
  try {
    const result = await runProjectSql(
      id,
      `SELECT n.nspname AS table_schema,
              c.relname AS table_name,
              c.reltuples::bigint AS row_estimate
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relkind = 'r'
         AND n.nspname NOT IN ('pg_catalog','information_schema')
       ORDER BY n.nspname, c.relname;`,
      { branchId: activeBranch?.id }
    );
    tables = result.rows.flatMap((row) => {
      const schemaValue = row.table_schema;
      const tableValue = row.table_name;
      const estimateValue = row.row_estimate;
      const rowEstimate =
        typeof estimateValue === "number"
          ? estimateValue
          : typeof estimateValue === "string"
            ? Number(estimateValue)
            : Number.NaN;
      if (
        typeof schemaValue !== "string" ||
        typeof tableValue !== "string" ||
        !Number.isFinite(rowEstimate)
      ) {
        return [];
      }
      return [
        {
          table_schema: schemaValue,
          table_name: tableValue,
          row_estimate: rowEstimate,
        },
      ];
    });
  } catch (e) {
    listError = e instanceof Error ? e.message : String(e);
  }

  let preview: {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  } | null = null;
  let previewError: string | null = null;
  if (table) {
    try {
      const qSchema = quoteIdent(schema);
      const qTable = quoteIdent(table);
      preview = await runProjectSql(
        id,
        `SELECT * FROM ${qSchema}.${qTable} LIMIT ${pageSize} OFFSET ${offset};`,
        { branchId: activeBranch?.id }
      );
    } catch (e) {
      previewError = e instanceof Error ? e.message : String(e);
    }
  }

  // Helper: build a link target preserving the active branch.
  const linkFor = (s: string, t: string) => {
    const params = new URLSearchParams();
    params.set("table", t);
    params.set("schema", s);
    if (branchParam) params.set("branch", branchParam);
    params.set("pageSize", String(pageSize));
    return `?${params.toString()}`;
  };
  const pageHref = (targetPage: number, targetPageSize = pageSize) => {
    const params = new URLSearchParams();
    if (table) params.set("table", table);
    params.set("schema", schema);
    if (branchParam) params.set("branch", branchParam);
    params.set("page", String(targetPage));
    params.set("pageSize", String(targetPageSize));
    return `?${params.toString()}`;
  };

  return (
    <div className="px-8 py-6">
      <h1 className="mb-1 font-semibold text-2xl tracking-tight">Tables</h1>
      <p className="mb-4 text-muted-foreground text-sm">
        Schemas and tables on branch{" "}
        <span className="font-mono">{activeBranch?.name}</span>
        {activeBranch?.id !== defaultBranch?.id && (
          <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            (non-default)
          </span>
        )}
        .
      </p>

      <div className="grid grid-cols-[260px_1fr] gap-5">
        <Card className="p-0 overflow-hidden h-fit max-h-[600px] overflow-y-auto">
          {listError && (
            <div className="p-4 text-xs text-destructive">{listError}</div>
          )}
          {!listError && tables.length === 0 && (
            <EmptyState
              variant="bare"
              size="sm"
              icon={<TableProperties />}
              title="No user tables"
              description="Run a CREATE TABLE in the SQL Editor and it shows up here."
            />
          )}
          {Object.entries(groupBySchema(tables)).map(([s, ts]) => (
            <div key={s}>
              <div className="border-b bg-muted/30 px-3 py-1.5 font-mono font-semibold text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {s}
              </div>
              {ts.map((t) => {
                const isActive = table === t.table_name && schema === s;
                return (
                  <Link
                    key={`${s}.${t.table_name}`}
                    href={linkFor(s, t.table_name)}
                    className={`flex items-center justify-between border-b px-3 py-1.5 text-sm transition-colors last:border-b-0 ${
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <TableProperties className="size-3.5 text-muted-foreground" />
                      <span className="font-mono">{t.table_name}</span>
                    </span>
                    <span className="tabular-nums text-[10px] text-muted-foreground">
                      {t.row_estimate < 0 ? "—" : t.row_estimate.toLocaleString()}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </Card>

        <Card className="p-0 min-h-[400px] overflow-hidden">
          {!table && (
            <EmptyState
              variant="bare"
              size="lg"
              className="h-[400px]"
              title="Select a table to preview its rows"
              description="Pick a table on the left to page through its first rows."
            />
          )}
          {table && previewError && (
            <div className="p-6">
              <Badge variant="destructive">Error</Badge>
              <pre className="mt-3 text-[13px] font-mono whitespace-pre-wrap text-destructive">
                {previewError}
              </pre>
            </div>
          )}
          {table && preview && (
            <>
              <div className="px-4 py-2.5 border-b flex items-center justify-between gap-3">
                <div className="font-mono text-sm">
                  {schema}.{table}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground">
                    {preview.rowCount} {preview.rowCount === 1 ? "row" : "rows"} on
                    this page
                  </div>
                  <TablePreviewActions
                    columns={preview.columns}
                    rows={preview.rows}
                  />
                </div>
              </div>
              {preview.rows.length === 0 ? (
                <EmptyState
                  variant="bare"
                  size="md"
                  title="Table is empty"
                  description="No rows on this page yet."
                />
              ) : (
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        {preview.columns.map((c) => (
                          <th
                            key={c}
                            className="whitespace-nowrap bg-muted/30 px-3 py-2 text-left font-mono font-semibold text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                          {preview.columns.map((c) => (
                            <td
                              key={c}
                              className="px-3 py-1.5 font-mono text-[12px] align-top max-w-[260px] truncate"
                              title={cellString(row[c])}
                            >
                              {cellString(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  {PAGE_SIZES.map((size) => (
                    <Link
                      key={size}
                      href={pageHref(1, size)}
                      className={
                        size === pageSize
                          ? "rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary"
                          : "rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted"
                      }
                    >
                      {size}
                    </Link>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Page {page}</span>
                  {page > 1 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={pageHref(page - 1)} />}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </Button>
                  )}
                  {preview.rows.length === pageSize ? (
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={pageHref(page + 1)} />}
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function groupBySchema(tables: TableRow[]): Record<string, TableRow[]> {
  return tables.reduce<Record<string, TableRow[]>>((acc, t) => {
    (acc[t.table_schema] ??= []).push(t);
    return acc;
  }, {});
}

function cellString(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function allowedPageSize(value: string | undefined): 10 | 25 | 50 | 100 {
  if (value === "10") return 10;
  if (value === "25") return 25;
  if (value === "50") return 50;
  return 100;
}
