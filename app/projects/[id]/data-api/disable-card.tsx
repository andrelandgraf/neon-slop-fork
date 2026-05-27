"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { disableDataApiAction } from "@/app/actions";

/**
 * Destructive "Disable Data API" card.
 *
 * The Neon API's DELETE on `data-api/{db}` immediately terminates
 * active connections — same caveat the upstream console surfaces.
 * We gate the action behind a confirmation dialog so a misclick
 * doesn't wipe everyone's traffic.
 */
export function DisableDataApiCard({
  projectId,
  branchId,
  databaseName,
}: {
  projectId: string;
  branchId: string;
  databaseName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-5 border-destructive/20">
      <h3 className="text-sm font-semibold">Disable</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Disables the Data API for this branch. This will immediately terminate
        all active connections and block access to data for any apps, websites,
        or services using the API.
      </p>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Disable
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Data API</DialogTitle>
            <DialogDescription>
              All active API clients on{" "}
              <code className="text-xs">{databaseName}</code> will be cut off
              immediately. You can re-enable later, but the URL may change.
            </DialogDescription>
          </DialogHeader>
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
                const result = await disableDataApiAction(
                  projectId,
                  branchId,
                  databaseName
                );
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              }}
            >
              <SubmitButton variant="destructive" pendingLabel="Disabling…">
                Disable Data API
              </SubmitButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
