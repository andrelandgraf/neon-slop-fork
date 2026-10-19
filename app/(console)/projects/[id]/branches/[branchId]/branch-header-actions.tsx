"use client";
import { useState } from "react";
import { CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BranchMenu } from "@/components/branch-menu";
import { CreateBranchDialog } from "@/components/create-branch-dialog";
import { useSidebarBranches } from "@/components/sidebar";
import { useLiveHeader } from "@/components/live/project-live";

export function BranchHeaderActions({ projectId, branchId }: { projectId: string; branchId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const branches = useSidebarBranches();
  const { branch } = useLiveHeader(projectId, branchId);
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
      {branch && (
        <BranchMenu
          key={`${branch.id}:${branch.name}:${branch.expires_at?.getTime() ?? ""}`}
          projectId={projectId}
          branch={{
            id: branch.id,
            name: branch.name,
            default: branch.default,
            protected: branch.protected,
            parentId: branch.parent_id ?? undefined,
            expiresAt: branch.expires_at?.toISOString(),
          }}
          branches={branches}
        />
      )}
      <CreateBranchDialog
        projectId={projectId}
        branches={branches}
        defaultParentId={branchId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
