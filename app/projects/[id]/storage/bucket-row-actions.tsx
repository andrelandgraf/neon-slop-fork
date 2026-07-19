"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, ArrowRight, AlertCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteBucketAction } from "@/app/actions";

export function BucketRowActions({
  projectId,
  branchId,
  bucketName,
  href,
}: {
  projectId: string;
  branchId: string;
  bucketName: string;
  href: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Bucket actions"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={href}>
              <ArrowRight className="h-3.5 w-3.5" />
              Open
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete bucket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) {
            setTyped("");
            setError(null);
          }
        }}
      >
        <DialogContent>
          <form
            action={async () => {
              const result = await deleteBucketAction(projectId, branchId, bucketName);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setConfirmOpen(false);
              router.refresh();
            }}
          >
            <DialogHeader>
              <DialogTitle>Delete &ldquo;{bucketName}&rdquo;?</DialogTitle>
              <DialogDescription>
                This permanently deletes the bucket and every object in it. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 my-3">
              <Label htmlFor={`del-${bucketName}`}>
                Type <code className="font-mono text-foreground">{bucketName}</code>{" "}
                to confirm
              </Label>
              <Input
                id={`del-${bucketName}`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={bucketName}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive mb-2">
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
              <SubmitButton
                variant="destructive"
                disabled={typed !== bucketName}
                pendingLabel="Deleting…"
              >
                Delete bucket
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
