"use client";
import { useState, useTransition } from "react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyAction } from "@/components/code-panel";
import { createClaimLinkAction } from "@/lib/projects/actions";

/** "Create claim link" and the Console's "Claim link successfully created" dialog. */
export function ClaimLinkButton({
  projectId,
  variant = "outline",
}: {
  projectId: string;
  variant?: "outline" | "default" | "brand";
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button
        variant={variant}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createClaimLinkAction(projectId);
            if (result.ok) setUrl(result.url);
            else toast.error(result.error);
          })
        }
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Create claim link
      </Button>
      <Dialog open={url !== null} onOpenChange={(open) => !open && setUrl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Claim link successfully created</DialogTitle>
            <DialogDescription>
              Share this link with the Neon account you want to own the project.
              When they sign in and open the link, they can select the
              organization to transfer the project into.
            </DialogDescription>
          </DialogHeader>
          {url && (
            <div>
              <div className="mb-1 font-semibold text-xs">Project claim link</div>
              <div className="flex items-center gap-2 rounded-[3px] border border-panel-border bg-muted px-3 py-2">
                <code className="truncate font-mono text-xs">{url}</code>
                <CopyAction text={url} label="Copy claim link" iconOnly />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The CLI only reaches projects in organizations you belong to on Neon, and
 * this clone's projects live in one shared organization.
 */
export function CliAccessCallout({ projectId }: { projectId: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[3px] border border-link/30 bg-link/5 px-4 py-3 text-left text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-link" />
      <div className="flex-1">
        This project lives in the Neon Clone&apos;s shared organization, so the
        Neon CLI can only reach it after you claim it into your own Neon account.
      </div>
      <ClaimLinkButton projectId={projectId} />
    </div>
  );
}
