"use client";
import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBranchAction } from "@/app/actions";

interface BranchOpt {
  id: string;
  name: string;
  default: boolean;
}

type DataMode = "current" | "past" | "schema_only";

interface TtlOption {
  label: string;
  seconds: number;
}

const TTL_OPTIONS: TtlOption[] = [
  { label: "1 hour", seconds: 60 * 60 },
  { label: "1 day", seconds: 24 * 60 * 60 },
  { label: "7 days", seconds: 7 * 24 * 60 * 60 },
];

/**
 * Modal that mirrors the real Neon console's "Create new branch"
 * panel: parent branch selector, optional name, optional TTL with
 * preset durations, plus radio cards for the data option (Current /
 * Past / Schema-only / Anonymized).
 *
 * Two of the four data options on neon.com are Beta and rely on
 * features we can't drive through the public API:
 *
 *  - **Schema only** is plumbed (the public API accepts `init_source:
 *    schema-only`), but plan limits typically reject it on Free.
 *  - **Anonymized data** depends on Neon Data Masking, which has no
 *    public REST surface. We render the card greyed-out + with a
 *    `disabled` radio so the UI shape matches but the user can't
 *    select it.
 */
export function CreateBranchDialog({
  projectId,
  branches,
}: {
  projectId: string;
  branches: BranchOpt[];
}) {
  const [open, setOpen] = useState(false);
  const defaultParentId =
    branches.find((b) => b.default)?.id ?? branches[0]?.id ?? "";
  const [parentId, setParentId] = useState(defaultParentId);
  const [name, setName] = useState("");
  const [ttlEnabled, setTtlEnabled] = useState(false);
  const [ttlSeconds, setTtlSeconds] = useState(TTL_OPTIONS[1].seconds);
  const [dataMode, setDataMode] = useState<DataMode>("current");
  const [pastTimestamp, setPastTimestamp] = useState(() =>
    defaultPastIso()
  );
  const [pending, startTransition] = useTransition();

  function reset() {
    setParentId(defaultParentId);
    setName("");
    setTtlEnabled(false);
    setTtlSeconds(TTL_OPTIONS[1].seconds);
    setDataMode("current");
    setPastTimestamp(defaultPastIso());
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("name", name.trim());
    fd.set("parentId", parentId);
    fd.set("dataMode", dataMode);
    if (dataMode === "past") fd.set("pastTimestamp", pastTimestamp);
    if (ttlEnabled) {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      fd.set("expiresAt", expiresAt);
    }
    startTransition(async () => {
      const res = await createBranchAction(fd);
      if (res.ok) {
        toast.success("Branch creating…");
        setOpen(false);
        reset();
      } else {
        const friendly = friendlyError(res.error);
        toast.error(friendly);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New branch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create new branch</DialogTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Parent branch{" "}
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="inline-flex h-7 rounded-md border bg-background px-2 text-xs font-mono"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.default ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input
                id="branch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., a feature, environment, or developer name"
                maxLength={256}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ttlEnabled}
                  onChange={(e) => setTtlEnabled(e.target.checked)}
                />
                <span className="font-medium">
                  Automatically delete branch after:
                </span>
              </label>
              <select
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(Number(e.target.value))}
                disabled={!ttlEnabled}
                className="flex h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {TTL_OPTIONS.map((o) => (
                  <option key={o.seconds} value={o.seconds}>
                    {o.label}
                  </option>
                ))}
              </select>
              {ttlEnabled && (
                <p className="text-[11px] text-muted-foreground">
                  Branch will expire around{" "}
                  <span className="font-mono">
                    {new Date(Date.now() + ttlSeconds * 1000).toLocaleString()}
                  </span>
                  . Auto-delete is a Neon Early Access feature; the upstream
                  may reject it on your plan.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <DataOptionCard
                label="Current data"
                description="Include data from the parent branch up to this moment."
                selected={dataMode === "current"}
                onClick={() => setDataMode("current")}
              />
              <DataOptionCard
                label="Past data"
                description="Include data from the parent branch up to a specific date and time."
                selected={dataMode === "past"}
                onClick={() => setDataMode("past")}
              >
                {dataMode === "past" && (
                  <div className="mt-2 space-y-1">
                    <Input
                      type="datetime-local"
                      value={pastTimestamp}
                      onChange={(e) => setPastTimestamp(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                    <div className="text-[10px] text-muted-foreground">
                      Must fall within the project&apos;s history retention
                      window.
                    </div>
                  </div>
                )}
              </DataOptionCard>
              <DataOptionCard
                label="Schema only"
                description="Copy the schema only — no data will be included."
                badge="Beta"
                selected={dataMode === "schema_only"}
                onClick={() => setDataMode("schema_only")}
              />
              <DataOptionCard
                label="Anonymized data"
                description="Protect sensitive data with configurable masking rules."
                badge="Beta"
                disabled
                disabledReason="Anonymized branches require Neon Data Masking, which isn't exposed through the public REST API."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pending ? "Forking…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DataOptionCard({
  label,
  description,
  badge,
  selected,
  disabled,
  disabledReason,
  onClick,
  children,
}: {
  label: string;
  description: string;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={`relative text-left rounded-md border px-3 py-2.5 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : disabled
            ? "border-border opacity-55 cursor-not-allowed"
            : "border-border hover:bg-muted"
      }`}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <span
          className={`inline-block h-3 w-3 rounded-full border ${
            selected ? "border-primary bg-primary" : "border-muted-foreground/40"
          }`}
          aria-hidden
        />
        {label}
        {badge && <Badge variant="muted">{badge}</Badge>}
      </div>
      <p className="ml-[18px] mt-1 text-[11px] text-muted-foreground leading-snug">
        {description}
      </p>
      {children && <div className="ml-[18px]">{children}</div>}
    </button>
  );
}

function defaultPastIso(): string {
  // 5 minutes ago, formatted for <input type="datetime-local"> (no
  // timezone suffix). The server normalizes to ISO/UTC.
  const d = new Date(Date.now() - 5 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function friendlyError(error: string): string {
  if (/early access|EARLY_ACCESS/i.test(error)) {
    return "Branch auto-delete (expires_at) is in Neon Early Access — your account isn’t enrolled.";
  }
  if (/init_source|schema-only/i.test(error)) {
    return "Schema-only branches aren’t enabled on this project.";
  }
  if (/restore window|parent_timestamp/i.test(error)) {
    return "Past-data timestamp must fall inside the project's history retention window.";
  }
  return error;
}
