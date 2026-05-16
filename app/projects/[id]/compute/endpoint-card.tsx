"use client";
import { useState, useTransition } from "react";
import {
  Cpu,
  Play,
  PauseCircle,
  RotateCw,
  Trash2,
  Loader2,
  MoreHorizontal,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeTime } from "@/lib/utils";
import {
  startEndpointAction,
  suspendEndpointAction,
  restartEndpointAction,
  deleteEndpointAction,
  updateEndpointAutoscalingAction,
} from "@/app/actions";

interface EndpointDTO {
  id: string;
  type: string;
  current_state: string;
  disabled: boolean;
  host: string;
  region_id: string;
  pooler_enabled: boolean;
  pooler_mode: string | null;
  last_active: string | null;
  autoscaling_limit_min_cu: number;
  autoscaling_limit_max_cu: number;
  suspend_timeout_seconds: number;
}

export function EndpointCard({
  projectId,
  endpoint,
  deletable,
}: {
  projectId: string;
  endpoint: EndpointDTO;
  deletable: boolean;
}) {
  const isPrimary = endpoint.type === "read_write";
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function run(
    label: string,
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>
  ) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(label);
      else toast.error(res.error);
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">
              {isPrimary ? "Primary (read/write)" : "Read replica"}
            </span>
            <Badge variant="muted">
              {endpoint.current_state === "active" ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  Idle
                </>
              )}
            </Badge>
            {endpoint.disabled && <Badge variant="warn">Disabled</Badge>}
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate">
            {endpoint.id} · {endpoint.host}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              run("Endpoint started.", () =>
                startEndpointAction(projectId, endpoint.id)
              )
            }
            disabled={pending || endpoint.current_state === "active"}
          >
            {pending && endpoint.current_state !== "active" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Start
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              run("Endpoint suspended.", () =>
                suspendEndpointAction(projectId, endpoint.id)
              )
            }
            disabled={pending || endpoint.current_state !== "active"}
          >
            {pending && endpoint.current_state === "active" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PauseCircle className="h-3.5 w-3.5" />
            )}
            Suspend
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Endpoint actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
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
              {deletable && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setDeleteOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete endpoint
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <ReadOnlyField label="Region">{endpoint.region_id}</ReadOnlyField>
        <ReadOnlyField label="Pooler">
          {endpoint.pooler_enabled
            ? `enabled (${endpoint.pooler_mode ?? "transaction"})`
            : "disabled"}
        </ReadOnlyField>
        <ReadOnlyField label="Last active">
          {endpoint.last_active ? relativeTime(endpoint.last_active) : "—"}
        </ReadOnlyField>
      </div>

      <AutoscalingEditor projectId={projectId} endpoint={endpoint} />

      <DeleteEndpointDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={projectId}
        endpointId={endpoint.id}
      />
    </Card>
  );
}

function AutoscalingEditor({
  projectId,
  endpoint,
}: {
  projectId: string;
  endpoint: EndpointDTO;
}) {
  const [minCu, setMinCu] = useState(endpoint.autoscaling_limit_min_cu);
  const [maxCu, setMaxCu] = useState(endpoint.autoscaling_limit_max_cu);
  const [suspendSeconds, setSuspendSeconds] = useState(
    endpoint.suspend_timeout_seconds
  );
  const [pending, startTransition] = useTransition();

  const dirty =
    minCu !== endpoint.autoscaling_limit_min_cu ||
    maxCu !== endpoint.autoscaling_limit_max_cu ||
    suspendSeconds !== endpoint.suspend_timeout_seconds;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateEndpointAutoscalingAction(fd);
      if (res.ok) toast.success("Autoscaling updated.");
      else toast.error(res.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="endpointId" value={endpoint.id} />
      <CuField
        label="Min CU"
        name="minCu"
        value={minCu}
        onChange={(v) => setMinCu(v)}
      />
      <CuField
        label="Max CU"
        name="maxCu"
        value={maxCu}
        onChange={(v) => setMaxCu(v)}
      />
      <NumberField
        label="Suspend after (s)"
        name="suspendSeconds"
        value={suspendSeconds}
        onChange={(v) => setSuspendSeconds(v)}
        step={60}
        min={0}
        hint="0 = never"
      />
      <Button
        type="submit"
        size="sm"
        variant={dirty ? "default" : "outline"}
        disabled={pending || !dirty}
        className="mb-[2px]"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Save
      </Button>
    </form>
  );
}

function ReadOnlyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm">{children}</div>
    </div>
  );
}

const CU_VALUES = [0.25, 0.5, 1, 2, 3, 4, 6, 7, 8, 10, 14] as const;

function CuField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (next: number) => void;
}) {
  // The Neon control plane will reject anything outside its supported
  // CU set; keeping it as a select stops users from saving an
  // arbitrary float and getting a 400 back.
  return (
    <label className="flex flex-col gap-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-md border bg-background px-2 text-sm font-mono"
      >
        {CU_VALUES.map((cu) => (
          <option key={cu} value={cu}>
            {cu}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
  step,
  min,
  hint,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {hint && (
          <span className="ml-1 text-muted-foreground/70 normal-case font-normal tracking-normal">
            ({hint})
          </span>
        )}
      </Label>
      <input
        type="number"
        name={name}
        value={value}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-md border bg-background px-2 text-sm font-mono"
      />
    </label>
  );
}

function DeleteEndpointDialog({
  open,
  onOpenChange,
  projectId,
  endpointId,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  projectId: string;
  endpointId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteEndpointAction(projectId, endpointId);
      if (res.ok) {
        toast.success("Read replica deleted.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

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
            onClick={handleDelete}
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
