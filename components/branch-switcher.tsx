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
        <button className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          <span className="flex items-center gap-1.5 truncate font-mono text-xs">
            <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate">{active?.name ?? "—"}</span>
          </span>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
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
                className={`h-3.5 w-3.5 ${isActive ? "opacity-100" : "opacity-0"}`}
              />
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-xs flex-1 truncate">{b.name}</span>
              {b.default && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
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
            <Plus className="h-3.5 w-3.5" />
            <span>Manage branches</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
