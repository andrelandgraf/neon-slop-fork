"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronsUpDown, Check, GitBranch, Plus } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Branch {
  id: string;
  name: string;
  default: boolean;
}

export function BranchSwitcher({
  projectId,
  branches,
  defaultBranchId,
}: {
  projectId: string;
  branches: Branch[];
  defaultBranchId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("branch");
  const activeId = selected ?? defaultBranchId;
  const active = branches.find((b) => b.id === activeId) ?? branches[0];

  function selectBranch(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    const def = branches.find((b) => b.default);
    if (def && id === def.id) {
      params.delete("branch");
    } else {
      params.set("branch", id);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-md border border-border/60 bg-card px-2 py-1.5 text-sm transition-colors hover:border-border hover:bg-sidebar-accent">
          <span className="flex items-center gap-1.5 truncate font-mono text-xs">
            <GitBranch className="size-3 shrink-0 text-primary" />
            <span className="truncate">{active?.name ?? "—"}</span>
          </span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        <DropdownMenuLabel>Branches</DropdownMenuLabel>
        {branches.map((b) => {
          const isActive = b.id === active?.id;
          return (
            <DropdownMenuItem
              key={b.id}
              onSelect={() => selectBranch(b.id)}
              className="flex items-center gap-2"
            >
              <Check
                className={`size-3.5 text-primary ${isActive ? "opacity-100" : "opacity-0"}`}
              />
              <GitBranch className="size-3.5 text-muted-foreground" />
              <span className="flex-1 truncate font-mono text-xs">{b.name}</span>
              {b.default && (
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  default
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={`/projects/${projectId}/branches`}
            className="flex items-center gap-2"
          >
            <Plus className="size-3.5" />
            <span>Manage branches</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
