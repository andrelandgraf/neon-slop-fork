"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { renameProjectAction } from "@/app/actions";

export function GeneralCard({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(projectId);
      setCopied(true);
      toast.success("Project ID copied.");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — your browser blocked the clipboard.");
    }
  }

  return (
    <form action={renameProjectAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-1.5">
        <Label htmlFor="project-id">Project ID</Label>
        <div className="relative">
          <Input
            id="project-id"
            value={projectId}
            readOnly
            className="font-mono text-xs pr-9 bg-muted/40"
          />
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy project ID"
            className="absolute right-1 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          name="name"
          defaultValue={projectName}
          required
          maxLength={64}
        />
      </div>
      <div>
        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}
