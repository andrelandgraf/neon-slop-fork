"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CirclePlus, GitBranch, Hourglass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BranchMenu } from "@/components/branch-menu";
import { CreateBranchDialog } from "@/components/create-branch-dialog";
import { cn, relativeTime } from "@/lib/utils";
import { formatBytes, formatCuRange } from "@/lib/format";
import { useLiveQuery } from "@tanstack/react-db";
import { useProjectLive } from "@/components/live/project-live";
import { LiveStatus } from "@/components/live/live-status";
import { LocalTime, useHydrated } from "@/components/local-time";

interface BranchRow {
  id: string;
  name: string;
  default: boolean;
  protected: boolean;
  parentId?: string;
  parentName: string | null;
  expiresAt?: string;
  computeHours: string;
  primary: { range: string; active: boolean } | null;
  storage: string;
  createdBy: string;
  lastActive: React.ReactNode;
}

/** The table's rows, computed from the live branches and computes. */
function useBranchRows() {
  const live = useProjectLive();
  const branchesQuery = useLiveQuery((q) =>
    q
      .from({ branch: live.branches })
      .orderBy(({ branch }) => branch.default, "desc")
      .orderBy(({ branch }) => branch.created_at, "asc")
  );
  const endpointsQuery = useLiveQuery((q) => q.from({ endpoint: live.endpoints }));
  const branches = branchesQuery.data;
  const endpoints = endpointsQuery.data;
  const nameById = new Map(branches.map((b) => [b.id, b.name]));
  const rows = branches.map((b): BranchRow => {
    const primary = endpoints.find((e) => e.branch_id === b.id && e.type === "read_write");
    return {
      id: b.id,
      name: b.name,
      default: b.default,
      protected: b.protected,
      parentId: b.parent_id ?? undefined,
      parentName: b.parent_id ? (nameById.get(b.parent_id) ?? b.parent_id) : null,
      expiresAt: b.expires_at?.toISOString(),
      computeHours: `${+(b.compute_time_seconds / 3600).toFixed(2)} CU-hrs`,
      primary: primary
        ? {
            range: formatCuRange(primary.autoscaling_limit_min_cu, primary.autoscaling_limit_max_cu),
            active: primary.current_state === "active",
          }
        : null,
      storage: b.logical_size ? formatBytes(b.logical_size) : "-",
      createdBy: b.created_by?.name ?? "—",
      lastActive:
        primary?.current_state === "active" ? (
          "now"
        ) : primary?.last_active ? (
          <LocalTime date={primary.last_active} format={relativeTime} />
        ) : (
          "-"
        ),
    };
  });
  return { rows, queries: [branchesQuery, endpointsQuery] };
}

export function BranchesTable({
  projectId,
  projectName,
  currentBranchId,
}: {
  projectId: string;
  projectName: string;
  currentBranchId: string;
}) {
  const { rows, queries } = useBranchRows();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(params.get("modal") === "create_branch");
  const options = rows.map((r) => ({ id: r.id, name: r.name, default: r.default }));
  const visible = rows.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()));

  // `?modal=create_branch` (from the command bar) opens the dialog once.
  useEffect(() => {
    if (params.get("modal") !== "create_branch") return;
    const next = new URLSearchParams(params);
    next.delete("modal");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [params, pathname, router]);

  return (
    <>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-semibold text-2xl">
            {rows.length} {rows.length === 1 ? "Branch" : "Branches"}
          </h1>
          <LiveStatus queries={queries} />
          <nav className="mt-1 text-sm">
            <Link href="/projects" className="text-link">
              All projects
            </Link>{" "}
            / {projectName}
          </nav>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <CirclePlus className="size-3.5" />
          New Branch
        </Button>
      </div>
      <label className="mb-3 flex h-8 items-center gap-2 rounded-[3px] border border-panel-border px-2.5">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-panel-border border-b">
            {["Branch", "Parent", "Compute", "Primary compute", "Storage", "Created by", "Compute last active", ""].map(
              (h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.id} className="border-panel-border border-b">
              <td className="px-3 py-2">
                <Link
                  href={`/projects/${projectId}/branches/${row.id}`}
                  className="flex items-center gap-1.5 font-semibold hover:underline"
                >
                  <span
                    className={cn("size-1.5 rounded-full", row.id === currentBranchId ? "bg-primary" : "bg-transparent")}
                    aria-label={row.id === currentBranchId ? "Current branch" : undefined}
                  />
                  <GitBranch className="size-3.5 text-muted-foreground" />
                  {row.name}
                  {row.default && <Badge variant="secondary">Default</Badge>}
                  {row.protected && <Badge variant="secondary">Protected</Badge>}
                  {row.expiresAt && (
                    <span title={hydrated ? `Expires ${new Date(row.expiresAt).toLocaleString()}` : undefined}>
                      <Hourglass className="size-3.5 text-muted-foreground" />
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-3 py-2">{row.parentName ?? "-"}</td>
              <td className="px-3 py-2">{row.computeHours}</td>
              <td className="px-3 py-2">
                {row.primary ? (
                  <span className="flex items-center gap-2">
                    <Link
                      href={`/projects/${projectId}/branches/${row.id}/computes`}
                      className="font-semibold text-link"
                    >
                      {row.primary.range}
                    </Link>
                    <span className="flex items-center gap-1 rounded-full border border-panel-border px-1.5 py-px text-xs">
                      <span className={cn("size-1.5 rounded-full", row.primary.active ? "bg-primary" : "bg-muted-foreground")} />
                      {row.primary.active ? "Active" : "Idle"}
                    </span>
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-3 py-2">{row.storage}</td>
              <td className="px-3 py-2">{row.createdBy}</td>
              <td className="px-3 py-2">{row.lastActive}</td>
              <td className="px-2 py-2 text-right">
                <BranchMenu
                  projectId={projectId}
                  branches={options}
                  includeCreateChild
                  branch={{
                    id: row.id,
                    name: row.name,
                    default: row.default,
                    protected: row.protected,
                    parentId: row.parentId,
                    expiresAt: row.expiresAt,
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <CreateBranchDialog
        projectId={projectId}
        branches={options}
        defaultParentId={currentBranchId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
