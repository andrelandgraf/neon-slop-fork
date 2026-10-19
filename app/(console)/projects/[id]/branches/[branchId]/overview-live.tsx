"use client";
import { ChevronDown } from "lucide-react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useShellCollections } from "@/components/live/live-root";
import { useBranchDatabases, useBranchServices, useBuckets, useFunctions, useProjectLive } from "@/components/live/project-live";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatBytes, formatCuRange, formatDate, formatDateTime, formatHistoryRetention } from "@/lib/format";
import type { LiveSeed } from "@/lib/live/load";
import type { BranchServiceRow, BucketRow, DatabaseRow, FunctionRow } from "@/lib/live/queries";
import { regionLabel } from "@/lib/region-catalog";
import { LiveStatus } from "@/components/live/live-status";
import { LocalTime } from "@/components/local-time";

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** "1 database, 1 compute" for the Postgres row of the services table. */
export function PostgresServiceDetail({ branchId, databases: seed }: { branchId: string; databases: LiveSeed<DatabaseRow> }) {
  const live = useProjectLive();
  const databases = useBranchDatabases(branchId, seed);
  const dbs = useLiveQuery((q) => q.from({ database: databases }));
  const computes = useLiveQuery({
    query: (q) => q.from({ endpoint: live.endpoints }).where(({ endpoint }) => eq(endpoint.branch_id, branchId)),
  });
  return (
    <>
      {`${plural(dbs.data.length, "database")}, ${plural(computes.data.length, "compute")}`}
      <LiveStatus queries={[dbs, computes]} />
    </>
  );
}

/** The overview's right-hand details: branch, project, usage and Postgres defaults, all live. */
export function BranchDetailsAside({ projectId, branchId }: { projectId: string; branchId: string }) {
  const live = useProjectLive();
  const shell = useShellCollections();
  const branchesQuery = useLiveQuery((q) => q.from({ branch: live.branches }));
  const projectsQuery = useLiveQuery({
    query: (q) => q.from({ project: shell.projects }).where(({ project }) => eq(project.id, projectId)),
  });
  const branches = branchesQuery.data;
  const projects = projectsQuery.data;
  const project = projects[0];
  const branch = branches.find((b) => b.id === branchId);
  if (!project || !branch) return null;
  const parent = branches.find((b) => b.id === branch.parent_id);
  const defaultBranch = branches.find((b) => b.default);
  const defaults = project.default_endpoint_settings;
  const storageBytes = branches.reduce((sum, b) => sum + (b.logical_size ?? 0), 0);
  return (
    <aside className="w-full shrink-0 lg:w-[288px]">
      <LiveStatus queries={[branchesQuery, projectsQuery]} />
      <DetailSection title="Branch">
        <Detail label="Name" value={branch.name} />
        <Detail label="ID" value={branch.id} mono />
        <Detail label="Expires" value={branch.expires_at ? <LocalTime date={branch.expires_at} format={formatDateTime} /> : "Never"} link />
        <Detail label="Created" value={<LocalTime date={branch.created_at} format={formatDateTime} />} />
        <Detail label="Created by" value={branch.created_by?.name ?? "—"} />
        {parent && (
          <>
            <Detail
              label="Parent branch"
              value={
                <Link href={`/projects/${projectId}/branches/${parent.id}`} className="text-link">
                  {parent.name}
                </Link>
              }
            />
            <Detail
              label="Branched from"
              value={
                branch.parent_lsn ? (
                  `LSN ${branch.parent_lsn}`
                ) : branch.parent_timestamp ? (
                  <LocalTime date={branch.parent_timestamp} format={formatDateTime} />
                ) : (
                  "—"
                )
              }
              mono
            />
            <Detail label="Last updated" value={<LocalTime date={branch.updated_at} format={formatDateTime} />} />
          </>
        )}
      </DetailSection>
      <DetailSection
        title="Project"
        action={
          <Link href={`/projects/${projectId}/branches?branch=${branchId}`} className="text-link text-xs">
            Manage branches
          </Link>
        }
      >
        <Detail label="Name" value={project.name} />
        <Detail label="ID" value={project.id} mono />
        <Detail label="Region" value={regionLabel(project.region_id)} />
        <Detail label="Plan" value="Free plan" />
        <Detail label="Branches" value={String(branches.length)} />
        {defaultBranch && (
          <Detail
            label="Default branch"
            value={
              <Link href={`/projects/${projectId}/branches/${defaultBranch.id}`} className="text-link">
                {defaultBranch.name}
              </Link>
            }
          />
        )}
        <Detail
          label="IP restrictions"
          value={
            <Link href={`/projects/${projectId}/settings/networking?branch=${branchId}`} className="text-link">
              {project.settings?.allowed_ips?.ips?.length ? "Enabled" : "None set"}
            </Link>
          }
        />
      </DetailSection>
      <DetailSection
        title="Usage"
        action={
          <Link href="/org/billing" className="text-link text-xs">
            View billing
          </Link>
        }
      >
        <p className="pb-1 text-muted-foreground text-xs">
          Since <LocalTime date={project.consumption_period_start} format={formatDate} />
        </p>
        <Detail label="Compute" value={`${(project.compute_time_seconds / 3600).toFixed(2)} CU-hrs`} />
        <Detail label="Storage" value={formatBytes(storageBytes)} />
        <Detail label="Written data" value={formatBytes(project.written_data_bytes)} />
        <Detail label="Network transfer" value={formatBytes(project.data_transfer_bytes)} />
      </DetailSection>
      <DetailSection title="Postgres">
        <Detail
          label="Default compute"
          value={
            <Link href={`/projects/${projectId}/settings/postgres?branch=${branchId}`} className="text-link">
              {formatCuRange(defaults?.autoscaling_limit_min_cu ?? 0.25, defaults?.autoscaling_limit_max_cu ?? 2)}
            </Link>
          }
        />
        <Detail
          label="History retention"
          value={
            <Link href={`/projects/${projectId}/settings/postgres?branch=${branchId}`} className="text-link">
              {formatHistoryRetention(project.history_retention_seconds)}
            </Link>
          }
        />
        <Detail label="Version" value={String(project.pg_version)} />
      </DetailSection>
    </aside>
  );
}

function DetailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details open className="group border-panel-border border-t py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between pb-2 font-semibold text-sm">
        <span className="flex items-center gap-1">
          {title}
          <ChevronDown className="size-3.5 text-muted-foreground -rotate-90 transition-transform group-open:rotate-0" />
        </span>
        {action}
      </summary>
      <dl className="space-y-1.5">{children}</dl>
    </details>
  );
}

function Detail({ label, value, mono, link }: { label: string; value: React.ReactNode; mono?: boolean; link?: boolean }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`truncate ${mono ? "font-mono" : ""} ${link ? "text-link" : ""}`}>{value}</dd>
    </div>
  );
}

/** The services table's Auth, Storage, Functions and Realtime details, from the branch's live app-backend state. */
export function useServiceDetails(
  branchId: string,
  seeds: { services: LiveSeed<BranchServiceRow>; buckets: LiveSeed<BucketRow>; functions: LiveSeed<FunctionRow> }
) {
  const servicesCollection = useBranchServices(branchId, seeds.services);
  const bucketsCollection = useBuckets(branchId, seeds.buckets);
  const functionsCollection = useFunctions(branchId, seeds.functions);
  const services = useLiveQuery((q) => q.from({ s: servicesCollection }));
  const buckets = useLiveQuery((q) => q.from({ b: bucketsCollection }));
  const functions = useLiveQuery((q) => q.from({ f: functionsCollection }));
  return { service: services.data[0], buckets: buckets.data.length, functions: functions.data.length, queries: [services, buckets, functions] };
}

export function AuthServiceDetail({ base, ...props }: { base: string; branchId: string } & Seeds) {
  const { service } = useServiceDetails(props.branchId, props);
  if (service?.auth) return <>Users and sessions in your database</>;
  return (
    <span className="flex items-center justify-between gap-3">
      Get user management via Better Auth
      <Button size="xs" variant="outline" nativeButton={false} render={<Link href={`${base}/auth`} />}>
        Get started
      </Button>
    </span>
  );
}

export function StorageServiceDetail(props: { branchId: string } & Seeds) {
  const { buckets, queries } = useServiceDetails(props.branchId, props);
  return (
    <>
      {buckets > 0 ? plural(buckets, "bucket") : "Upload files and media to buckets"}
      <LiveStatus queries={queries} />
    </>
  );
}

export function FunctionsServiceDetail(props: { branchId: string } & Seeds) {
  const { functions } = useServiceDetails(props.branchId, props);
  return <>{functions > 0 ? plural(functions, "function") : "Deploy serverless functions next to your data"}</>;
}

export function RealtimeServiceDetail(props: { branchId: string } & Seeds) {
  const { service } = useServiceDetails(props.branchId, props);
  return <>{service?.realtime?.enabled ? "Enabled" : "Live query results that update as your data changes"}</>;
}

type Seeds = { services: LiveSeed<BranchServiceRow>; buckets: LiveSeed<BucketRow>; functions: LiveSeed<FunctionRow> };
