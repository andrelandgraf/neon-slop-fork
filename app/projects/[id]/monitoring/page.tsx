import { ConsumptionHistoryGranularity } from "@neondatabase/api-client";
import { neon, ORG_ID } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Activity, RefreshCw, Info } from "lucide-react";

export const dynamic = "force-dynamic";

interface UsagePoint {
  timeframe_start: string;
  timeframe_end: string;
  active_time_seconds: number;
  compute_time_seconds: number;
  written_data_bytes: number;
  synthetic_storage_size_bytes: number;
}

async function loadConsumption(
  projectId: string
): Promise<{ points: UsagePoint[]; error: string | null }> {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  try {
    const res = await neon.getConsumptionHistoryPerProject({
      project_ids: [projectId],
      from: from.toISOString(),
      to: now.toISOString(),
      granularity: ConsumptionHistoryGranularity.Hourly,
      org_id: ORG_ID,
    });
    const project = res.data.projects?.[0];
    const points: UsagePoint[] =
      project?.periods?.flatMap((p) => p.consumption ?? []) ?? [];
    return { points: points as UsagePoint[], error: null };
  } catch (e) {
    return {
      points: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export default async function MonitoringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pRes, bRes, consumption] = await Promise.all([
    neon.getProject(id),
    neon.listProjectBranches({ projectId: id }),
    loadConsumption(id),
  ]);
  const project = pRes.data.project;
  const defaultBranch =
    bRes.data.branches.find((b) => b.default) ?? bRes.data.branches[0];

  const endpoints = defaultBranch
    ? await neon
        .listProjectBranchEndpoints(id, defaultBranch.id)
        .then((r) => r.data.endpoints)
        .catch(() => [])
    : [];
  const primary = endpoints[0];

  const minCu = primary?.autoscaling_limit_min_cu ?? 0.25;
  const maxCu = primary?.autoscaling_limit_max_cu ?? 0.25;
  const suspend = primary?.suspend_timeout_seconds ?? 0;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Monitoring</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{project.name}</p>

      <div className="border-b mb-5 -mx-8 px-8">
        <Tabs />
      </div>

      <div className="flex items-center gap-4 mb-5">
        <Field label="Compute">
          <div
            className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
            title="The public API does not yet expose per-endpoint live state, only the latest snapshot."
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                primary?.current_state === "active"
                  ? "bg-emerald-500"
                  : "bg-gray-400"
              }`}
            />
            <span className="font-mono capitalize">
              {primary?.type ?? "—"}
            </span>
            <span className="text-muted-foreground">
              {primary?.current_state ?? "—"}
            </span>
          </div>
        </Field>
        <div className="ml-auto flex items-center gap-2">
          <RangeButton selected>Last hour</RangeButton>
          <RangeButton>Last day</RangeButton>
          <RangeButton>Last 7 days</RangeButton>
          <RangeButton>Other</RangeButton>
          <button
            disabled
            title="The consumption history API only updates hourly — refreshing the page is enough."
            className="rounded-md border px-2 py-1 text-xs inline-flex items-center gap-1 text-muted-foreground/70 cursor-not-allowed"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1">
            Compute settings
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="space-y-1 text-xs">
            <Row label="Min" value={`${minCu} CU (~${(minCu * 4).toFixed(2)} GB RAM)`} />
            <Row label="Max" value={`${maxCu} CU (~${(maxCu * 4).toFixed(2)} GB RAM)`} />
            <Row
              label="Autosuspend delay"
              value={suspend > 0 ? `${suspend}s` : "never"}
            />
          </div>
          <a
            href={`/projects/${id}/overview?tab=computes`}
            className="mt-3 inline-block text-[11px] underline text-primary"
          >
            EDIT ENDPOINT
          </a>
        </Card>

        <ChartCard
          title="RAM"
          legend={["Endpoint Inactive", "Allocated", "Used"]}
          unavailable
        />
        <ChartCard
          title="CPU"
          legend={["Endpoint Inactive", "Allocated", "Used"]}
          unavailable
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Databases"
          subtitle="COUNT"
          consumption={consumption.points}
          metric="written_data_bytes"
          unavailable={consumption.points.length === 0}
        />
        <ChartCard
          title="Roles"
          subtitle="COUNT"
          legend={["Endpoint Inactive", "Inserted", "Updated", "Deleted"]}
          unavailable
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Local file cache hit rate"
          subtitle="PERCENT"
          unavailable
        />
        <ChartCard
          title="Working set size"
          legend={["Endpoint Inactive", "RAM", "LFC USED + DISK READ"]}
          unavailable
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Master client connections"
          subtitle="Idle: 50/100 · Max idle: 50/100"
          legend={["Endpoint Inactive", "Active", "Reserved Idle", "Idle"]}
          unavailable
        />
        <ChartCard
          title="Postgres connections count"
          legend={["Endpoint Inactive", "Active", "Idle", "Total", "Max"]}
          unavailable
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="Master server connections"
          legend={["Endpoint Inactive", "Idle in Tx Aborted", "Idle in Tx", "Active", "Idle"]}
          unavailable
        />
        <ChartCard
          title="Database size"
          subtitle={`${((project.synthetic_storage_size ?? 0) / 1024 / 1024).toFixed(2)} MB`}
          legend={["Endpoint Inactive", "Per database", "All databases"]}
          unavailable
        />
      </div>
    </div>
  );
}

function Tabs() {
  const tabs = [
    { label: "Metrics", active: true },
    { label: "Active queries" },
    { label: "Query performance" },
    { label: "System operations" },
    { label: "Data API Advisors" },
  ];
  return (
    <div className="flex items-center gap-5 -mb-px">
      {tabs.map((t) => (
        <div
          key={t.label}
          className={`pb-3 text-sm border-b-2 ${
            t.active
              ? "border-foreground font-medium"
              : "border-transparent text-muted-foreground"
          }`}
          title={t.active ? undefined : "Not implemented in this clone"}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

function RangeButton({
  children,
  selected,
}: {
  children: React.ReactNode;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      disabled
      title="The consumption history API returns hourly granularity at most; range pickers are informational in this clone."
      className={
        selected
          ? "rounded-md border px-2 py-1 text-xs bg-foreground text-background cursor-not-allowed"
          : "rounded-md border px-2 py-1 text-xs text-muted-foreground/70 cursor-not-allowed"
      }
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground/85">{value}</span>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  legend,
  unavailable,
  consumption,
  metric,
}: {
  title: string;
  subtitle?: string;
  legend?: string[];
  unavailable?: boolean;
  consumption?: UsagePoint[];
  metric?: keyof UsagePoint;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs font-semibold">{title}</div>
          {subtitle && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {legend && (
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground mb-2">
          {legend.map((l) => (
            <span key={l} className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              {l}
            </span>
          ))}
        </div>
      )}
      <div className="h-[140px] grid place-items-center text-[11px] text-muted-foreground bg-muted/20 rounded">
        {unavailable && (consumption?.length ?? 0) === 0 ? (
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3 opacity-40" />
            Live series not exposed by the public Neon API.
          </span>
        ) : consumption && metric ? (
          <SparkLine points={consumption} metric={metric} />
        ) : (
          <span>No data</span>
        )}
      </div>
    </Card>
  );
}

function SparkLine({
  points,
  metric,
}: {
  points: UsagePoint[];
  metric: keyof UsagePoint;
}) {
  const values = points
    .map((p) => Number(p[metric]))
    .filter((v) => Number.isFinite(v));
  if (values.length === 0) return <span>No data</span>;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const w = 280;
  const h = 100;
  const span = Math.max(max - min, 1);
  const step = w / Math.max(values.length - 1, 1);
  const points2 = values
    .map((v, i) => `${i * step},${h - ((v - min) / span) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <polyline
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth={1.5}
        points={points2}
      />
    </svg>
  );
}
