import Link from "next/link";
import { runProjectSql } from "@/lib/sql";
import { loadBranch } from "@/lib/project-context";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/neon-ui/empty-state";
import { TableProperties } from "lucide-react";
import { setUpTableLive } from "@/lib/tables/live";
import { loadTablePreview, type TablePreview as Preview } from "@/lib/tables/preview";
import type { PageSize } from "@/lib/tables/preview-sql";
import { TablePreview } from "./table-preview";

export const dynamic = "force-dynamic";

interface TableRow {
  table_schema: string;
  table_name: string;
  row_estimate: number;
}

export default async function TablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; branchId: string }>;
  searchParams: Promise<{
    table?: string;
    schema?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { id, branchId } = await params;
  const {
    table,
    schema = "public",
    page: pageParam,
    pageSize: pageSizeParam,
  } = await searchParams;
  const page = positiveInt(pageParam, 1);
  const pageSize = allowedPageSize(pageSizeParam);

  const { tenant, project, branch: activeBranch, defaultBranch } = await loadBranch(id, branchId);

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
      { branchId: activeBranch.id }
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

  let preview: Preview | null = null;
  let previewError: string | null = null;
  if (table) {
    try {
      preview = await loadTablePreview(id, activeBranch.id, { schema, table, page, pageSize });
    } catch (e) {
      previewError = e instanceof Error ? e.message : String(e);
    }
  }
  const live = preview ? await setUpTableLive(id, defaultBranch.id, activeBranch.id, preview) : null;

  // Helper: build a link target preserving the active branch.
  const linkFor = (s: string, t: string) => {
    const params = new URLSearchParams();
    params.set("table", t);
    params.set("schema", s);
    params.set("pageSize", String(pageSize));
    return `?${params.toString()}`;
  };
  return (
    <PageBody>
      <PageHeader title="Tables" project={project} branch={activeBranch} />

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
                        ? "bg-nav-active font-semibold"
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
          {table && preview && live && (
            <TablePreview
              renewal={{
                userId: tenant.session.user.id,
                orgId: tenant.activeOrg.id,
                projectId: id,
                branchId: activeBranch.id,
                databaseName: preview.databaseName,
                schema,
                table,
                page,
                pageSize,
              }}
              columns={preview.columns}
              rows={preview.rows}
              primaryKey={preview.primaryKey}
              live={live}
              realtimeHref={`/projects/${id}/branches/${activeBranch.id}/realtime`}
            />
          )}
        </Card>
      </div>
    </PageBody>
  );
}

function groupBySchema(tables: TableRow[]): Record<string, TableRow[]> {
  return tables.reduce<Record<string, TableRow[]>>((acc, t) => {
    (acc[t.table_schema] ??= []).push(t);
    return acc;
  }, {});
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function allowedPageSize(value: string | undefined): PageSize {
  if (value === "10") return 10;
  if (value === "25") return 25;
  if (value === "50") return 50;
  return 100;
}
