import Link from "next/link";
import { neon, ORG_ID, ORG_NAME } from "@/lib/neon";
import { TopBar } from "@/components/topbar";
import { OrgSidebar } from "@/components/org-sidebar";
import { ProjectsTable } from "@/components/projects-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Info, TrendingUp, HardDrive, History, ArrowLeftRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsIndex() {
  const projectsRes = await neon.listProjects({ org_id: ORG_ID });
  const projects = projectsRes.data.projects;

  const branchCounts = await Promise.all(
    projects.map(async (p) => {
      try {
        const b = await neon.listProjectBranches({ projectId: p.id });
        return { id: p.id, count: b.data.branches.length };
      } catch {
        return { id: p.id, count: 0 };
      }
    })
  );
  const branchCountById = new Map(branchCounts.map((b) => [b.id, b.count]));

  const totals = projects.reduce(
    (acc, p) => {
      acc.computeHrs += (p.active_time ?? 0) / 3600;
      acc.storageMb += (p.synthetic_storage_size ?? 0) / 1024 / 1024;
      return acc;
    },
    { computeHrs: 0, storageMb: 0 }
  );

  const earliestCreatedAt =
    projects.length === 0
      ? new Date()
      : new Date(
          projects.reduce(
            (min, p) =>
              new Date(p.created_at).getTime() < min
                ? new Date(p.created_at).getTime()
                : min,
            Date.now()
          )
        );

  const projectRows = projects.map((p) => ({
    id: p.id,
    name: p.name,
    region_id: p.region_id,
    pg_version: p.pg_version,
    created_at: p.created_at,
    storageMb: (p.synthetic_storage_size ?? 0) / 1024 / 1024,
    branches: branchCountById.get(p.id) ?? 0,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex flex-1">
        <OrgSidebar />
        <main className="flex-1 min-w-0 px-8 py-6 max-w-[1200px]">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {ORG_NAME}&apos;s projects
            </h1>
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                New project
              </Link>
            </Button>
          </div>

          <Card className="mb-6">
            <div className="grid grid-cols-4 divide-x">
              <Metric
                label="Compute"
                value={`${totals.computeHrs.toFixed(2)} CU-hrs`}
                icon={TrendingUp}
              />
              <Metric
                label="Storage"
                value={
                  totals.storageMb >= 1024
                    ? `${(totals.storageMb / 1024).toFixed(2)} GB`
                    : `${totals.storageMb.toFixed(2)} MB`
                }
                icon={HardDrive}
              />
              <Metric label="History" value="—" icon={History} />
              <Metric
                label="Network transfer"
                value="—"
                icon={ArrowLeftRight}
              />
            </div>
            <div className="px-5 py-3 border-t text-xs text-muted-foreground">
              Usage since{" "}
              {earliestCreatedAt.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              . Metrics may be delayed by an hour and are not updated for inactive projects.
            </div>
          </Card>

          <ProjectsTable projects={projectRows} />
        </main>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
        <Info className="h-3 w-3 opacity-50" />
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
