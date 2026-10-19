import { Info } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OrgSidebar } from "@/components/org-sidebar";
import { PageBody } from "@/components/page-header";
import { ProjectsList } from "@/components/projects-table";
import { neon } from "@/lib/neon";
import { loadOrgProjects } from "@/lib/project-context";
import { APP_BACKEND_REGIONS, regionLabel } from "@/lib/region-catalog";
import { DEFAULT_REGION_ID, listRegions, PG_VERSIONS } from "@/lib/regions";
import { requireTenant } from "@/lib/tenancy";
import { formatBytes, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const tenant = await requireTenant("/projects");
  const [listed, regions] = await Promise.all([loadOrgProjects(tenant.activeOrg.id), listRegions()]);
  const details = await Promise.all(
    listed.map(async (p) => {
      const [{ data: project }, { data: branchData }] = await Promise.all([
        neon.getProject(p.id),
        neon.listProjectBranches({ projectId: p.id }),
      ]);
      return { project: project.project, branches: branchData.branches };
    })
  );

  const totals = details.reduce(
    (acc, { project, branches }) => ({
      computeSeconds: acc.computeSeconds + project.compute_time_seconds,
      storageBytes: acc.storageBytes + branches.reduce((s, b) => s + (b.logical_size ?? 0), 0),
      transferBytes: acc.transferBytes + project.data_transfer_bytes,
    }),
    { computeSeconds: 0, storageBytes: 0, transferBytes: 0 }
  );
  const since = details
    .map((d) => d.project.consumption_period_start)
    .sort()[0];

  const rows = details
    .map(({ project, branches }) => ({
      id: project.id,
      name: project.name,
      region: regionLabel(project.region_id),
      createdAt: project.created_at,
      storage: formatBytes(branches.reduce((s, b) => s + (b.logical_size ?? 0), 0)),
      lastActive: project.compute_last_active_at ?? null,
      branches: branches.length,
      defaultBranchId: (branches.find((b) => b.default) ?? branches[0])?.id ?? "",
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const usage = (
    <div className="rounded-[3px] border border-panel-border p-4">
      <div className="grid grid-cols-2 gap-y-3 rounded-[3px] border border-panel-border px-4 py-3 md:grid-cols-4">
        <Metric label="Compute" value={`${+(totals.computeSeconds / 3600).toFixed(2)} CU-hrs`} />
        <Metric label="Storage" value={formatBytes(totals.storageBytes)} />
        <Metric label="History" value="—" hint="History size isn't reported by the public API." />
        <Metric label="Network transfer" value={formatBytes(totals.transferBytes)} />
      </div>
      <p className="mt-3 text-muted-foreground text-xs">
        {since ? `Usage since ${formatDate(since)}. ` : ""}Metrics may be delayed by an
        hour and are not updated for inactive projects.
      </p>
    </div>
  );

  return (
    <AppShell tenant={tenant} sidebar={<OrgSidebar />}>
      <PageBody>
        <ProjectsList
          orgName={tenant.activeOrg.name}
          projects={rows}
          usage={usage}
          regions={regions}
          defaultRegionId={regions.find((r) => r.id === DEFAULT_REGION_ID)?.id ?? regions[0]?.id ?? DEFAULT_REGION_ID}
          pgVersions={PG_VERSIONS}
          backendRegions={[...APP_BACKEND_REGIONS]}
        />
      </PageBody>
    </AppShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-sm" title={hint}>
        {label}
        <Info className="size-3 text-muted-foreground" />
      </div>
      <div className="mt-1 text-xl">{value}</div>
    </div>
  );
}
