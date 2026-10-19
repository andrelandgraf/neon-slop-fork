"use client";
import { useState } from "react";
import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditComputeDialog } from "./edit-compute-dialog";

export function AddReplicaBanner({
  projectId,
  branchId,
}: {
  projectId: string;
  branchId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-[3px] border border-panel-border bg-muted px-5 py-4">
      <Cpu className="size-5 text-primary" />
      <p className="flex-1 text-sm">
        Read Replicas: Scale your application by offloading your read workload
        to a read-only instance of your database.
      </p>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Add Read Replica
      </Button>
      <EditComputeDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        branchId={branchId}
        title="Add read replica"
      />
    </div>
  );
}
