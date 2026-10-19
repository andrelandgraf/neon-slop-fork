"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  GitBranch,
  LayoutGrid,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Puzzle,
  Search,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { useTheme } from "@/components/theme-provider";
import type { ProjectCapabilities } from "@/lib/capabilities";
import {
  POSTGRES_NAV,
  PROJECT_TOP_NAV,
  SERVICE_NAV,
  isAvailable,
  isBranchItem,
  navHref,
} from "@/components/project-nav";
import { useCurrentBranchId, type SidebarBranch } from "@/components/sidebar";

interface Command {
  id: string;
  group: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

export interface CommandBarProject {
  id: string;
  name: string;
  branches: SidebarBranch[];
  capabilities: ProjectCapabilities;
}

export function CommandBar({ project }: { project?: CommandBarProject }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="flex h-7 w-[220px] items-center gap-2 rounded-[3px] border border-panel-border bg-panel px-2.5 text-muted-foreground text-sm hover:border-foreground/30"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="font-sans text-xs">⌘K</kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[64px] left-1/2 z-50 w-[560px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-[4px] border border-panel-border bg-panel shadow-xl"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          {open &&
            (project ? (
              <ProjectCommands project={project} onDone={() => setOpen(false)} />
            ) : (
              <CommandList commands={[]} onDone={() => setOpen(false)} />
            ))}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ProjectCommands({
  project,
  onDone,
}: {
  project: CommandBarProject;
  onDone: () => void;
}) {
  const router = useRouter();
  const branchId = useCurrentBranchId(project.branches);
  const branchName = project.branches.find((b) => b.id === branchId)?.name ?? "";

  const commands = useMemo(() => {
    const go = (href: string) => () => router.push(href);
    const branchItems = [...PROJECT_TOP_NAV.filter(isBranchItem), ...POSTGRES_NAV, ...SERVICE_NAV]
      .filter((item) => isAvailable(item, project.capabilities))
      .map((item) => ({
        id: `branch-${item.label}`,
        group: `${branchName} — Branch`,
        label: item.label,
        icon: item.icon,
        run: go(navHref(item, project.id, branchId)),
      }));
    const projectItems = PROJECT_TOP_NAV.filter((item) => !isBranchItem(item)).map(
      (item) => ({
        id: `project-${item.label}`,
        group: `${project.name} — Project`,
        label: item.label,
        icon: item.icon,
        run: go(navHref(item, project.id, branchId)),
      })
    );
    return [
      ...branchItems,
      {
        id: "project-create-branch",
        group: `${project.name} — Project`,
        label: "Create branch",
        icon: GitBranch,
        run: go(`/projects/${project.id}/branches?branch=${branchId}&modal=create_branch`),
      },
      ...projectItems,
    ];
  }, [router, project, branchId, branchName]);

  return <CommandList commands={commands} onDone={onDone} />;
}

function CommandList({
  commands: contextCommands,
  onDone,
}: {
  commands: Command[];
  onDone: () => void;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const commands = useMemo(() => {
    const go = (href: string) => () => router.push(href);
    const org: Command[] = [
      { id: "org-projects", group: "Organization", label: "Projects", icon: LayoutGrid, run: go("/projects") },
      { id: "org-new", group: "Organization", label: "New project", icon: Plus, run: go("/projects?modal=create_project") },
      { id: "org-people", group: "Organization", label: "People", icon: Users, run: go("/org/people") },
      { id: "org-billing", group: "Organization", label: "Billing", icon: CreditCard, run: go("/org/billing") },
      { id: "org-integrations", group: "Organization", label: "Integrations", icon: Puzzle, run: go("/org/integrations") },
      { id: "org-settings", group: "Organization", label: "Settings", icon: Building2, run: go("/org/settings") },
    ];
    const account: Command[] = [
      { id: "theme-light", group: "Account", label: "Switch to light theme", icon: Sun, run: () => setTheme("light") },
      { id: "theme-dark", group: "Account", label: "Switch to dark theme", icon: Moon, run: () => setTheme("dark") },
      { id: "theme-system", group: "Account", label: "Use system theme", icon: Monitor, run: () => setTheme("system") },
      {
        id: "logout",
        group: "Account",
        label: "Log out",
        icon: LogOut,
        run: () => {
          signOut().then(() => {
            router.push("/");
            router.refresh();
          });
        },
      },
    ];
    return [...contextCommands, ...org, ...account];
  }, [contextCommands, router, setTheme]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? commands.filter((c) => `${c.label} ${c.group}`.toLowerCase().includes(needle))
    : commands;
  const active = Math.min(index, Math.max(visible.length - 1, 0));

  function runCommand(command: Command | undefined) {
    if (!command) return;
    onDone();
    command.run();
  }

  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex(Math.min(active + 1, visible.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex(Math.max(active - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            runCommand(visible[active]);
          }
        }}
        placeholder="Search for anything..."
        className="h-11 w-full border-panel-border border-b bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="max-h-[360px] overflow-y-auto py-1" role="listbox">
        {visible.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground text-sm">
            No results
          </div>
        )}
        {visible.map((command, i) => {
          const showGroup = i === 0 || visible[i - 1]?.group !== command.group;
          const Icon = command.icon;
          return (
            <div key={command.id}>
              {showGroup && (
                <div className="px-3 pt-2 pb-1 text-muted-foreground text-xs">
                  {command.group}
                </div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setIndex(i)}
                onClick={() => runCommand(command)}
                className={cn(
                  "flex h-8 w-full items-center gap-2 px-3 text-left text-sm",
                  i === active && "bg-muted"
                )}
              >
                <Icon className="size-4 text-muted-foreground" />
                {command.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

