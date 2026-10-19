"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EllipsisVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionDialog } from "@/components/action-dialog";
import { CreateBranchDialog } from "@/components/create-branch-dialog";
import {
  deleteBranchAction,
  renameBranchAction,
  resetFromParentAction,
  setBranchExpirationAction,
  setBranchProtectedAction,
  setDefaultBranchAction,
} from "@/lib/branches/actions";

export interface MenuBranch {
  id: string;
  name: string;
  default: boolean;
  protected: boolean;
  parentId?: string;
  expiresAt?: string;
}

type DialogKind =
  | "child"
  | "expiration"
  | "reset"
  | "protect"
  | "default"
  | "rename"
  | "delete";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

/**
 * The Console's branch ⋮ menu, shared by Branch overview and the Branches
 * table. Actions the default branch can't take are disabled, not hidden.
 */
export function BranchMenu({
  projectId,
  branch,
  branches,
  includeCreateChild = false,
  triggerClassName,
}: {
  projectId: string;
  branch: MenuBranch;
  branches: { id: string; name: string; default: boolean }[];
  includeCreateChild?: boolean;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [name, setName] = useState(branch.name);
  const [expiry, setExpiry] = useState(
    branch.expiresAt
      ? toLocalInput(branch.expiresAt)
      : toLocalInput(new Date(Date.now() + 24 * 3600_000).toISOString())
  );
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Branch actions"
            className={
              triggerClassName ??
              "grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          >
            <EllipsisVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {includeCreateChild && (
            <DropdownMenuItem onSelect={() => setDialog("child")}>
              Create child branch
            </DropdownMenuItem>
          )}
          {!includeCreateChild && (
            <DropdownMenuItem asChild>
              <a
                href="https://neon.com/docs/import/migrate-intro"
                target="_blank"
                rel="noreferrer"
              >
                Import data
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={branch.default} onSelect={() => setDialog("expiration")}>
            Set expiration
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!branch.parentId} onSelect={() => setDialog("reset")}>
            Reset from parent
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("protect")}>
            {branch.protected ? "Set as unprotected" : "Set as protected"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={branch.default} onSelect={() => setDialog("default")}>
            Set as default
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("rename")}>Rename</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={branch.default || branch.protected}
            onSelect={() => setDialog("delete")}
            className="text-destructive focus:text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateBranchDialog
        projectId={projectId}
        branches={branches}
        defaultParentId={branch.id}
        open={dialog === "child"}
        onOpenChange={close}
      />
      <ActionDialog
        open={dialog === "expiration"}
        onOpenChange={close}
        title="Set expiration"
        description={`The ${branch.name} branch and its computes are deleted at this time.`}
        confirmLabel="Save"
        successMessage="Branch expiration updated"
        onConfirm={() =>
          setBranchExpirationAction(projectId, branch.id, new Date(expiry).toISOString())
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="branch-expiry">Expires at</Label>
          <Input
            id="branch-expiry"
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
          {branch.expiresAt && (
            <button
              type="button"
              className="text-link text-xs hover:underline"
              onClick={async () => {
                const result = await setBranchExpirationAction(projectId, branch.id, null);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Branch expiration removed");
                setDialog(null);
              }}
            >
              Remove expiration
            </button>
          )}
        </div>
      </ActionDialog>
      <ActionDialog
        open={dialog === "reset"}
        onOpenChange={close}
        title={`Reset ${branch.name} from parent?`}
        description="The branch's data and schema are replaced with the latest from its parent. Changes made on this branch are lost. Connections are briefly interrupted."
        confirmLabel="Reset"
        destructive
        successMessage={`${branch.name} was reset from its parent`}
        onConfirm={() => resetFromParentAction(projectId, branch.id)}
      />
      <ActionDialog
        open={dialog === "protect"}
        onOpenChange={close}
        title={branch.protected ? "Remove branch protection?" : "Protect this branch?"}
        description={
          branch.protected
            ? "The branch can be deleted and reset again."
            : "Protected branches can't be deleted or reset, and passwords of their child branches rotate automatically."
        }
        confirmLabel={branch.protected ? "Unprotect" : "Protect"}
        successMessage={branch.protected ? "Branch unprotected" : "Branch protected"}
        onConfirm={() => setBranchProtectedAction(projectId, branch.id, !branch.protected)}
      />
      <ActionDialog
        open={dialog === "default"}
        onOpenChange={close}
        title={`Set ${branch.name} as default?`}
        description="New branches created without a parent fork from the default branch, and it can't be deleted."
        confirmLabel="Set as default"
        successMessage={`${branch.name} is now the default branch`}
        onConfirm={() => setDefaultBranchAction(projectId, branch.id)}
      />
      <ActionDialog
        open={dialog === "rename"}
        onOpenChange={close}
        title="Rename branch"
        confirmLabel="Save"
        confirmDisabled={!name.trim() || name.trim() === branch.name}
        successMessage="Branch renamed"
        onConfirm={() => renameBranchAction(projectId, branch.id, name)}
      >
        <div className="space-y-1.5">
          <Label htmlFor="branch-rename">Name</Label>
          <Input id="branch-rename" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </ActionDialog>
      <ActionDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title={`Delete ${branch.name}?`}
        description="The branch, its computes, roles, and databases are permanently deleted."
        confirmLabel="Delete"
        destructive
        successMessage={`${branch.name} was deleted`}
        onConfirm={async () => {
          const result = await deleteBranchAction(projectId, branch.id);
          if (result.ok) router.push(`/projects/${projectId}/branches`);
          return result;
        }}
      />
    </>
  );
}
