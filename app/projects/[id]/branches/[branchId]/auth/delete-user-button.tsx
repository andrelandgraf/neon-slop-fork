"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertCircle } from "lucide-react";
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
import { deleteAuthUserAction } from "@/app/actions";

export function DeleteUserButton({
  projectId,
  branchId,
  userId,
  userLabel,
}: {
  projectId: string;
  branchId: string;
  userId: string;
  userLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog onOpenChange={() => setError(null)}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete auth user</DialogTitle>
          <DialogDescription>
            Permanently deletes <code className="text-xs">{userLabel}</code>{" "}
            from Neon Auth and removes them from{" "}
            <code className="text-xs">neon_auth.users_sync</code>.
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
              const result = await deleteAuthUserAction(
                projectId,
                branchId,
                userId
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            }}
          >
            <SubmitButton variant="destructive" pendingLabel="Deleting…">
              Delete user
            </SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
