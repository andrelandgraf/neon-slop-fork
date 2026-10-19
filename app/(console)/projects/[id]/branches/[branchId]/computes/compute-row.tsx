"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, EllipsisVertical, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionDialog } from "@/components/action-dialog";
import { ConnectDialog } from "@/components/connect/connect-dialog";
import type { ProjectCapabilities } from "@/lib/capabilities";
import { formatCuRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteEndpointAction, restartEndpointAction } from "@/app/actions";
import { EditComputeDialog } from "./edit-compute-dialog";

export interface ComputeEndpoint {
  id: string;
  name: string | null;
  type: string;
  current_state: string;
  started_at: string | null;
  suspended_at: string | null;
  autoscaling_limit_min_cu: number;
  autoscaling_limit_max_cu: number;
  suspend_timeout_seconds: number;
}

/** One compute card on the Computes page, as on console.neon.tech. */
export function ComputeRow({
  projectId,
  branchId,
  endpoint,
  label,
  capabilities,
  sinceLabel,
}: {
  projectId: string;
  branchId: string;
  endpoint: ComputeEndpoint;
  label: string;
  capabilities: ProjectCapabilities;
  sinceLabel: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const active = endpoint.current_state === "active";

  function restart() {
    startTransition(async () => {
      const result = await restartEndpointAction(projectId, endpoint.id);
      if (result.ok) toast.success("Compute is restarting");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center gap-8 rounded-[3px] border border-panel-border px-5 py-4">
      <div className="min-w-[220px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base">{endpoint.name || label}</span>
          <button
            type="button"
            aria-label="Rename compute"
            onClick={() => setEditOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-px font-semibold text-[10px] uppercase",
              active ? "border-primary/40" : "border-panel-border text-muted-foreground"
            )}
          >
            <span className={cn("size-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground")} />
            {active ? "Active" : "Idle"}
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(endpoint.id).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            })
          }
          className="mt-1 flex items-center gap-1.5 font-mono text-muted-foreground text-xs hover:text-foreground"
        >
          {endpoint.id}
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      </div>
      <div>
        <div className="text-muted-foreground text-xs">{active ? "Started" : "Suspended"}</div>
        <div className="text-sm">{sinceLabel}</div>
      </div>
      <div>
        <div className="text-muted-foreground text-xs">Size</div>
        <div className="text-sm">
          {formatCuRange(endpoint.autoscaling_limit_min_cu, endpoint.autoscaling_limit_max_cu)}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ConnectDialog
          projectId={projectId}
          branchId={branchId}
          capabilities={capabilities}
          variant="button"
        />
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Compute actions"
              className="grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-muted"
            >
              <EllipsisVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() =>
                router.push(`/projects/${projectId}/branches/${branchId}/monitoring`)
              }
            >
              Monitor activity
            </DropdownMenuItem>
            <DropdownMenuItem disabled={pending} onSelect={restart}>
              Restart compute
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditComputeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        endpoint={endpoint}
        title={`Edit ${label.toLowerCase()} compute`}
        onDelete={() => {
          setEditOpen(false);
          setDeleteOpen(true);
        }}
      />
      <ActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${endpoint.name || label.toLowerCase()} compute?`}
        description="Applications connected through this compute's connection string start failing immediately. The branch and its data are untouched."
        confirmLabel="Delete"
        destructive
        successMessage="Compute deleted"
        onConfirm={() => deleteEndpointAction(projectId, endpoint.id)}
      />
    </div>
  );
}
