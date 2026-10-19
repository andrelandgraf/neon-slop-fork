"use client";
import { useState } from "react";
import { CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BranchMenu, type MenuBranch } from "@/components/branch-menu";
import { CreateBranchDialog } from "@/components/create-branch-dialog";

export function BranchHeaderActions({
  projectId,
  branch,
  branches,
}: {
  projectId: string;
  branch: MenuBranch;
  branches: { id: string; name: string; default: boolean }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setCreateOpen(true)}>
        <CornerDownRight className="size-3.5" />
        Create child branch
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          navigator.clipboard.writeText(window.location.href).then(() =>
            toast.success("Link copied")
          )
        }
      >
        Share
      </Button>
      <BranchMenu projectId={projectId} branch={branch} branches={branches} />
      <CreateBranchDialog
        projectId={projectId}
        branches={branches}
        defaultParentId={branch.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
