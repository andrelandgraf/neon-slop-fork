"use client";
import { useState } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyAction } from "@/components/code-panel";
import { useShellCollections } from "@/components/live/live-root";

export function OrgNameForm({ id, canEdit }: { id: string; canEdit: boolean }) {
  const { orgs } = useShellCollections();
  const { data } = useLiveQuery({ query: (q) => q.from({ org: orgs }).where(({ org }) => eq(org.id, id)) });
  const org = data[0];
  // null while the input shows the live name; a string once the user edits it
  const [draft, setDraft] = useState<string | null>(null);
  const name = org?.name ?? "";
  const value = draft ?? name;

  function save() {
    const trimmed = value.trim();
    const tx = orgs.update(id, (row) => {
      row.name = trimmed;
    });
    setDraft(null);
    tx.when("settled").then(
      () => toast.success("Organization renamed"),
      (error: unknown) => toast.error(error instanceof Error ? error.message : "Couldn't rename the organization.")
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          value={value}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!canEdit}
          maxLength={64}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Organization ID</Label>
        <div className="flex h-8 items-center justify-between rounded-[3px] border border-panel-border bg-muted px-2.5">
          <code className="truncate font-mono text-xs">{id}</code>
          <CopyAction text={id} label="Copy organization ID" iconOnly />
        </div>
      </div>
      <div>
        <Button disabled={!canEdit || !org || org.$hasPendingWrites || !value.trim() || value.trim() === name} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
