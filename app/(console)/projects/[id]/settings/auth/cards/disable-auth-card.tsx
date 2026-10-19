"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { disableAuthAction } from "@/app/actions";

/**
 * Destructive "Disable Auth" card.
 *
 * Two destructive levels: disable Neon Auth (provider stays put) and
 * additionally drop the `neon_auth` schema from your database. The API
 * separates them as `delete_data: false | true` on the DELETE request.
 * We default to NOT deleting data because the schema may have foreign
 * keys into your own tables — restoring it after a full drop is a
 * manual migration. The toggle is opt-in inside the confirm dialog.
 */
export function DisableAuthCard({
  projectId,
  branchId,
}: {
  projectId: string;
  branchId: string;
}) {
  const router = useRouter();
  const [deleteData, setDeleteData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-5 border-destructive/20">
      <h3 className="text-sm font-semibold">Disable Auth</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Disables Neon Auth for this branch. Disabling Neon Auth will delete all
        users from the auth provider. The synced schema can optionally be
        dropped from your database. This action is irreversible.
      </p>

      <Dialog
        onOpenChange={(o) => {
          if (!o) setError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Disable Auth
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Neon Auth</DialogTitle>
            <DialogDescription>
              This stops authentication for this branch. Users in the auth
              provider will be removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="text-sm">
              <div className="font-medium">
                Also drop the{" "}
                <code className="text-xs">neon_auth</code> schema
              </div>
              <p className="text-xs text-muted-foreground">
                Removes the synced users table from your database. Any foreign
                keys referencing it will break.
              </p>
            </div>
            <Switch
              checked={deleteData}
              onCheckedChange={setDeleteData}
              aria-label="Drop neon_auth schema"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="font-mono">{error}</div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <form
              action={async () => {
                const result = await disableAuthAction(
                  projectId,
                  branchId,
                  deleteData
                );
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              }}
            >
              <SubmitButton variant="destructive" pendingLabel="Disabling…">
                Disable Neon Auth
              </SubmitButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
