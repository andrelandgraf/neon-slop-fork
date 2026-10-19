"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Ban, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { revokeCredentialAction } from "@/app/actions";

export function CredentialRowActions({
  projectId,
  branchId,
  tokenId,
  name,
}: {
  projectId: string;
  branchId: string;
  tokenId: string;
  name: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Credential actions"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Ban className="h-3.5 w-3.5" />
            Revoke
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setError(null);
        }}
      >
        <DialogContent>
          <form
            action={async () => {
              const result = await revokeCredentialAction(projectId, branchId, tokenId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setConfirmOpen(false);
              router.refresh();
            }}
          >
            <DialogHeader>
              <DialogTitle>Revoke &ldquo;{name}&rdquo;?</DialogTitle>
              <DialogDescription>
                Any client using this credential will immediately stop
                authenticating. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive my-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="font-mono">{error}</div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <SubmitButton variant="destructive" pendingLabel="Revoking…">
                Revoke credential
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
