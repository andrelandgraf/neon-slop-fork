"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, EllipsisVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionDialog } from "@/components/action-dialog";
import {
  createDatabaseAction,
  createRoleAction,
  deleteDatabaseAction,
  deleteRoleAction,
  resetRolePasswordAction,
} from "@/app/actions";

type Result = { ok: true } | { ok: false; error: string };

/** Wraps the older throwing actions in the `{ ok }` shape dialogs expect. */
async function attempt(call: () => Promise<unknown>): Promise<Result> {
  try {
    await call();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function ObjectRow({
  name,
  columns,
  actions,
}: {
  name: string;
  columns: { label: string; value: string }[];
  actions: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 rounded-[3px] border border-panel-border px-5 py-3.5">
      <span className="truncate text-sm">{name}</span>
      {columns.map((c) => (
        <div key={c.label} className="min-w-0">
          <div className="text-muted-foreground text-xs">{c.label}</div>
          <div className="truncate text-sm">{c.value}</div>
        </div>
      ))}
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function RowMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Actions"
          className="grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-muted"
        >
          <EllipsisVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AddRoleButton({
  projectId,
  branchId,
  branchName,
}: {
  projectId: string;
  branchId: string;
  branchName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Add role
      </Button>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Role creation"
        confirmLabel="Create"
        confirmDisabled={!name.trim()}
        successMessage={`Role ${name.trim()} was created`}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("branchId", branchId);
          fd.set("name", name);
          return attempt(() => createRoleAction(fd));
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Input value={branchName} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
        </div>
      </ActionDialog>
    </>
  );
}

export function RoleActions({
  projectId,
  branchId,
  roleName,
}: {
  projectId: string;
  branchId: string;
  roleName: string;
}) {
  const [dialog, setDialog] = useState<"reset" | "delete" | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      try {
        const res = await resetRolePasswordAction(projectId, branchId, roleName);
        if (!res.password) throw new Error("Neon did not return a new password.");
        setPassword(res.password);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Reset failed.");
      }
    });
  }

  return (
    <>
      <RowMenu>
        <DropdownMenuItem onSelect={() => setDialog("reset")}>Reset password</DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => setDialog("delete")}
        >
          Delete role
        </DropdownMenuItem>
      </RowMenu>
      <Dialog
        open={dialog === "reset"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setPassword(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {roleName}</DialogTitle>
            <DialogDescription>
              {password
                ? "Copy the new password now. It won't be shown again."
                : "Existing connections using the old password stop working."}
            </DialogDescription>
          </DialogHeader>
          {password && (
            <div className="flex items-center justify-between gap-2 rounded-[3px] border border-panel-border bg-muted px-3 py-2">
              <code className="truncate font-mono text-xs">{password}</code>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(password).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  })
                }
                className="text-muted-foreground hover:text-foreground"
                aria-label="Copy password"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          )}
          <DialogFooter>
            {password ? (
              <Button onClick={() => setDialog(null)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={reset} disabled={pending}>
                  {pending && <Loader2 className="size-3.5 animate-spin" />}
                  Reset password
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ActionDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Delete role ${roleName}?`}
        description="Databases owned by this role must be deleted or reassigned first."
        confirmLabel="Delete"
        destructive
        successMessage={`Role ${roleName} was deleted`}
        onConfirm={() => attempt(() => deleteRoleAction(projectId, branchId, roleName))}
      />
    </>
  );
}

export function AddDatabaseButton({
  projectId,
  branchId,
  branchName,
  roles,
}: {
  projectId: string;
  branchId: string;
  branchName: string;
  roles: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [owner, setOwner] = useState(roles[0] ?? "");
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Add database
      </Button>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Database creation"
        confirmLabel="Create"
        confirmDisabled={!name.trim() || !owner}
        successMessage={`Database ${name.trim()} was created`}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("branchId", branchId);
          fd.set("name", name);
          fd.set("ownerName", owner);
          return attempt(() => createDatabaseAction(fd));
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Input value={branchName} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="database-name">Database name</Label>
            <Input id="database-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="database-owner">Owner</Label>
            <NativeSelect id="database-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </ActionDialog>
    </>
  );
}

export function DatabaseActions({
  projectId,
  branchId,
  databaseName,
}: {
  projectId: string;
  branchId: string;
  databaseName: string;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const base = `/projects/${projectId}/branches/${branchId}`;
  return (
    <>
      <Button nativeButton={false} render={<Link href={`${base}/tables`} />}>
        Edit data
      </Button>
      <RowMenu>
        <DropdownMenuItem onSelect={() => router.push(`${base}/sql-editor`)}>Query</DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => setDeleteOpen(true)}
        >
          Delete database
        </DropdownMenuItem>
      </RowMenu>
      <ActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete database ${databaseName}?`}
        description="All tables and data in this database are permanently deleted."
        confirmLabel="Delete"
        destructive
        successMessage={`Database ${databaseName} was deleted`}
        onConfirm={() => attempt(() => deleteDatabaseAction(projectId, branchId, databaseName))}
      />
    </>
  );
}
