"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  createBranchAction,
  type BranchDataMode,
} from "@/lib/branches/actions";

const HOUR = 60 * 60 * 1000;
const AUTO_DELETE = [
  { value: "never", label: "Never", ms: null },
  { value: "1h", label: "After 1 hour", ms: HOUR },
  { value: "1d", label: "After 1 day", ms: 24 * HOUR },
  { value: "7d", label: "After 7 days", ms: 7 * 24 * HOUR },
  { value: "custom", label: "Custom (up to 30 days)", ms: null },
] as const;

type AutoDelete = (typeof AUTO_DELETE)[number]["value"];

const DATA_MODES: {
  value: BranchDataMode;
  label: string;
  description: string;
  beta?: boolean;
}[] = [
  {
    value: "current",
    label: "Branch data and schema",
    description: "Include data from the parent branch up to this moment.",
  },
  {
    value: "past",
    label: "Branch data and schema from a past point in time",
    description: "Include data from the parent branch up to a specific date and time.",
  },
  {
    value: "schema_only",
    label: "Branch schema only",
    description: "Copy the schema only — no data will be included.",
    beta: true,
  },
  {
    value: "anonymized",
    label: "Branch & anonymize data",
    description: "Protect sensitive data with configurable masking rules.",
    beta: true,
  },
];

function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CreateBranchDialog({
  projectId,
  branches,
  defaultParentId,
  defaultMode = "current",
  open,
  onOpenChange,
}: {
  projectId: string;
  branches: { id: string; name: string; default: boolean }[];
  defaultParentId?: string;
  defaultMode?: BranchDataMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-[480px] gap-0 p-0">
        <CreateBranchForm
          projectId={projectId}
          branches={branches}
          defaultParentId={defaultParentId}
          defaultMode={defaultMode}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Mounted fresh on every open, so it always starts from the current parent. */
function CreateBranchForm({
  projectId,
  branches,
  defaultParentId,
  defaultMode,
  onClose,
}: {
  projectId: string;
  branches: { id: string; name: string; default: boolean }[];
  defaultParentId?: string;
  defaultMode: BranchDataMode;
  onClose: () => void;
}) {
  const router = useRouter();
  const fallbackParent =
    defaultParentId ?? branches.find((b) => b.default)?.id ?? branches[0]?.id ?? "";
  const [name, setName] = useState("");
  const [autoDelete, setAutoDelete] = useState<AutoDelete>("1d");
  const [customExpiry, setCustomExpiry] = useState(() =>
    toLocalInput(new Date(Date.now() + 3 * 24 * HOUR))
  );
  const [parentId, setParentId] = useState(fallbackParent);
  const [mode, setMode] = useState<BranchDataMode>(defaultMode);
  const [pastTime, setPastTime] = useState(() =>
    toLocalInput(new Date(Date.now() - HOUR))
  );
  const [pending, startTransition] = useTransition();

  function expiresAt(): string | undefined {
    if (autoDelete === "custom") return new Date(customExpiry).toISOString();
    const option = AUTO_DELETE.find((o) => o.value === autoDelete);
    return option?.ms ? new Date(Date.now() + option.ms).toISOString() : undefined;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const result = await createBranchAction({
        projectId,
        name,
        parentId,
        dataMode: mode,
        parentTimestamp: mode === "past" ? new Date(pastTime).toISOString() : undefined,
        expiresAt: expiresAt(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onClose();
      const page = mode === "anonymized" ? "/data-masking" : "";
      router.push(
        `/projects/${projectId}/branches/${result.branchId}${page}?created=${result.elapsedMs}`
      );
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader className="border-panel-border border-b px-5 py-4">
        <DialogTitle>Create new branch</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm">
          Any new branch is created instantly and only uses storage when you
          make changes.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="branch-name">Name</Label>
          <Input
            id="branch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="git branch, feature name, etc"
            maxLength={256}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="branch-auto-delete">Auto-delete</Label>
          <NativeSelect
            id="branch-auto-delete"
            value={autoDelete}
            onChange={(e) => {
              const next = AUTO_DELETE.find((o) => o.value === e.target.value);
              if (next) setAutoDelete(next.value);
            }}
          >
            {AUTO_DELETE.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
          {autoDelete === "custom" && (
            <Input
              type="datetime-local"
              value={customExpiry}
              min={toLocalInput(new Date())}
              max={toLocalInput(new Date(Date.now() + 30 * 24 * HOUR))}
              onChange={(e) => setCustomExpiry(e.target.value)}
              required
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="branch-parent">Parent branch</Label>
          <NativeSelect
            id="branch-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <fieldset className="space-y-3 pt-1">
          {DATA_MODES.map((option) => (
            <label key={option.value} className="flex cursor-pointer gap-2.5">
              <input
                type="radio"
                name="data-mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
                className="mt-0.5 size-4 accent-foreground"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-semibold text-sm">
                  {option.label}
                  {option.beta && (
                    <Badge className="bg-primary/20 text-foreground">Beta</Badge>
                  )}
                </span>
                <span className="block text-muted-foreground text-xs">
                  {option.description}
                </span>
                {option.value === "past" && mode === "past" && (
                  <Input
                    type="datetime-local"
                    value={pastTime}
                    max={toLocalInput(new Date())}
                    onChange={(e) => setPastTime(e.target.value)}
                    className="mt-2"
                    required
                  />
                )}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <DialogFooter className="px-5 pb-5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !parentId}>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Create
        </Button>
      </DialogFooter>
    </form>
  );
}
