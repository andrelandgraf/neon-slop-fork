"use client";
import { useState, useTransition } from "react";
import {
  Play,
  PauseCircle,
  RotateCw,
  Trash2,
  Loader2,
  MoreHorizontal,
  Plug,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  startEndpointAction,
  suspendEndpointAction,
  restartEndpointAction,
  deleteEndpointAction,
} from "@/app/actions";
import { EditComputeDialog } from "./edit-compute-dialog";

interface EndpointDTO {
  id: string;
  type: string;
  current_state: string;
  disabled: boolean;
  host: string;
  region_id: string;
  last_active: string | null;
  autoscaling_limit_min_cu: number;
  autoscaling_limit_max_cu: number;
  suspend_timeout_seconds: number;
}

/**
 * Mirrors the "Primary" row card on console.neon.tech's Branch
 * overview → Computes tab: name + status pill, last-active text,
 * size, and a kebab menu of secondary actions. The "Edit" button
 * opens the slider-driven autoscaling drawer.
 */
export function ComputeRow({
  projectId,
  endpoint,
  relativeLastActive,
}: {
  projectId: string;
  endpoint: EndpointDTO;
  relativeLastActive: string;
}) {
  const isPrimary = endpoint.type === "read_write";
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function run(label: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(label);
      else toast.error(res.error);
    });
  }

  const stateBadge =
    endpoint.current_state === "active" ? (
      <Badge variant="muted">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        ACTIVE
      </Badge>
    ) : (
      <Badge variant="muted">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        SUSPENDED
      </Badge>
    );

  const sizeText = `${endpoint.autoscaling_limit_min_cu}${
    endpoint.autoscaling_limit_max_cu !== endpoint.autoscaling_limit_min_cu
      ? `–${endpoint.autoscaling_limit_max_cu}`
      : ""
  } CU`;

  return (
    <Card className="p-4">
      <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold">
              {isPrimary ? "Primary" : "Read replica"}
            </span>
            {stateBadge}
            {endpoint.disabled && <Badge variant="warn">Disabled</Badge>}
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate">
            {endpoint.id}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {endpoint.current_state === "active"
              ? "Last active"
              : "Suspended"}
          </div>
          <div className="text-sm">{relativeLastActive}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Size
          </div>
          <div className="text-sm font-mono">{sizeText}</div>
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Connect dialog lives on the Project dashboard for the moment."
          >
            <Plug className="h-3.5 w-3.5" />
            Connect
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            disabled={pending}
          >
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Compute actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  run("Endpoint started.", () =>
                    startEndpointAction(projectId, endpoint.id)
                  );
                }}
                disabled={pending || endpoint.current_state === "active"}
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Start
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  run("Endpoint suspended.", () =>
                    suspendEndpointAction(projectId, endpoint.id)
                  );
                }}
                disabled={pending || endpoint.current_state !== "active"}
              >
                <PauseCircle className="h-3.5 w-3.5" />
                Suspend
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  run("Endpoint restarting.", () =>
                    restartEndpointAction(projectId, endpoint.id)
                  );
                }}
                disabled={pending}
              >
                <RotateCw className="h-3.5 w-3.5" />
                Restart
              </DropdownMenuItem>
              {!isPrimary && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setDeleteOpen(true);
                  }}
                  disabled={pending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditComputeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        endpoint={endpoint}
        isPrimary={isPrimary}
        onDelete={isPrimary ? undefined : () => setDeleteOpen(true)}
      />
      {!isPrimary && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={() =>
            run("Read replica deleted.", () =>
              deleteEndpointAction(projectId, endpoint.id)
            )
          }
          pending={pending}
        />
      )}
    </Card>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this read replica?</DialogTitle>
          <DialogDescription>
            Any application connected to this replica&apos;s connection
            string will start failing immediately. Read traffic will fall
            back to the primary endpoint (or another replica if you have
            more than one). The branch itself is untouched.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete endpoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
