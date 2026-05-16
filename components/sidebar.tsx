"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  GitBranch,
  Settings,
  ChevronsUpDown,
  Eye,
  Activity,
  Terminal,
  TableProperties,
  History,
  ShieldCheck,
  Database,
  Lock,
  PanelLeftClose,
  KeySquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Mock } from "@/components/ui/mock";
import { BranchSwitcher } from "@/components/branch-switcher";

interface SidebarProps {
  projectId: string;
  projectName: string;
  branches: { id: string; name: string; default: boolean }[];
  defaultBranchId: string;
}

export function Sidebar({
  projectId,
  projectName,
  branches,
  defaultBranchId,
}: SidebarProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  const project = [
    { href: base, label: "Dashboard", icon: LayoutGrid },
    { href: `${base}/branches`, label: "Branches", icon: GitBranch },
    { href: `${base}/integrations`, label: "Integrations", icon: KeySquare, disabled: true },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  const branch = [
    { href: `${base}/overview`, label: "Overview", icon: Eye, disabled: true },
    { href: `${base}/monitoring`, label: "Monitoring", icon: Activity },
    { href: `${base}/sql`, label: "SQL Editor", icon: Terminal },
    { href: `${base}/tables`, label: "Tables", icon: TableProperties },
    { href: `${base}/backup`, label: "Backup & Restore", icon: History },
    { href: `${base}/masking`, label: "Data Masking", icon: ShieldCheck, beta: true, disabled: true },
  ];

  const appBackend = [
    { href: `${base}/data-api`, label: "Data API", icon: Database, disabled: true },
    { href: `${base}/auth`, label: "Auth", icon: Lock, disabled: true },
  ];

  return (
    <aside className="w-[240px] shrink-0 border-r bg-background flex flex-col h-[calc(100vh-3.5rem)] sticky top-14">
      <div className="p-3 border-b">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted mb-2"
        >
          <span aria-hidden>←</span> All projects
        </Link>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
          Project
        </div>
        <Mock label="Project switcher is mocked">
          <button className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
            <span className="truncate font-mono text-xs">{projectName}</span>
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </button>
        </Mock>
        <nav className="mt-2 space-y-0.5">
          {project.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} />
          ))}
        </nav>
      </div>

      <div className="p-3 border-b">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
          Branch
        </div>
        <BranchSwitcher
          projectId={projectId}
          branches={branches}
          defaultBranchId={defaultBranchId}
        />
        <nav className="mt-2 space-y-0.5">
          {branch.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} />
          ))}
        </nav>
      </div>

      <div className="p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
          App Backend
        </div>
        <nav className="space-y-0.5">
          {appBackend.map((item) => (
            <NavItem
              key={item.label}
              {...item}
              active={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              }
            />
          ))}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t flex flex-col gap-1">
        <Mock>
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted w-full">
            <span>💬</span>
            Feedback
          </button>
        </Mock>
        <Mock>
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted w-full">
            <PanelLeftClose className="h-4 w-4" />
            Collapse menu
          </button>
        </Mock>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  disabled,
  beta,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  beta?: boolean;
}) {
  const content = (
    <>
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      {beta && (
        <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          BETA
        </span>
      )}
    </>
  );

  const className = cn(
    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm w-full",
    active && "bg-muted font-medium",
    !active && !disabled && "hover:bg-muted",
    disabled && "text-muted-foreground/45 cursor-not-allowed"
  );

  if (disabled) {
    return (
      <div className={className} title="Not implemented in this clone" aria-disabled="true">
        {content}
      </div>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
