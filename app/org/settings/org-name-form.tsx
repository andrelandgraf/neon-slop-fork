"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyAction } from "@/components/code-panel";
import { renameOrgAction } from "@/lib/orgs/actions";

export function OrgNameForm({ id, name, canEdit }: { id: string; name: string; canEdit: boolean }) {
  const [value, setValue] = useState(name);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input id="org-name" value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit} maxLength={64} />
      </div>
      <div className="space-y-1.5">
        <Label>Organization ID</Label>
        <div className="flex h-8 items-center justify-between rounded-[3px] border border-panel-border bg-muted px-2.5">
          <code className="truncate font-mono text-xs">{id}</code>
          <CopyAction text={id} label="Copy organization ID" iconOnly />
        </div>
      </div>
      <div>
        <Button
          disabled={!canEdit || pending || !value.trim() || value.trim() === name}
          onClick={() =>
            startTransition(async () => {
              const result = await renameOrgAction(value);
              if (result.ok) toast.success("Organization renamed");
              else toast.error(result.error);
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}
