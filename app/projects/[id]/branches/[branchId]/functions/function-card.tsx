"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CirclePlus, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionDialog } from "@/components/action-dialog";
import { CopyAction } from "@/components/code-panel";
import { cn } from "@/lib/utils";
import {
  createTriggerAction,
  deleteFunctionAction,
  deleteTriggerAction,
  registerCustomDomainAction,
  updateTriggerAction,
  type TriggerInput,
} from "@/lib/functions/actions";

export interface FunctionTrigger {
  id: string;
  name: string;
  type: "schedule" | "storage_object_created";
  functionPath: string;
  cron?: string;
  bucketName?: string;
  prefix?: string;
  enabled: boolean;
  inherited: boolean;
  nextRunAt: string | null;
}

export interface FunctionSummary {
  slug: string;
  status: string;
  lastDeployed: string | null;
  invocationUrl: string;
  triggers: FunctionTrigger[];
  domains: { domain: string; status?: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  building: "Building",
  failed: "Failed",
};

export function FunctionCard({
  projectId,
  branchId,
  fn,
}: {
  projectId: string;
  branchId: string;
  fn: FunctionSummary;
}) {
  const router = useRouter();
  const [triggerDialog, setTriggerDialog] = useState<FunctionTrigger | "new" | null>(null);
  const [domainOpen, setDomainOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const logsHref = `/projects/${projectId}/branches/${branchId}/monitoring?tab=functions&service_name=${encodeURIComponent(fn.slug)}&service_name_match=exact`;

  return (
    <div className="rounded-[3px] border border-panel-border px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold">{fn.slug}</span>
        <span className="flex items-center gap-1 rounded-full border border-panel-border px-1.5 py-px text-xs">
          <span
            className={cn(
              "size-1.5 rounded-full",
              fn.status === "completed" ? "bg-primary" : fn.status === "failed" ? "bg-destructive" : "bg-amber-500"
            )}
          />
          {STATUS_LABEL[fn.status] ?? fn.status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Last deployed</dt>
        <dd>
          {fn.lastDeployed
            ? new Date(fn.lastDeployed).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })
            : "—"}
        </dd>
        <dt className="text-muted-foreground">Invocation URL</dt>
        <dd className="flex items-center gap-2">
          <span className="truncate">{fn.invocationUrl}</span>
          <CopyAction text={fn.invocationUrl} label="Copy invocation URL" iconOnly />
          <a href={fn.invocationUrl} target="_blank" rel="noreferrer" className="text-link" aria-label="Open">
            <ExternalLink className="size-3.5" />
          </a>
        </dd>
        <dt className="text-muted-foreground">Triggers</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {fn.triggers.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTriggerDialog(t)}
              className="font-semibold text-link hover:underline"
              title={
                t.inherited
                  ? "Inherited from the parent branch"
                  : t.nextRunAt
                    ? `Next run ${new Date(t.nextRunAt).toLocaleString()}`
                    : undefined
              }
            >
              {t.name}
              {t.inherited && <span className="ml-1 font-normal text-muted-foreground">(inherited)</span>}
              {!t.enabled && <span className="ml-1 font-normal text-muted-foreground">(disabled)</span>}
            </button>
          ))}
          <AddLink onClick={() => setTriggerDialog("new")} />
        </dd>
        <dt className="text-muted-foreground">Custom domains</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {fn.domains.map((d) => (
            <span key={d.domain} className="font-mono text-xs">
              {d.domain}
              {d.status && <span className="ml-1 text-muted-foreground">({d.status})</span>}
            </span>
          ))}
          <AddLink onClick={() => setDomainOpen(true)} />
        </dd>
      </dl>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" nativeButton={false} render={<Link href={logsHref} />}>
          View logs
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </div>

      {triggerDialog && (
        <TriggerDialog
          projectId={projectId}
          branchId={branchId}
          functionSlug={fn.slug}
          trigger={triggerDialog === "new" ? null : triggerDialog}
          onClose={() => setTriggerDialog(null)}
        />
      )}
      <ActionDialog
        open={domainOpen}
        onOpenChange={setDomainOpen}
        title="Add custom domain"
        description={`Point a domain you own at ${fn.slug}. Neon shows the CNAME target once the domain is registered.`}
        confirmLabel="Add domain"
        confirmDisabled={!domain.trim()}
        successMessage="Custom domain added"
        onConfirm={() => registerCustomDomainAction(projectId, branchId, fn.slug, domain)}
      >
        <div className="space-y-1.5">
          <Label htmlFor="fn-domain">Domain</Label>
          <Input id="fn-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="api.example.com" />
        </div>
      </ActionDialog>
      <ActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${fn.slug}?`}
        description="The function, its deployments, and its triggers are deleted. Its invocation URL stops responding."
        confirmLabel="Delete"
        destructive
        successMessage={`${fn.slug} was deleted`}
        onConfirm={async () => {
          const result = await deleteFunctionAction(projectId, branchId, fn.slug);
          if (result.ok) router.refresh();
          return result;
        }}
      />
    </div>
  );
}

function AddLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 font-semibold text-link hover:underline">
      <CirclePlus className="size-3.5" />
      Add
    </button>
  );
}

function TriggerDialog({
  projectId,
  branchId,
  functionSlug,
  trigger,
  onClose,
}: {
  projectId: string;
  branchId: string;
  functionSlug: string;
  trigger: FunctionTrigger | null;
  onClose: () => void;
}) {
  const [type, setType] = useState<TriggerInput["type"]>(trigger?.type ?? "schedule");
  const [name, setName] = useState(trigger?.name ?? "");
  const [functionPath, setFunctionPath] = useState(trigger?.functionPath ?? "/");
  const [cron, setCron] = useState(trigger?.cron ?? "");
  const [bucketName, setBucketName] = useState(trigger?.bucketName ?? "");
  const [prefix, setPrefix] = useState(trigger?.prefix ?? "");
  const [enabled, setEnabled] = useState(trigger?.enabled ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const readOnly = trigger?.inherited ?? false;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: TriggerInput =
      type === "schedule"
        ? { type, name, functionPath, cron, enabled }
        : { type, name, functionPath, bucketName, prefix, enabled };
    startTransition(async () => {
      const result = trigger
        ? await updateTriggerAction(projectId, branchId, trigger.id, input)
        : await createTriggerAction(projectId, branchId, functionSlug, input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const kind = type === "schedule" ? "Schedule" : "Upload trigger";
      toast.success(trigger ? `${kind} "${name}" was updated` : `${kind} "${name}" was created`);
      onClose();
    });
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent aria-describedby={undefined} className="max-w-[480px]">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{trigger ? "Edit trigger" : "Create trigger"}</DialogTitle>
            </DialogHeader>
            <Field label="Function">
              <Input value={functionSlug} disabled readOnly />
            </Field>
            <Field label="Trigger type">
              <div className="flex gap-5 text-sm">
                {(
                  [
                    ["schedule", "Schedule"],
                    ["storage_object_created", "Object upload"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={type === value}
                      onChange={() => setType(value)}
                      disabled={Boolean(trigger) || readOnly}
                      className="accent-foreground"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Trigger name" hint="Names must be unique across all triggers on the branch, including inherited triggers.">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Process new uploads" required disabled={readOnly} />
            </Field>
            <Field label="Function path" hint="The request path passed to the Function.">
              <Input value={functionPath} onChange={(e) => setFunctionPath(e.target.value)} disabled={readOnly} />
            </Field>
            {type === "schedule" ? (
              <>
                <Field label="Cron schedule" hint="Five numeric fields: minute, hour, day of month, month, and day of week.">
                  <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * 1-5" required disabled={readOnly} />
                </Field>
                <Field label="Timezone" hint="Schedules are always evaluated in UTC.">
                  <Input value="UTC" disabled readOnly />
                </Field>
              </>
            ) : (
              <>
                <Field label="Bucket name" hint="Uploads to this bucket on the branch invoke the Function.">
                  <Input value={bucketName} onChange={(e) => setBucketName(e.target.value)} placeholder="uploads" required disabled={readOnly} />
                </Field>
                <Field label="Path prefix" hint="Optional. Only objects whose key starts with this prefix fire the trigger.">
                  <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="images/" disabled={readOnly} />
                </Field>
              </>
            )}
            <label className="flex items-center gap-2 font-semibold text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={readOnly}
                className="size-4 accent-foreground"
              />
              Enable trigger
            </label>
            {readOnly && (
              <p className="text-muted-foreground text-xs">
                This trigger is inherited from the parent branch. Edit it there.
              </p>
            )}
            <DialogFooter className="sm:justify-between">
              {trigger && !readOnly ? (
                <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={pending}>
                  Delete trigger
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                  Cancel
                </Button>
                {!readOnly && (
                  <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="size-3.5 animate-spin" />}
                    {trigger ? "Save changes" : "Create trigger"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {trigger && (
        <ActionDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete trigger "${trigger.name}"?`}
          confirmLabel="Delete"
          destructive
          successMessage={`Trigger "${trigger.name}" was deleted`}
          onConfirm={async () => {
            const result = await deleteTriggerAction(projectId, branchId, trigger.id);
            if (result.ok) onClose();
            return result;
          }}
        />
      )}
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}
