"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/action-dialog";
import { resetFromParentAction } from "@/lib/branches/actions";

export function ResetFromParent({
  projectId,
  branchId,
  branchName,
  parentName,
}: {
  projectId: string;
  branchId: string;
  branchName: string;
  parentName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Reset from parent
      </Button>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`Reset ${branchName} from ${parentName}?`}
        description="The branch's data and schema are replaced with the latest from its parent. Changes made on this branch are lost."
        confirmLabel="Reset"
        destructive
        successMessage={`${branchName} was reset from ${parentName}`}
        onConfirm={() => resetFromParentAction(projectId, branchId)}
      />
    </>
  );
}
