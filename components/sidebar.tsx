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
  Plug,
  HardDrive,
  KeyRound,
  Sparkles,
  SquareFunction,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
    {
      href: `${base}/integrations`,
      label: "Integrations",
      icon: Plug,
    },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  const branch = [
    { href: `${base}/overview`, label: "Overview", icon: Eye },
    { href: `${base}/monitoring`, label: "Monitoring", icon: Activity },
    { href: `${base}/sql`, label: "SQL Editor", icon: Terminal },
    { href: `${base}/tables`, label: "Tables", icon: TableProperties },
    { href: `${base}/backup`, label: "Backup & Restore", icon: History },
    {
      href: `${base}/masking`,
      label: "Data Masking",
      icon: ShieldCheck,
      beta: true,
    },
  ];

  const appBackend = [
    {
      href: `${base}/data-api`,
      label: "Data API",
      icon: Database,
    },
    {
      href: `${base}/auth`,
      label: "Auth",
      icon: Lock,
      beta: true,
    },
    {
      href: `${base}/storage`,
      label: "Storage",
      icon: HardDrive,
      beta: true,
    },
    {
      href: `${base}/credentials`,
      label: "Credentials",
      icon: KeyRound,
      beta: true,
    },
    {
      href: `${base}/ai-gateway`,
      label: "AI Gateway",
      icon: Sparkles,
      beta: true,
    },
    {
      href: `${base}/functions`,
      label: "Functions",
      icon: SquareFunction,
      beta: true,
    },
  ];

  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-[240px] shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-3">
        <Link
          href="/projects"
          className="mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <ArrowLeft className="size-3" />
          All projects
        </Link>
        <SectionLabel>Project</SectionLabel>
        <button
          type="button"
          disabled
          title="Use the topbar org switcher to change orgs; this project label is informational."
          className="flex w-full cursor-not-allowed items-center justify-between rounded-md px-2 py-1.5 text-sm"
        >
          <span className="truncate font-mono text-xs">{projectName}</span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </button>
        <nav className="mt-2 space-y-0.5">
          {project.map((item) => (
            <NavItem
              key={item.label}
              {...item}
              active={pathname === item.href}
            />
          ))}
        </nav>
      </div>

      <div className="border-b border-sidebar-border p-3">
        <SectionLabel>Branch</SectionLabel>
        <BranchSwitcher
          projectId={projectId}
          branches={branches}
          defaultBranchId={defaultBranchId}
        />
        <nav className="mt-2 space-y-0.5">
          {branch.map((item) => (
            <NavItem
              key={item.label}
              {...item}
              active={pathname === item.href}
            />
          ))}
        </nav>
      </div>

      <div className="p-3">
        <SectionLabel>App Backend</SectionLabel>
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

      <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border p-3">
        <button
          type="button"
          disabled
          title="Feedback is not collected by this clone — open an issue on the GitHub repo instead."
          className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground"
        >
          <MessageSquare className="size-4" />
          Feedback
        </button>
        <button
          type="button"
          disabled
          title="Sidebar collapse isn’t wired in this clone."
          className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground"
        >
          <PanelLeftClose className="size-4" />
          Collapse menu
        </button>
      </div>
    </aside>
  );
}

/** Mono micro-label that opens each sidebar group, per the neon-ui type scale. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  disabled,
  beta,
  disabledReason,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  beta?: boolean;
  disabledReason?: string;
}) {
  const content = (
    <>
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {beta && (
        <Badge
          variant="outline"
          className="h-4 border-primary/30 px-1.5 font-mono text-[9px] uppercase tracking-wide text-primary"
        >
          Beta
        </Badge>
      )}
    </>
  );

  const className = cn(
    "relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
    active &&
      "bg-sidebar-accent font-medium text-sidebar-primary before:absolute before:top-1/2 before:left-0 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary",
    !active &&
      !disabled &&
      "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    disabled && "cursor-not-allowed text-muted-foreground/45"
  );

  if (disabled) {
    return (
      <div
        className={className}
        title={disabledReason ?? "Not available in this clone."}
        aria-disabled="true"
      >
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
