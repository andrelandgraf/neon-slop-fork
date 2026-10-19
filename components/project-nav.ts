import {
  Activity,
  ArchiveRestore,
  Cable,
  Cpu,
  Database,
  DatabaseZap,
  Folder,
  GitBranch,
  LayoutGrid,
  Puzzle,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareFunction,
  SquareTerminal,
  Table2,
  UserRoundCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ProjectCapabilities } from "@/lib/capabilities";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Path under `/projects/P/branches/B`; `""` is the branch overview. */
  segment: string;
  capability?: keyof ProjectCapabilities;
}

export interface ProjectNavItem {
  label: string;
  icon: LucideIcon;
  /** Path under `/projects/P`. */
  path: string;
}

export const PROJECT_TOP_NAV: (NavItem | ProjectNavItem)[] = [
  { label: "Overview", icon: LayoutGrid, segment: "" },
  { label: "Branches", icon: GitBranch, path: "branches" },
  { label: "Monitoring", icon: Activity, segment: "monitoring" },
  { label: "Integrations", icon: Puzzle, path: "integrations" },
  { label: "Settings", icon: Settings, path: "settings/general" },
];

export const POSTGRES_NAV: NavItem[] = [
  { label: "Tables", icon: Table2, segment: "tables" },
  { label: "SQL Editor", icon: SquareTerminal, segment: "sql-editor" },
  { label: "Backup & Restore", icon: ArchiveRestore, segment: "restore" },
  { label: "Computes", icon: Cpu, segment: "computes" },
  { label: "Realtime", icon: Zap, segment: "realtime", capability: "realtime" },
  { label: "Data API", icon: Cable, segment: "data-api" },
  { label: "Roles", icon: Users, segment: "roles" },
  { label: "Databases", icon: Database, segment: "databases" },
  { label: "Data masking", icon: ShieldCheck, segment: "data-masking" },
];

export const SERVICE_NAV: NavItem[] = [
  { label: "Better Auth", icon: UserRoundCheck, segment: "auth" },
  {
    label: "Object storage",
    icon: Folder,
    segment: "storage",
    capability: "storage",
  },
  {
    label: "Functions",
    icon: SquareFunction,
    segment: "functions",
    capability: "functions",
  },
  {
    label: "AI Gateway",
    icon: Sparkles,
    segment: "ai-gateway",
    capability: "aiGateway",
  },
];

export const POSTGRES_GROUP_ICON = DatabaseZap;

export function isBranchItem(item: NavItem | ProjectNavItem): item is NavItem {
  return "segment" in item;
}

export function navHref(
  item: NavItem | ProjectNavItem,
  projectId: string,
  branchId: string
): string {
  if (isBranchItem(item)) {
    const base = `/projects/${projectId}/branches/${branchId}`;
    return item.segment ? `${base}/${item.segment}` : base;
  }
  return `/projects/${projectId}/${item.path}?branch=${branchId}`;
}

export function isAvailable(
  item: NavItem,
  capabilities: ProjectCapabilities
): boolean {
  return !item.capability || capabilities[item.capability];
}
