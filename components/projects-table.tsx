"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, GitBranch, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";

interface ProjectRow {
  id: string;
  name: string;
  region_id: string;
  pg_version: number;
  created_at: string;
  storageMb: number;
  branches: number;
}

const REGION_LABELS: Record<string, string> = {
  "aws-us-east-1": "AWS US East 1 (N. Virginia)",
  "aws-us-east-2": "AWS US East 2 (Ohio)",
  "aws-us-west-2": "AWS US West 2 (Oregon)",
  "aws-eu-central-1": "AWS EU Central 1 (Frankfurt)",
  "aws-eu-west-2": "AWS EU West 2 (London)",
  "aws-ap-southeast-1": "AWS AP Southeast 1 (Singapore)",
};

function regionLabel(id: string): string {
  return REGION_LABELS[id] ?? id;
}

function formatStorage(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

export function ProjectsTable({ projects }: { projects: ProjectRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.region_id.toLowerCase().includes(q)
    );
  }, [projects, query]);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="text-base font-semibold">{filtered.length} Projects</div>
      </div>
      <div className="relative mb-3">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects by name, ID, or region…"
          className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        projects.length === 0 ? (
          <div className="relative overflow-hidden rounded-xl border bg-card p-12 text-center">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.6]"
              style={{
                background:
                  "radial-gradient(420px circle at 50% 0%, hsl(var(--primary) / 0.12), transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">Create your first project</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                A project is a serverless Postgres database with instant branching.
                Spin one up in seconds — it scales to zero when idle.
              </p>
              <Link
                href="/projects/new"
                className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary))] transition-shadow hover:shadow-[0_0_34px_-6px_hsl(var(--primary))]"
              >
                <Database className="h-4 w-4" />
                New project
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            No projects match &ldquo;{query}&rdquo;.
          </div>
        )
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="max-h-[calc(100vh-22rem)] overflow-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b bg-muted/30 text-left">
                  <Th>Name</Th>
                  <Th>Region</Th>
                  <Th>Created at</Th>
                  <Th>Storage</Th>
                  <Th>Postgres</Th>
                  <Th>Branches</Th>
                  <Th>HIPAA</Th>
                  <Th className="w-10"></Th>
                </tr>
              </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium hover:underline flex items-center gap-2"
                    >
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.name}
                    </Link>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {p.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {regionLabel(p.region_id)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {relativeTime(p.created_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {formatStorage(p.storageMb)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">v{p.pg_version}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {p.branches}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      Disabled
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-muted-foreground ${
        className ?? ""
      }`}
    >
      {children}
    </th>
  );
}
