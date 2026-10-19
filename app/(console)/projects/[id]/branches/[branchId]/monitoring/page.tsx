import Link from "next/link";
import { LineChart } from "lucide-react";
import { LogViewer } from "@/components/logs/log-viewer";
import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities } from "@/lib/capabilities";
import { ifFound, neon, neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { runProjectSql } from "@/lib/sql";
import { formatCuRange } from "@/lib/format";
import { cn } from "@/lib/utils";

import { OperationsTable } from "./operations-live";

export const dynamic = "force-dynamic";

type Tab = "postgres" | "storage" | "functions" | "realtime";
type View = "metrics" | "active-queries" | "query-performance" | "advisors" | "operations";

const VIEWS: { value: View; label: string }[] = [
  { value: "metrics", label: "Metrics" },
  { value: "active-queries", label: "Active queries" },
  { value: "query-performance", label: "Query performance" },
  { value: "advisors", label: "Data API Advisors" },
  { value: "operations", label: "System operations" },
];

function isView(v: string | undefined): v is View {
  return VIEWS.some((x) => x.value === v);
}

export default async function MonitoringPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; branchId: string }>;
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const query = await searchParams;
  const { project, branch, defaultBranch } = await loadBranch(projectId, branchId);
  const capabilities = await getProjectCapabilities(projectId, defaultBranch.id);
  const tabs: { value: Tab; label: string; show: boolean }[] = [
    { value: "postgres", label: "Postgres", show: true },
    { value: "storage", label: "Storage", show: capabilities.logs && capabilities.storage },
    { value: "functions", label: "Functions", show: capabilities.logs && capabilities.functions },
    { value: "realtime", label: "Realtime", show: capabilities.logs && capabilities.realtime },
  ];
  const tab: Tab = tabs.find((t) => t.show && t.value === query.tab)?.value ?? "postgres";
  const view: View = isView(query.view) ? query.view : "metrics";
  const base = `/projects/${projectId}/branches/${branchId}/monitoring`;

  return (
    <PageBody>
      <PageHeader title="Monitoring" project={project} branch={branch} />
      <TabBar
        items={tabs
          .filter((t) => t.show)
          .map((t) => ({ label: t.label, href: `${base}?tab=${t.value}`, active: t.value === tab }))}
        size="lg"
      />
      {tab === "postgres" ? (
        <>
          <TabBar
            items={VIEWS.map((v) => ({
              label: v.label,
              href: `${base}?view=${v.value}`,
              active: v.value === view,
            }))}
          />
          {view === "metrics" && <MetricsView projectId={projectId} branchId={branchId} />}
          {view === "active-queries" && <ActiveQueries projectId={projectId} branchId={branchId} />}
          {view === "query-performance" && <QueryPerformance projectId={projectId} branchId={branchId} />}
          {view === "advisors" && <Advisors projectId={projectId} branchId={branchId} />}
          {view === "operations" && <Operations projectId={projectId} branchId={branchId} />}
        </>
      ) : (
        <LogViewer projectId={projectId} branchId={branchId} entity={tab === "functions" ? "function" : tab} />
      )}
    </PageBody>
  );
}

function TabBar({
  items,
  size = "sm",
}: {
  items: { label: string; href: string; active: boolean }[];
  size?: "sm" | "lg";
}) {
  return (
    <div className="mb-4 flex gap-5 border-panel-border border-b">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "-mb-px border-b-2 pb-2",
            size === "lg" ? "text-sm" : "text-xs",
            item.active
              ? "border-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

async function MetricsView({ projectId, branchId }: { projectId: string; branchId: string }) {
  const { data } = await neon.listProjectBranchEndpoints(projectId, branchId);
  const primary = data.endpoints.find((e) => e.type === "read_write");
  const charts = [
    "RAM",
    "CPU",
    "Deadlocks",
    "Rows",
    "Compute cache hit rate",
    "Working set size",
    "Postgres connections count",
    "Database size",
  ];
  return (
    <div className="space-y-4">
      {primary && (
        <div className="flex items-center gap-8 rounded-[3px] border border-panel-border px-5 py-3 text-sm">
          <span className="font-semibold">
            Primary{" "}
            <span className="font-normal text-muted-foreground">
              {primary.current_state === "active" ? "Active" : "Idle"}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">Autoscaling </span>
            {formatCuRange(primary.autoscaling_limit_min_cu, primary.autoscaling_limit_max_cu)}
          </span>
          <span>
            <span className="text-muted-foreground">Scale to 0 after </span>
            {primary.suspend_timeout_seconds < 0
              ? "never"
              : primary.suspend_timeout_seconds === 0
                ? "5 minutes (default)"
                : `${primary.suspend_timeout_seconds}s`}
          </span>
          <Link
            href={`/projects/${projectId}/branches/${branchId}/computes`}
            className="ml-auto font-semibold text-link"
          >
            Edit compute
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {charts.map((title) => (
          <div key={title} className="rounded-[3px] border border-panel-border">
            <div className="px-4 py-3 font-semibold text-sm">{title}</div>
            <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-sm">
              <LineChart className="size-4 text-muted-foreground" />
              There is no data to display at the moment.
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Compute metrics come from Neon&apos;s internal monitoring, which the public API
        doesn&apos;t expose. Active queries, query performance, and system operations are
        live.
      </p>
    </div>
  );
}

async function ActiveQueries({ projectId, branchId }: { projectId: string; branchId: string }) {
  const { rows } = await runProjectSql(
    projectId,
    `SELECT pid, usename, state, wait_event_type, now() - query_start AS duration, left(query, 400) AS query
       FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()
        AND backend_type = 'client backend' AND state <> 'idle'
      ORDER BY query_start`,
    { branchId }
  );
  if (rows.length === 0) return <EmptyCard title="No active queries" />;
  return (
    <SqlTable
      columns={["PID", "Role", "State", "Wait", "Duration", "Query"]}
      rows={rows.map((r) => [
        r.pid,
        r.usename,
        r.state,
        r.wait_event_type ?? "—",
        String(r.duration ?? ""),
        r.query,
      ])}
    />
  );
}

async function QueryPerformance({ projectId, branchId }: { projectId: string; branchId: string }) {
  const installed = await runProjectSql(
    projectId,
    "SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'",
    { branchId }
  );
  if (installed.rows.length === 0) {
    return (
      <EmptyCard
        title="Query statistics are not enabled"
        body={
          <>
            Run <code className="font-mono">CREATE EXTENSION pg_stat_statements;</code> in the{" "}
            <Link
              className="text-link"
              href={`/projects/${projectId}/branches/${branchId}/sql-editor`}
            >
              SQL Editor
            </Link>{" "}
            to start collecting query performance data.
          </>
        }
      />
    );
  }
  const { rows } = await runProjectSql(
    projectId,
    `SELECT r.rolname, s.calls, round(s.mean_exec_time::numeric, 1) AS mean_ms,
            round(s.total_exec_time::numeric, 1) AS total_ms, left(s.query, 400) AS query
       FROM pg_stat_statements s JOIN pg_roles r ON r.oid = s.userid
      ORDER BY s.total_exec_time DESC LIMIT 100`,
    { branchId }
  );
  if (rows.length === 0) return <EmptyCard title="No queries recorded yet" />;
  return (
    <SqlTable
      columns={["Role", "Calls", "Average time", "Total time", "Query"]}
      rows={rows.map((r) => [r.rolname, r.calls, `${r.mean_ms} ms`, `${r.total_ms} ms`, r.query])}
    />
  );
}

async function Advisors({ projectId, branchId }: { projectId: string; branchId: string }) {
  const { data } = await neon.listProjectBranchDatabases(projectId, branchId);
  const databaseName = data.databases[0]?.name;
  const dataApi = databaseName
    ? await ifFound(neonSdk.postgres.dataApi.get({ projectId, branchId, databaseName }))
    : null;
  if (!dataApi) {
    return (
      <EmptyCard
        title="Data API not enabled"
        body="The advisories are only related to Neon's Data API, an optional feature that allows you to access your database through auto-generated REST API endpoints."
        action={
          <Link
            className="font-semibold text-link"
            href={`/projects/${projectId}/branches/${branchId}/data-api`}
          >
            Go to Data API
          </Link>
        }
      />
    );
  }
  return (
    <EmptyCard
      title="Advisories aren't available in this clone"
      body="Neon computes Data API advisories internally; the public API doesn't return them."
    />
  );
}

function Operations({ branchId }: { projectId: string; branchId: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm">
        An operation is an action performed by the Neon control plane on an object or
        resource, such as starting a compute or creating a branch. Monitor here for the
        health and progress of your Neon project operations.{" "}
        <a
          className="text-link"
          href="https://neon.com/docs/manage/operations"
          target="_blank"
          rel="noreferrer"
        >
          Learn more
        </a>
      </p>
      <OperationsTable branchId={branchId} />
    </div>
  );
}

function SqlTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  return (
    <div className="overflow-x-auto rounded-[3px] border border-panel-border">
      <table className="w-full text-sm">
        <thead className="bg-table-head text-left">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-panel-border border-t align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn("px-4 py-2", j === row.length - 1 && "font-mono text-xs")}
                >
                  {cell === null || cell === undefined ? "—" : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyCard({
  title,
  body,
  action,
}: {
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[3px] border border-panel-border px-6 py-12 text-center">
      <div className="font-semibold">{title}</div>
      {body && <p className="max-w-lg text-muted-foreground text-sm">{body}</p>}
      {action}
    </div>
  );
}
