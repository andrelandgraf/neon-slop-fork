"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { transferProjectAction } from "@/app/actions";

/**
 * Transfer this project to another Neon org. We accept the
 * destination org id directly (Neon's `org-...` slug) because the
 * `transferProjectsFromOrgToOrg` endpoint doesn't expose a directory
 * of orgs the user can reach — they have to know the id. This
 * mirrors how transferring works in real Neon: an explicit handle
 * the receiving owner gives you.
 *
 * Once the transfer succeeds, the project is no longer owned by our
 * default org so we detach the local app_project row and bounce the
 * user back to `/projects`.
 */
export function TransferCard({
  projectId,
  currentOrgId,
}: {
  projectId: string;
  currentOrgId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [pending, startTransition] = useTransition();

  function handleTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!destination || destination === currentOrgId) {
      toast.error("Pick a destination org different from the current one.");
      return;
    }
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("destinationOrgId", destination);
    startTransition(async () => {
      const res = await transferProjectAction(fd);
      if (res.ok) {
        toast.success("Project transferred.");
        setOpen(false);
        router.push("/projects");
        router.refresh();
        return;
      }
      toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Move this project to another Neon organization you belong to.
        Transfers are instant, with no downtime.
      </p>
      <p className="text-[12px] text-muted-foreground">
        Current Neon org:{" "}
        <code className="font-mono">{currentOrgId}</code>
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Transfer project</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleTransfer}>
            <DialogHeader>
              <DialogTitle>Transfer project</DialogTitle>
              <DialogDescription>
                Enter the destination Neon org id (the one starting with{" "}
                <code className="font-mono">org-</code>). Once transferred,
                this project will disappear from your project list here.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-1.5">
              <label
                htmlFor="dest-org"
                className="text-sm font-medium"
              >
                Destination org id
              </label>
              <Input
                id="dest-org"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="org-late-snow-12345678"
                pattern="^[a-z0-9-]{1,60}$"
                required
                className="font-mono text-xs"
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
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
