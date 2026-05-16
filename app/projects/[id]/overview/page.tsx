import Link from "next/link";
import { Copy, GitBranch, Shield, MoreHorizontal } from "lucide-react";
import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComputesTab } from "./computes-tab";
import { RolesDatabasesTab } from "./roles-databases-tab";
import { ChildBranchesTab } from "./child-branches-tab";

export const dynamic = "force-dynamic";

type Tab = "computes" | "roles-databases" | "child-branches";

const TABS: { id: Tab; label: string }[] = [
  { id: "computes", label: "Computes" },
  { id: "roles-databases", label: "Roles & Databases" },
  { id: "child-branches", label: "Child branches" },
];

/**
 * `/projects/[id]/overview`
 *
 * Mirrors console.neon.tech's "Branch overview" screen: the active
 * branch's metric strip + identity card, plus three sub-tabs that
 * surface its computes, roles + databases, and child branches.
 *
 * The Compute / Roles / Databases standalone routes are gone in
 * favour of this single screen — Neon doesn't sidebar them either.
 * Deep links to the old paths now 404 (we don't redirect because
 * the old layouts displayed strictly less information).
 */
export default async function BranchOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; branch?: string }>;
}) {
  const { id: projectId } = await params;
  const { tab, branch: branchParam } = await searchParams;
  const activeTab: Tab =
    tab === "roles-databases" || tab === "child-branches"
      ? tab
      : "computes";

  const [pRes, bRes] = await Promise.all([
    neon.getProject(projectId),
    neon.listProjectBranches({ projectId }),
  ]);
  const project = pRes.data.project;
  const branches = bRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];
  const activeBranch =
    branches.find((b) => b.id === branchParam) ?? defaultBranch;

  const computeUsageGb =
    (activeBranch.compute_time_seconds ?? 0) / 3600;
  const storageBytes = activeBranch.logical_size ?? 0;
  const storageGb = storageBytes / 1024 ** 3;
  const writtenGb = (activeBranch.written_data_bytes ?? 0) / 1024 ** 3;

  return (
    <div className="px-8 py-6 max-w-[1100px]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 className="text-xl font-semibold">Branch overview</h1>
          <div className="flex items-center gap-2 mt-1 text-sm">
            <GitBranchIcon />
            <span className="font-mono">{activeBranch.name}</span>
            {activeBranch.default && <Badge variant="muted">Default</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link
              href={`/projects/${projectId}/branches?parent=${activeBranch.id}`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Create child branch
            </Link>
          </Button>
          <Button
            variant="outline"
            disabled
            title="Branch protection requires a paid Neon plan."
          >
            <Shield className="h-3.5 w-3.5" />
            Protect
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled
            title="More actions (rename, transfer, …) — coming soon."
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="mt-4">
        <div className="grid grid-cols-5 divide-x">
          <Metric label="Compute" value={`${computeUsageGb.toFixed(2)} CU-hrs`} />
          <Metric label="Storage" value={formatBytes(storageBytes)} />
          <Metric
            label="Storage delta"
            value={writtenGb > 0 ? `${writtenGb.toFixed(3)} GB` : "0 kB"}
          />
          <Metric label="History" value="0 kB" />
          <Metric label="Network transfer" value="0 kB" />
        </div>
        <div className="px-5 py-3 border-t text-xs text-muted-foreground">
          Usage since{" "}
          {new Date(project.created_at).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          . Metrics may be delayed by an hour and are not updated for inactive
          branches.
        </div>
      </Card>

      <Card className="mt-4">
        <div className="grid grid-cols-3 gap-6 p-5 text-sm">
          <Field label="ID">
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {activeBranch.id}
              <button
                type="button"
                aria-label="Copy branch id"
                className="text-muted-foreground hover:text-foreground"
                disabled
                title="Copy is a client-side affordance; not wired in this clone."
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </Field>
          <Field label="Created on">
            {new Date(activeBranch.created_at).toLocaleString()}
          </Field>
          <Field label="Created by">
            <span className="text-muted-foreground">—</span>
          </Field>
        </div>
      </Card>

      <div className="border-b mt-6">
        <nav className="flex items-center gap-6 -mb-px">
          {TABS.map((t) => {
            const href = `/projects/${projectId}/overview?tab=${t.id}${
              branchParam ? `&branch=${branchParam}` : ""
            }`;
            const active = t.id === activeTab;
            return (
              <Link
                key={t.id}
                href={href}
                className={`pb-3 text-sm border-b-2 ${
                  active
                    ? "border-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-5">
        {activeTab === "computes" && (
          <ComputesTab projectId={projectId} branchId={activeBranch.id} />
        )}
        {activeTab === "roles-databases" && (
          <RolesDatabasesTab
            projectId={projectId}
            branchId={activeBranch.id}
          />
        )}
        {activeTab === "child-branches" && (
          <ChildBranchesTab
            projectId={projectId}
            branchId={activeBranch.id}
            allBranches={branches.map((b) => ({
              id: b.id,
              name: b.name,
              parent_id: b.parent_id ?? null,
              created_at: b.created_at,
              expires_at: (b as { expires_at?: string }).expires_at ?? null,
            }))}
          />
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function GitBranchIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 text-muted-foreground"
      fill="currentColor"
    >
      <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 9a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6.75-6a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-7 1.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm0 9a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm6.75-9a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM5.75 7a4.252 4.252 0 0 0 4.085 3.043l.04.001A.75.75 0 0 1 9.875 11.5l-.04-.001A5.752 5.752 0 0 1 4.25 7H5.75Z" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 kB";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} kB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
