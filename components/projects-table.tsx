"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, CirclePlus, EllipsisVertical, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/utils";
import { CreateProjectModal } from "@/components/create-project-modal";
import type { ServerRegion } from "@/components/neon-ui/region-select";

export interface ProjectRow {
  id: string;
  name: string;
  region: string;
  createdAt: string;
  storage: string;
  lastActive: string | null;
  branches: number;
  defaultBranchId: string;
}

const PAGE_SIZE = 10;

export function ProjectsList({
  orgName,
  projects,
  usage,
  regions,
  defaultRegionId,
  pgVersions,
  backendRegions,
}: {
  orgName: string;
  projects: ProjectRow[];
  usage: React.ReactNode;
  regions: ServerRegion[];
  defaultRegionId: string;
  pgVersions: readonly number[];
  backendRegions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const modalOpen = params.get("modal") === "create_project";
  const needle = query.trim().toLowerCase();
  const filtered = projects.filter(
    (p) => !needle || p.name.toLowerCase().includes(needle) || p.id.includes(needle)
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function setModal(open: boolean) {
    const next = new URLSearchParams(params);
    if (open) next.set("modal", "create_project");
    else next.delete("modal");
    const search = next.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-semibold text-2xl">{orgName}&apos;s projects</h1>
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
      {usage}
      <h2 className="mt-6 mb-3 font-semibold text-lg">
        {filtered.length} {filtered.length === 1 ? "Project" : "Projects"}
      </h2>
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
          {visible.map((p) => (
            <tr key={p.id} className="border-panel-border border-b">
              <td className="px-3 py-2.5">
                <Link href={`/projects/${p.id}`} className="font-semibold hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2.5">{p.region}</td>
              <td className="px-3 py-2.5">{relativeTime(p.createdAt)}</td>
              <td className="px-3 py-2.5">{p.storage}</td>
              <td className="px-3 py-2.5">{p.lastActive ? relativeTime(p.lastActive) : "-"}</td>
              <td className="px-3 py-2.5">{p.branches}</td>
              <td className="px-3 py-2.5">
                <Link
                  href={`/projects/${p.id}/integrations?branch=${p.defaultBranchId}`}
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
                    <DropdownMenuItem
                      onSelect={() => router.push(`/projects/${p.id}/branches/${p.defaultBranchId}/sql-editor`)}
                    >
                      SQL Editor
                    </DropdownMenuItem>
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
          {visible.length === 0 && (
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
        regions={regions}
        defaultRegionId={defaultRegionId}
        pgVersions={pgVersions}
        backendRegions={backendRegions}
      />
    </>
  );
}
