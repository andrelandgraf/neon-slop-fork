"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleSlash, GitBranch, Hourglass, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ActionDialog } from "@/components/action-dialog";
import { ClaimLinkButton } from "@/components/claim-link-button";
import { CopyAction } from "@/components/code-panel";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  deleteBranchAction,
  renameBranchAction,
  setBranchExpirationAction,
  setBranchProtectedAction,
  setDefaultBranchAction,
} from "@/lib/branches/actions";
import { transferProjectAction } from "@/lib/projects/actions";
import { deleteProjectAction, renameProjectAction } from "@/app/actions";
import { SettingsSection } from "../settings-section";

interface Props {
  project: { id: string; name: string };
  branch: { id: string; name: string; default: boolean; protected: boolean; expiresAt?: string };
  branches: { id: string; name: string; default: boolean }[];
  otherOrgs: { id: string; name: string }[];
  claimLinkExpiresAt: string | null;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function GeneralSettings({ project, branch, branches, otherOrgs, claimLinkExpiresAt }: Props) {
  const router = useRouter();
  const [projectName, setProjectName] = useState(project.name);
  const [branchName, setBranchName] = useState(branch.name);
  const [dialog, setDialog] = useState<"protect" | "expire" | "default" | "transfer" | "delete-branch" | null>(null);
  const [expiry, setExpiry] = useState(
    toLocalInput(branch.expiresAt ?? new Date(Date.now() + 86_400_000).toISOString())
  );
  const [defaultId, setDefaultId] = useState(branches.find((b) => b.default)?.id ?? branch.id);
  const [destination, setDestination] = useState(otherOrgs[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const close = (open: boolean) => !open && setDialog(null);
  const defaultBranch = branches.find((b) => b.default);

  return (
    <>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <ReadonlyId label="Project ID" value={project.id} />
        <form
          className="space-y-1.5"
          action={(fd) =>
            startTransition(async () => {
              await renameProjectAction(fd);
              toast.success("Project name updated");
            })
          }
        >
          <Label htmlFor="project-name">Project name</Label>
          <input type="hidden" name="projectId" value={project.id} />
          <div className="flex gap-2">
            <Input id="project-name" name="name" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
            <Button type="submit" variant="outline" disabled={pending || projectName.trim() === project.name}>
              Save
            </Button>
          </div>
        </form>
        <ReadonlyId label="Branch ID" value={branch.id} />
        <div className="space-y-1.5">
          <Label htmlFor="branch-name">Branch name</Label>
          <div className="flex gap-2">
            <Input id="branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
            <Button
              variant="outline"
              disabled={pending || !branchName.trim() || branchName.trim() === branch.name}
              onClick={() =>
                startTransition(async () => {
                  const result = await renameBranchAction(project.id, branch.id, branchName);
                  if (result.ok) toast.success("Branch renamed");
                  else toast.error(result.error);
                })
              }
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      <SettingsSection
        title="Branch protection"
        description="Protected branches (and their computes/projects) can't be archived, deleted or reset, get auto-rotated passwords for child branches, and can optionally get extra IP restrictions."
      >
        <div className="flex items-center gap-3 text-sm">
          {branch.protected ? <CircleCheck className="size-4 text-primary" /> : <CircleSlash className="size-4 text-muted-foreground" />}
          {branch.protected ? "Protected" : "Not protected"}
          <Button variant="outline" onClick={() => setDialog("protect")}>
            {branch.protected ? "Remove protection" : "Protect this branch"}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Branch expiration"
        description="Perfect for temporary development and testing environments that need automatic deletion (CI/CD pipeline environments, automated testing and more)"
      >
        <div className="flex items-center gap-3 text-sm">
          <Hourglass className="size-4 text-muted-foreground" />
          {branch.expiresAt
            ? `Expires ${new Date(branch.expiresAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`
            : "Never expires"}
          <Button variant="outline" onClick={() => setDialog("expire")} disabled={branch.default}>
            Set branch expiration
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Default branch"
        description="When creating a new branch without specifying the parent, a new branch is created from your project's default branch."
      >
        <div className="flex items-center gap-3 text-sm">
          <GitBranch className="size-4 text-muted-foreground" />
          {defaultBranch?.name}
          {defaultBranch?.id === branch.id && <span className="text-muted-foreground">(this branch)</span>}
          <Button variant="outline" onClick={() => setDialog("default")}>
            Change default branch
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Transfer project"
        description={
          <>
            Move this project to another organization you belong to. Transfers are
            instant, with no downtime.
            <br />
            Or, create a <strong>claim link</strong> so another Neon account can take ownership.
          </>
        }
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog("transfer")}>
            Transfer project
          </Button>
          <ClaimLinkButton projectId={project.id} variant="brand" />
        </div>
        {claimLinkExpiresAt && (
          <p className="text-muted-foreground text-xs">
            A claim link is active until {new Date(claimLinkExpiresAt).toLocaleString("en-US")}.
          </p>
        )}
      </SettingsSection>

      {!branch.default && (
        <SettingsSection
          title="Delete branch"
          description="Permanently delete this branch and all of its data. This action cannot be undone."
        >
          <Button variant="destructive" onClick={() => setDialog("delete-branch")} disabled={branch.protected}>
            Delete branch
          </Button>
        </SettingsSection>
      )}

      <SettingsSection title="Delete project">
        <p className="flex items-center gap-2 rounded-[3px] border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-destructive" />
          Permanently delete project <strong>{project.name}</strong>. This action is
          not reversible. Proceed with caution.
        </p>
        <DeleteConfirmDialog
          resourceName={project.name}
          resourceLabel="project"
          description="This will permanently delete the project, all branches, databases, and stored data. This action cannot be undone."
          action={async () => {
            await deleteProjectAction(project.id);
          }}
        />
      </SettingsSection>

      <ActionDialog
        open={dialog === "protect"}
        onOpenChange={close}
        title={branch.protected ? "Remove branch protection?" : "Protect this branch?"}
        confirmLabel={branch.protected ? "Unprotect" : "Protect"}
        successMessage={branch.protected ? "Branch unprotected" : "Branch protected"}
        onConfirm={() => setBranchProtectedAction(project.id, branch.id, !branch.protected)}
      />
      <ActionDialog
        open={dialog === "expire"}
        onOpenChange={close}
        title="Set branch expiration"
        confirmLabel="Save"
        successMessage="Branch expiration updated"
        onConfirm={() => setBranchExpirationAction(project.id, branch.id, new Date(expiry).toISOString())}
      >
        <div className="space-y-1.5">
          <Label htmlFor="settings-expiry">Expires at</Label>
          <Input id="settings-expiry" type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
      </ActionDialog>
      <ActionDialog
        open={dialog === "default"}
        onOpenChange={close}
        title="Change default branch"
        confirmLabel="Save"
        confirmDisabled={defaultId === defaultBranch?.id}
        successMessage="Default branch changed"
        onConfirm={() => setDefaultBranchAction(project.id, defaultId)}
      >
        <NativeSelect value={defaultId} onChange={(e) => setDefaultId(e.target.value)}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
      </ActionDialog>
      <ActionDialog
        open={dialog === "transfer"}
        onOpenChange={close}
        title="Transfer project"
        description={`Transfer ${project.name} to`}
        confirmLabel="Transfer"
        confirmDisabled={!destination}
        successMessage="Project transferred"
        onConfirm={async () => {
          const result = await transferProjectAction(project.id, destination);
          if (result.ok) router.push("/projects");
          return result;
        }}
      >
        {otherOrgs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You don&apos;t belong to another organization. Create one from the account menu first.
          </p>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-org">Organization</Label>
            <NativeSelect id="transfer-org" value={destination} onChange={(e) => setDestination(e.target.value)}>
              {otherOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </ActionDialog>
      <ActionDialog
        open={dialog === "delete-branch"}
        onOpenChange={close}
        title={`Delete ${branch.name}?`}
        description="The branch, its computes, roles, and databases are permanently deleted."
        confirmLabel="Delete"
        destructive
        successMessage={`${branch.name} was deleted`}
        onConfirm={async () => {
          const result = await deleteBranchAction(project.id, branch.id);
          if (result.ok) router.push(`/projects/${project.id}/settings/general`);
          return result;
        }}
      />
    </>
  );
}

function ReadonlyId({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex h-8 items-center justify-between gap-2 rounded-[3px] border border-panel-border bg-muted px-2.5">
        <code className="truncate font-mono text-xs">{value}</code>
        <CopyAction text={value} label={`Copy ${label}`} iconOnly />
      </div>
    </div>
  );
}
