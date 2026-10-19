"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, CirclePlus, EllipsisVertical, Info, Loader2, Search, X } from "lucide-react";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/utils";
import { formatBytes, formatDate } from "@/lib/format";
import { regionLabel } from "@/lib/region-catalog";
import { CreateProjectModal } from "@/components/create-project-modal";
import type { ServerRegion } from "@/components/neon-ui/region-select";
import { useIdentity, useShellCollections } from "@/components/live/live-root";
import { LiveStatus } from "@/components/live/live-status";
import { useOrgBranches, useProjectCreations } from "@/lib/live/hooks";
import type { LiveSeed } from "@/lib/live/load";
import type { OrgBranchRow, ProjectCreationLiveRow } from "@/lib/live/queries";

const PAGE_SIZE = 10;
const IN_FLIGHT = ["creating", "configuring", "failed"];

export function ProjectsList({
  branches: branchesSeed,
  creations: creationsSeed,
  regions,
  defaultRegionId,
  pgVersions,
  backendRegions,
}: {
  branches: LiveSeed<OrgBranchRow>;
  creations: LiveSeed<ProjectCreationLiveRow>;
  regions: ServerRegion[];
  defaultRegionId: string;
  pgVersions: readonly number[];
  backendRegions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const identity = useIdentity();
  const shell = useShellCollections();
  const branchesCollection = useOrgBranches(branchesSeed);
  const creationsCollection = useProjectCreations(creationsSeed);
  const { data: orgs } = useLiveQuery((q) => q.from({ org: shell.orgs }).where(({ org }) => eq(org.id, identity.orgId)));
  const projectsQuery = useLiveQuery((q) =>
    q.from({ project: shell.projects }).orderBy(({ project }) => project.created_at, "desc")
  );
  const branchesQuery = useLiveQuery((q) => q.from({ branch: branchesCollection }));
  const creationsQuery = useLiveQuery((q) =>
    q
      .from({ creation: creationsCollection })
      .where(({ creation }) => inArray(creation.status, IN_FLIGHT))
      .orderBy(({ creation }) => creation.created_at, "desc")
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const modalOpen = params.get("modal") === "create_project";

  const branchesByProject = Map.groupBy(branchesQuery.data, (b) => b.project_id);
  const projects = projectsQuery.data.map((p) => {
    const branches = branchesByProject.get(p.id) ?? [];
    return {
      ...p,
      storageBytes: branches.reduce((sum, b) => sum + (b.logical_size ?? 0), 0),
      branchCount: branches.length,
      defaultBranchId: (branches.find((b) => b.default) ?? branches[0])?.id,
    };
  });
  // A finished creation's project row has arrived; show only the project.
  const listed = new Set(projects.map((p) => p.id));
  const creations = creationsQuery.data.filter((c) => !(c.project_id && listed.has(c.project_id) && c.status !== "failed"));

  const needle = query.trim().toLowerCase();
  const filtered = projects.filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.id.includes(needle));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const since = projects.map((p) => p.consumption_period_start).sort((a, b) => a.getTime() - b.getTime())[0];

  function setModal(open: boolean) {
    const next = new URLSearchParams(params);
    if (open) next.set("modal", "create_project");
    else next.delete("modal");
    const search = next.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  function dismiss(id: string) {
    creationsCollection
      .delete(id)
      .when("settled")
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Couldn't dismiss it."));
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-semibold text-2xl">{orgs[0]?.name}&apos;s projects</h1>
        <div className="flex gap-2">
          <Button onClick={() => setModal(true)}>
            <CirclePlus className="size-3.5" />
            New project
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="https://neon.com/docs/import/migrate-intro" target="_blank" rel="noreferrer" />}
          >
            Import data
          </Button>
        </div>
      </div>
      <div className="rounded-[3px] border border-panel-border p-4">
        <div className="grid grid-cols-2 gap-y-3 rounded-[3px] border border-panel-border px-4 py-3 md:grid-cols-4">
          <Metric
            label="Compute"
            value={`${+(projects.reduce((s, p) => s + p.compute_time_seconds, 0) / 3600).toFixed(2)} CU-hrs`}
          />
          <Metric label="Storage" value={formatBytes(projects.reduce((s, p) => s + p.storageBytes, 0))} />
          <Metric label="History" value="—" hint="History size isn't reported by the public API." />
          <Metric label="Network transfer" value={formatBytes(projects.reduce((s, p) => s + p.data_transfer_bytes, 0))} />
        </div>
        <p className="mt-3 text-muted-foreground text-xs">
          {since ? `Usage since ${formatDate(since)}. ` : ""}Metrics may be delayed by an hour and are not updated for
          inactive projects.
        </p>
      </div>
      <div className="mt-6 mb-3 flex items-center gap-3">
        <h2 className="font-semibold text-lg">
          {filtered.length} {filtered.length === 1 ? "Project" : "Projects"}
        </h2>
        <LiveStatus queries={[projectsQuery, branchesQuery, creationsQuery]} />
      </div>
      <label className="mb-2 flex h-8 items-center gap-2 rounded-[3px] border border-panel-border px-2.5">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-panel-border border-b">
            {["Name", "Region", "Created at", "Storage", "Compute last active at", "Branches", "Integrations", ""].map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {current === 0 &&
            creations.map((c) => (
              <tr key={c.id} className="border-panel-border border-b" aria-busy={c.status !== "failed"}>
                <td className="px-3 py-2.5 font-semibold">{c.name}</td>
                <td className="px-3 py-2.5">{regionLabel(c.region_id)}</td>
                <td className="px-3 py-2.5" colSpan={5}>
                  {c.status === "failed" ? (
                    <span className="text-destructive">Failed: {c.error}</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      {c.status === "creating" ? "Creating project" : "Setting up services"}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-right">
                  {c.status === "failed" && (
                    <button
                      type="button"
                      aria-label={`Dismiss ${c.name}`}
                      onClick={() => dismiss(c.id)}
                      className="grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          {visible.map((p) => (
            <tr key={p.id} className="border-panel-border border-b">
              <td className="px-3 py-2.5">
                <Link href={`/projects/${p.id}`} className="font-semibold hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2.5">{regionLabel(p.region_id)}</td>
              <td className="px-3 py-2.5">{relativeTime(p.created_at)}</td>
              <td className="px-3 py-2.5">{formatBytes(p.storageBytes)}</td>
              <td className="px-3 py-2.5">{p.compute_last_active_at ? relativeTime(p.compute_last_active_at) : "-"}</td>
              <td className="px-3 py-2.5">{p.branchCount}</td>
              <td className="px-3 py-2.5">
                <Link
                  href={`/projects/${p.id}/integrations${p.defaultBranchId ? `?branch=${p.defaultBranchId}` : ""}`}
                  className="flex items-center gap-1 font-semibold"
                >
                  Add <CirclePlus className="size-3.5" />
                </Link>
              </td>
              <td className="px-2 py-2.5 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Table row actions"
                      className="grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-muted"
                    >
                      <EllipsisVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(`/projects/${p.id}`)}>Dashboard</DropdownMenuItem>
                    {p.defaultBranchId && (
                      <DropdownMenuItem
                        onSelect={() => router.push(`/projects/${p.id}/branches/${p.defaultBranchId}/sql-editor`)}
                      >
                        SQL Editor
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => router.push(`/projects/${p.id}/settings/general#transfer`)}>
                      Transfer project
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(`/projects/${p.id}/settings/general`)}>
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
          {visible.length === 0 && creations.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                {projects.length === 0 ? "No projects yet. Create one to get started." : "No projects match your search."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-1 text-sm">
          <span className="mr-2 text-muted-foreground">
            {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Go to first page" disabled={current === 0} onClick={() => setPage(0)}>
            <ChevronsLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Go to previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Go to next page"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
      <CreateProjectModal
        open={modalOpen}
        onOpenChange={setModal}
        creations={creationsCollection}
        regions={regions}
        defaultRegionId={defaultRegionId}
        pgVersions={pgVersions}
        backendRegions={backendRegions}
      />
    </>
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
