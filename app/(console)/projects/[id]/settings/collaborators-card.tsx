"use client";
import { useState, useTransition } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  grantProjectAccessAction,
  revokeProjectAccessAction,
} from "@/app/actions";

interface Collaborator {
  id: string;
  email: string;
  grantedAt: string;
}

export function CollaboratorsCard({
  projectId,
  collaborators,
  ownerOrgName,
}: {
  projectId: string;
  collaborators: Collaborator[];
  ownerOrgName: string;
}) {
  const [items, setItems] = useState(collaborators);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRevoke(perm: Collaborator) {
    setPendingId(perm.id);
    startTransition(async () => {
      const res = await revokeProjectAccessAction(projectId, perm.id);
      setPendingId(null);
      if (res.ok) {
        setItems((prev) => prev.filter((p) => p.id !== perm.id));
        toast.success(`Revoked access for ${perm.email}.`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Invite external collaborators to join this project. Existing
          collaborators are listed below.
        </p>
        <InviteDialog
          projectId={projectId}
          onInvited={(perm) => setItems((prev) => [...prev, perm])}
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          You haven&apos;t shared your project with anyone yet
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-3 py-2.5 text-sm"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.email}</div>
                <div className="text-[11px] text-muted-foreground">
                  Granted {new Date(p.grantedAt).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(p)}
                disabled={pendingId === p.id}
                className="text-destructive hover:bg-destructive/10"
              >
                {pendingId === p.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[12px] text-muted-foreground">
        * This project is owned by <strong>{ownerOrgName}</strong>. Manage
        member permissions on the People page.
      </p>
    </div>
  );
}

function InviteDialog({
  projectId,
  onInvited,
}: {
  projectId: string;
  onInvited: (perm: Collaborator) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("email", email);
    startTransition(async () => {
      const res = await grantProjectAccessAction(fd);
      if (res.ok) {
        toast.success(`Invited ${email}.`);
        onInvited({
          id: `pending-${Date.now()}`,
          email,
          grantedAt: new Date().toISOString(),
        });
        setEmail("");
        setOpen(false);
        return;
      }
      toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite a collaborator</DialogTitle>
            <DialogDescription>
              Grants the user read & write access to this project via the
              Neon API. They&apos;ll need an existing Neon account with that
              email.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !email}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
