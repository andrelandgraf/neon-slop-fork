"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Download, Trash2, AlertCircle } from "lucide-react";
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
import { deleteObjectAction, presignDownloadAction } from "@/app/actions";

export function ObjectRowActions({
  projectId,
  branchId,
  bucketName,
  objectKey,
}: {
  projectId: string;
  branchId: string;
  bucketName: string;
  objectKey: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    const result = await presignDownloadAction(
      projectId,
      branchId,
      bucketName,
      objectKey
    );
    if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Object actions"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => handleDownload()}>
            <Download className="h-3.5 w-3.5" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
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
              const result = await deleteObjectAction(
                projectId,
                branchId,
                bucketName,
                objectKey
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setConfirmOpen(false);
              router.refresh();
            }}
          >
            <DialogHeader>
              <DialogTitle>Delete object?</DialogTitle>
              <DialogDescription>
                <code className="font-mono text-foreground break-all">{objectKey}</code>{" "}
                will be permanently deleted.
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
              <SubmitButton variant="destructive" pendingLabel="Deleting…">
                Delete
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
