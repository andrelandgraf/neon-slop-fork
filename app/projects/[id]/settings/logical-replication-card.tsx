"use client";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enableLogicalReplicationAction } from "@/app/actions";

export function LogicalReplicationCard({
  projectId,
  initialEnabled,
}: {
  projectId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function handleEnable() {
    startTransition(async () => {
      const res = await enableLogicalReplicationAction(projectId);
      if (res.ok) {
        setEnabled(true);
        toast.success("Logical replication enabled.");
        return;
      }
      const friendly = /logical_replication|wal_level/i.test(res.error)
        ? "Logical replication can only be enabled on paid plans."
        : res.error;
      toast.error(friendly);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Logical replication lets you replicate data changes from Neon to
        external data services and platforms.
      </p>

      {enabled ? (
        <div className="rounded-md border border-emerald-300/40 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900 flex gap-2 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Logical replication is enabled for this project. Postgres
            <code className="mx-1 font-mono">wal_level</code>is set to
            <code className="mx-1 font-mono">logical</code>and can&apos;t be
            turned off.
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-yellow-300/50 bg-yellow-50 px-3 py-2.5 text-[13px] text-yellow-900 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Enabling logical replication:</div>
              <ul className="mt-1 ml-5 list-disc space-y-0.5">
                <li>
                  Restarts all computes in your Neon project, dropping any
                  active connections
                </li>
                <li>
                  Changes your Postgres{" "}
                  <code className="font-mono">wal_level</code> setting to{" "}
                  <code className="font-mono">logical</code>
                </li>
                <li>Can not be turned off once enabled</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div>
        <Button
          variant="outline"
          onClick={handleEnable}
          disabled={pending || enabled}
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {enabled ? "Enabled" : "Enable"}
        </Button>
      </div>
    </div>
  );
}
