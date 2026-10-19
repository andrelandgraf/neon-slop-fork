import Link from "next/link";
import {
  ChevronDown,
  Database,
  Folder,
  LineChart,
  Sparkles,
  SquareFunction,
  UserRoundCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/page-header";
import { getProjectCapabilities } from "@/lib/capabilities";
import { ifFound, neon, neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { regionLabel } from "@/lib/region-catalog";
import {
  formatBytes,
  formatCuRange,
  formatDate,
  formatDateTime,
  formatHistoryRetention,
} from "@/lib/format";
import { BranchHeaderActions } from "./branch-header-actions";
import { NewBranchDialog } from "./new-branch-dialog";

export const dynamic = "force-dynamic";

export default async function BranchOverviewPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id: projectId, branchId } = await params;
  const { project, branch, branches, defaultBranch } = await loadBranch(
    projectId,
    branchId
  );
  const capabilities = await getProjectCapabilities(projectId, defaultBranch.id);
  const [endpoints, databases, auth, buckets, functions, realtime] =
    await Promise.all([
      neon.listProjectBranchEndpoints(projectId, branchId).then((r) => r.data.endpoints),
      neon.listProjectBranchDatabases(projectId, branchId).then((r) => r.data.databases),
      ifFound(neonSdk.auth.get({ projectId, branchId })),
      capabilities.storage
        ? ifFound(neonSdk.storage.buckets.list({ projectId, branchId }))
        : null,
      capabilities.functions
        ? ifFound(neon.listFunctionsFirstPage(projectId, branchId))
        : null,
      capabilities.realtime ? ifFound(neonSdk.realtime.get({ projectId, branchId })) : null,
    ]);

  const base = `/projects/${projectId}/branches/${branchId}`;
  const parent = branches.find((b) => b.id === branch.parent_id);
  const defaults = project.default_endpoint_settings;
  const storageBytes = branches.reduce((sum, b) => sum + (b.logical_size ?? 0), 0);

  const services: {
    icon: LucideIcon;
    label: string;
    href: string;
    detail: React.ReactNode;
    show: boolean;
  }[] = [
    {
      icon: Database,
      label: "Postgres database",
      href: `${base}/databases`,
      detail: `${plural(databases.length, "database")}, ${plural(endpoints.length, "compute")}`,
      show: true,
    },
    {
      icon: UserRoundCheck,
      label: "Better Auth",
      href: `${base}/auth`,
      detail: auth ? (
        "Users and sessions in your database"
      ) : (
        <span className="flex items-center justify-between gap-3">
          Get user management via Better Auth
          <Button size="xs" variant="outline" nativeButton={false} render={<Link href={`${base}/auth`} />}>
            Get started
          </Button>
        </span>
      ),
      show: true,
    },
    {
      icon: Folder,
      label: "Object storage",
      href: `${base}/storage`,
      detail:
        buckets && buckets.length > 0
          ? plural(buckets.length, "bucket")
          : "Upload files and media to buckets",
      show: capabilities.storage,
    },
    {
      icon: SquareFunction,
      label: "Functions",
      href: `${base}/functions`,
      detail:
        functions && functions.data.functions.length > 0
          ? plural(functions.data.functions.length, "function")
          : "Deploy serverless functions next to your data",
      show: capabilities.functions,
    },
    {
      icon: Sparkles,
      label: "AI Gateway",
      href: `${base}/ai-gateway`,
      detail: "Access AI models from OpenAI, Anthropic, Google, and more",
      show: capabilities.aiGateway,
    },
    {
      icon: Zap,
      label: "Realtime",
      href: `${base}/realtime`,
      detail: realtime?.enabled
        ? "Enabled"
        : "Live query results that update as your data changes",
      show: capabilities.realtime,
    },
  ];

  return (
    <PageBody>
      <NewBranchDialog
        projectId={projectId}
        branchId={branchId}
        branchName={branch.name}
        expiresAt={branch.expires_at}
      />
      <PageHeader
        title="Branch overview"
        project={project}
        branch={branch}
        actions={
            <BranchHeaderActions
              key={branch.id}
              projectId={projectId}
              branch={{
                id: branch.id,
                name: branch.name,
                default: branch.default,
                protected: branch.protected,
                parentId: branch.parent_id,
                expiresAt: branch.expires_at,
              }}
              branches={branches.map((b) => ({ id: b.id, name: b.name, default: b.default }))}
            />
        }
      />
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-[3px] border border-panel-border">
            <table className="w-full text-sm">
              <thead className="bg-table-head text-left">
                <tr>
                  <th className="w-[38%] px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Description / Details</th>
                </tr>
              </thead>
              <tbody>
                {services
                  .filter((s) => s.show)
                  .map((service) => (
                    <tr key={service.label} className="border-panel-border border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={service.href}
                          className="flex items-center gap-2.5 font-semibold hover:underline"
                        >
                          <span className="grid size-6 place-items-center rounded-[3px] bg-muted">
                            <service.icon className="size-3.5" />
                          </span>
                          {service.label}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{service.detail}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-[3px] border border-panel-border">
            <div className="px-4 py-3 font-semibold">Postgres Monitoring</div>
            <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm">
              <LineChart className="size-4 text-muted-foreground" />
              There is no data to display at the moment.
              <span className="max-w-sm text-center text-muted-foreground text-xs">
                Compute and RAM charts come from Neon's internal metrics, which
                the public API doesn't expose.
              </span>
            </div>
          </div>
        </div>
        <aside className="w-[288px] shrink-0">
          <DetailSection title="Branch">
            <Detail label="Name" value={branch.name} />
            <Detail label="ID" value={branch.id} mono />
            <Detail
              label="Expires"
              value={branch.expires_at ? formatDateTime(branch.expires_at) : "Never"}
              link
            />
            <Detail label="Created" value={formatDateTime(branch.created_at)} />
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
                  value={branch.parent_lsn ? `LSN ${branch.parent_lsn}` : formatDateTime(branch.parent_timestamp)}
                  mono
                />
                <Detail label="Last updated" value={formatDateTime(branch.updated_at)} />
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
            <Detail
              label="Default branch"
              value={
                <Link href={`/projects/${projectId}/branches/${defaultBranch.id}`} className="text-link">
                  {defaultBranch.name}
                </Link>
              }
            />
            <Detail
              label="IP restrictions"
              value={
                <Link
                  href={`/projects/${projectId}/settings/networking?branch=${branchId}`}
                  className="text-link"
                >
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
              Since {formatDate(project.consumption_period_start)}
            </p>
            <Detail
              label="Compute"
              value={`${(project.compute_time_seconds / 3600).toFixed(2)} CU-hrs`}
            />
            <Detail label="Storage" value={formatBytes(storageBytes)} />
            <Detail label="Written data" value={formatBytes(project.written_data_bytes)} />
            <Detail label="Network transfer" value={formatBytes(project.data_transfer_bytes)} />
          </DetailSection>
          <DetailSection title="Postgres">
            <Detail
              label="Default compute"
              value={
                <Link
                  href={`/projects/${projectId}/settings/postgres?branch=${branchId}`}
                  className="text-link"
                >
                  {formatCuRange(
                    defaults?.autoscaling_limit_min_cu ?? 0.25,
                    defaults?.autoscaling_limit_max_cu ?? 2
                  )}
                </Link>
              }
            />
            <Detail
              label="History retention"
              value={
                <Link
                  href={`/projects/${projectId}/settings/postgres?branch=${branchId}`}
                  className="text-link"
                >
                  {formatHistoryRetention(project.history_retention_seconds)}
                </Link>
              }
            />
            <Detail label="Version" value={String(project.pg_version)} />
          </DetailSection>
        </aside>
      </div>
    </PageBody>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
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

function Detail({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  link?: boolean;
}) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`truncate ${mono ? "font-mono" : ""} ${link ? "text-link" : ""}`}>{value}</dd>
    </div>
  );
}
