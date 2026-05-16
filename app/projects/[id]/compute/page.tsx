import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EndpointControls } from "./endpoint-controls";
import { relativeTime } from "@/lib/utils";
import { Cpu, Play, PauseCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComputePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch: branchParam } = await searchParams;
  const [bRes, eRes] = await Promise.all([
    neon.listProjectBranches({ projectId: id }),
    neon.listProjectEndpoints(id),
  ]);
  const branches = bRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];
  const activeBranchId = branchParam ?? defaultBranch.id;

  // Endpoints are project-scoped; we filter by branch in the UI so
  // users always see the compute for the branch they're working in.
  const endpoints = eRes.data.endpoints.filter(
    (ep) => ep.branch_id === activeBranchId
  );

  return (
    <div className="px-8 py-6">
      <h1 className="text-xl font-semibold mb-1">Compute</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Endpoints attached to branch{" "}
        <span className="font-mono">
          {branches.find((b) => b.id === activeBranchId)?.name ?? "main"}
        </span>
        . Start, suspend, and tune autoscaling — all backed by{" "}
        <code className="text-xs">/projects/{`{id}`}/endpoints</code>.
      </p>

      {endpoints.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Cpu className="h-6 w-6 mx-auto mb-2 opacity-40" />
          No compute endpoints attached to this branch.
        </Card>
      ) : (
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <Card key={ep.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold capitalize">{ep.type}</span>
                    <Badge variant="muted">
                      {ep.current_state === "active" ? (
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
                    {ep.disabled && <Badge variant="warn">Disabled</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {ep.id} · {ep.host}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EndpointControls
                    projectId={id}
                    endpointId={ep.id}
                    state={ep.current_state}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <Field label="Min CU">
                  {ep.autoscaling_limit_min_cu}
                </Field>
                <Field label="Max CU">
                  {ep.autoscaling_limit_max_cu}
                </Field>
                <Field label="Suspend after">
                  {ep.suspend_timeout_seconds === 0
                    ? "never"
                    : `${ep.suspend_timeout_seconds}s`}
                </Field>
                <Field label="Region">{ep.region_id}</Field>
                <Field label="Pooler">
                  {ep.pooler_enabled ? `enabled (${ep.pooler_mode})` : "disabled"}
                </Field>
                <Field label="Last active">
                  {ep.last_active ? relativeTime(ep.last_active) : "—"}
                </Field>
              </div>

              <details className="mt-4 group">
                <summary className="cursor-pointer text-xs text-primary list-none">
                  <span className="group-open:hidden">Edit autoscaling →</span>
                  <span className="hidden group-open:inline">Close ↑</span>
                </summary>
                <EndpointAutoscalingForm
                  projectId={id}
                  endpointId={ep.id}
                  minCu={ep.autoscaling_limit_min_cu}
                  maxCu={ep.autoscaling_limit_max_cu}
                  suspendSeconds={ep.suspend_timeout_seconds ?? 0}
                />
              </details>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 mr-3">
          <Play className="h-3 w-3" /> Start triggers a `start_compute` op.
        </span>
        <span className="inline-flex items-center gap-1">
          <PauseCircle className="h-3 w-3" /> Suspend triggers a
          `suspend_compute` op.
        </span>{" "}
        Watch the Operations tab to see them complete.
      </p>
    </div>
  );
}

function Field({
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

function EndpointAutoscalingForm({
  projectId,
  endpointId,
  minCu,
  maxCu,
  suspendSeconds,
}: {
  projectId: string;
  endpointId: string;
  minCu: number;
  maxCu: number;
  suspendSeconds: number;
}) {
  return (
    <form
      action="/api/__noop"
      className="mt-3 grid grid-cols-3 gap-3 items-end"
    >
      <FormField label="Min CU" name="minCu" defaultValue={String(minCu)} />
      <FormField label="Max CU" name="maxCu" defaultValue={String(maxCu)} />
      <FormField
        label="Suspend (s)"
        name="suspendSeconds"
        defaultValue={String(suspendSeconds)}
      />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="endpointId" value={endpointId} />
      <Button
        type="submit"
        size="sm"
        formAction={async (formData: FormData) => {
          "use server";
          const { updateEndpointAutoscalingAction } = await import(
            "@/app/actions"
          );
          await updateEndpointAutoscalingAction(formData);
        }}
        className="col-span-3 justify-self-end"
      >
        Save autoscaling
      </Button>
    </form>
  );
}

function FormField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="h-8 rounded-md border bg-background px-2 text-sm font-mono"
      />
    </label>
  );
}
