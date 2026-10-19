"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PostgresTab } from "@/components/connect/connect-dialog";
import {
  loadConnectDetailsAction,
  type ConnectDetails,
} from "@/lib/connect/actions";

/**
 * Shown once after "Create branch": the fork time toast and the new branch's
 * connection details, driven by `?created=<ms>` so a reload doesn't repeat it.
 */
export function NewBranchDialog({
  projectId,
  branchId,
  branchName,
  expiresAt,
}: {
  projectId: string;
  branchId: string;
  branchName: string;
  expiresAt?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const created = searchParams.get("created");
  const [details, setDetails] = useState<ConnectDetails | null>(null);

  useEffect(() => {
    if (created === null) return;
    const seconds = (Number(created) / 1000).toFixed(2);
    toast.success(
      <span>
        Branch forked in {seconds} sec 🔥{" "}
        <a
          className="underline"
          href="https://neon.com/docs/introduction/branching"
          target="_blank"
          rel="noreferrer"
        >
          Why so fast?
        </a>
      </span>,
      { id: `branch-forked-${branchId}` }
    );
    let cancelled = false;
    loadConnectDetailsAction(projectId, branchId).then(
      (next) => !cancelled && setDetails(next),
      (err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Could not load connection details.")
    );
    return () => {
      cancelled = true;
    };
  }, [created, projectId, branchId]);

  if (created === null) return null;

  function close() {
    const params = new URLSearchParams(searchParams);
    params.delete("created");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-panel-border border-b px-5 py-4">
          <DialogTitle>Connection details for your new branch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-2 rounded-[3px] border border-link/30 bg-link/5 px-3 py-2.5 text-sm">
            <Info className="size-4 shrink-0 text-link" />
            {expiry
              ? `The ${branchName} branch was created successfully and will expire on ${expiry}.`
              : `The ${branchName} branch was created successfully.`}
          </div>
          {details ? (
            <PostgresTab projectId={projectId} branchId={branchId} details={details} />
          ) : (
            <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading connection details…
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 border-panel-border border-t px-5 py-3 text-sm">
          <p className="text-muted-foreground">
            Manage users and passwords on the{" "}
            <Link
              className="text-link"
              href={`/projects/${projectId}/branches/${branchId}/roles`}
            >
              Roles
            </Link>{" "}
            page. For more information, see{" "}
            <a
              className="text-link"
              href="https://neon.com/docs/connect/connect-from-any-app"
              target="_blank"
              rel="noreferrer"
            >
              Connect to a branch
            </a>
            .
          </p>
          <Button onClick={close}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
