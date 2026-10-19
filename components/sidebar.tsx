"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  CornerDownRight,
  GitBranch,
  Plus,
} from "lucide-react";
import type { ProjectCapabilities } from "@/lib/capabilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  NavLink,
  SidebarFrame,
  useSidebarCollapsed,
} from "@/components/sidebar-frame";
import {
  POSTGRES_GROUP_ICON,
  POSTGRES_NAV,
  PROJECT_TOP_NAV,
  SERVICE_NAV,
  isAvailable,
  navHref,
} from "@/components/project-nav";
import { ConnectDialog } from "@/components/connect/connect-dialog";
import { CreateBranchDialog } from "@/components/create-branch-dialog";

export interface SidebarBranch {
  id: string;
  name: string;
  default: boolean;
}

interface SidebarProps {
  projectId: string;
  projectName: string;
  branches: SidebarBranch[];
  capabilities: ProjectCapabilities;
  orgProjects: { id: string; name: string }[];
}

/**
 * The branch the sidebar is pointed at: the path segment on branch pages,
 * `?branch=` on project-level pages, else the default branch.
 */
export function useCurrentBranchId(branches: SidebarBranch[]): string {
  const params = useParams<{ branchId?: string }>();
  const searchParams = useSearchParams();
  const fromUrl = params.branchId ?? searchParams.get("branch");
  const match = branches.find((b) => b.id === fromUrl);
  return (match ?? branches.find((b) => b.default) ?? branches[0])?.id ?? "";
}

export function Sidebar({
  projectId,
  projectName,
  branches,
  capabilities,
  orgProjects,
}: SidebarProps) {
  const pathname = usePathname();
  const branchId = useCurrentBranchId(branches);
  const [postgresOpen, setPostgresOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const branchBase = `/projects/${projectId}/branches/${branchId}`;

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (path === branchBase) return pathname === branchBase;
    if (path.endsWith("/settings/general")) {
      return pathname.startsWith(`/projects/${projectId}/settings`);
    }
    if (path === `/projects/${projectId}/branches`) return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <SidebarFrame>
      <ProjectSwitcher
        projectId={projectId}
        projectName={projectName}
        branches={branches}
        branchId={branchId}
        orgProjects={orgProjects}
        onCreateBranch={() => setCreateOpen(true)}
      />
      <ConnectDialog
        projectId={projectId}
        branchId={branchId}
        capabilities={capabilities}
      />
      <nav className="mt-3 space-y-0.5">
        {PROJECT_TOP_NAV.map((item) => {
          const href = navHref(item, projectId, branchId);
          return (
            <NavLink
              key={item.label}
              href={href}
              icon={item.icon}
              label={item.label}
              active={isActive(href)}
            />
          );
        })}
      </nav>
      <div className="my-3 border-panel-border border-t" />
      <nav className="space-y-0.5">
        <PostgresGroupToggle
          open={postgresOpen}
          onToggle={() => setPostgresOpen(!postgresOpen)}
        />
        {postgresOpen &&
          POSTGRES_NAV.filter((item) => isAvailable(item, capabilities)).map(
            (item) => {
              const href = navHref(item, projectId, branchId);
              return (
                <NavLink
                  key={item.label}
                  href={href}
                  icon={item.icon}
                  label={item.label}
                  active={isActive(href)}
                  indent
                />
              );
            }
          )}
        {SERVICE_NAV.filter((item) => isAvailable(item, capabilities)).map(
          (item) => {
            const href = navHref(item, projectId, branchId);
            return (
              <NavLink
                key={item.label}
                href={href}
                icon={item.icon}
                label={item.label}
                active={isActive(href)}
              />
            );
          }
        )}
      </nav>
      <CreateBranchDialog
        projectId={projectId}
        branches={branches}
        defaultParentId={branchId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </SidebarFrame>
  );
}

function PostgresGroupToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const collapsed = useSidebarCollapsed();
  const Icon = POSTGRES_GROUP_ICON;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={collapsed ? "Postgres database" : undefined}
      className={cn(
        "flex h-7 w-full items-center gap-2.5 rounded-[3px] px-3.5 text-nav-foreground text-sm hover:bg-nav-active/60 hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="whitespace-nowrap">Postgres database</span>
          <ChevronDown
            className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
          />
        </>
      )}
    </button>
  );
}

function ProjectSwitcher({
  projectId,
  projectName,
  branches,
  branchId,
  orgProjects,
  onCreateBranch,
}: {
  projectId: string;
  projectName: string;
  branches: SidebarBranch[];
  branchId: string;
  orgProjects: { id: string; name: string }[];
  onCreateBranch: () => void;
}) {
  const collapsed = useSidebarCollapsed();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branch = branches.find((b) => b.id === branchId);
  const branchesPrefix = `/projects/${projectId}/branches/`;

  function switchBranch(nextId: string) {
    if (pathname.startsWith(branchesPrefix)) {
      const rest = pathname.slice(branchesPrefix.length).split("/").slice(1);
      router.push([`${branchesPrefix}${nextId}`, ...rest].join("/"));
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.set("branch", nextId);
    router.push(`${pathname}?${params}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-[3px] border border-panel-border bg-panel px-2.5 py-1.5 text-left hover:border-foreground/30",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <GitBranch className="size-4" />
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-muted-foreground text-xs">
                  {projectName}
                </div>
                <div className="flex items-center gap-1 font-semibold text-sm">
                  <CornerDownRight className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{branch?.name}</span>
                </div>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Projects</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 w-[240px] overflow-y-auto">
            {orgProjects.map((p) => (
              <DropdownMenuItem key={p.id} asChild>
                <Link href={`/projects/${p.id}`}>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === projectId && <Check className="size-3.5" />}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/projects">All projects</Link>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
          Branches
        </DropdownMenuLabel>
        <div className="max-h-64 overflow-y-auto">
          {branches.map((b) => (
            <DropdownMenuItem key={b.id} onSelect={() => switchBranch(b.id)}>
              <GitBranch className="size-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{b.name}</span>
              {b.default && <Badge variant="secondary">Default</Badge>}
              {b.id === branchId && <Check className="size-3.5" />}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/projects/${projectId}/branches?branch=${branchId}`}>
            Manage branches ({branches.length})
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCreateBranch}>
          <Plus className="size-3.5" />
          Create branch
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

