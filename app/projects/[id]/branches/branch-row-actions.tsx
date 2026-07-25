"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteBranchAction, setDefaultBranchAction } from "@/app/actions";

/**
 * Row controls for a non-default branch.
 *
 * Both actions can be refused by the API — an expiring branch can't be
 * promoted, and a branch with children can't be deleted — so failures are
 * rendered next to the row rather than thrown at the error boundary. "Set
 * default" is disabled outright for the case the Console also greys out.
 */
export function BranchRowActions({
  projectId,
  branchId,
  canSetDefault,
  setDefaultDisabledReason,
}: {
  projectId: string;
  branchId: string;
  canSetDefault: boolean;
  setDefaultDisabledReason?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={!canSetDefault || isPending}
          title={canSetDefault ? undefined : setDefaultDisabledReason}
          onClick={() => run(() => setDefaultBranchAction(projectId, branchId))}
        >
          Set default
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          disabled={isPending}
          onClick={() => run(() => deleteBranchAction(projectId, branchId))}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
      {error && (
        <p className="max-w-xs text-right text-destructive text-xs">{error}</p>
      )}
    </div>
  );
}
