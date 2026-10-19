"use client";
import { useState } from "react";
import { CirclePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateBranchDialog } from "@/components/create-branch-dialog";

export function MaskingEmptyState({
  projectId,
  branchId,
  branches,
}: {
  projectId: string;
  branchId: string;
  branches: { id: string; name: string; default: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 rounded-[6px] bg-muted px-10 py-8">
        {[["07008", "07020", "07077"], ["*****", "*****", "*****"]].map((values, i) => (
          <div key={i} className="contents">
            {i === 1 && <span className="h-px w-8 bg-muted-foreground/50" />}
            <div className="w-36 overflow-hidden rounded-[10px] border border-panel-border bg-panel text-left font-mono text-sm">
              <div className="bg-muted px-3 py-2 text-muted-foreground">ZIP Code</div>
              {values.map((v, j) => (
                <div key={j} className="px-3 py-3">
                  {v}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <h1 className="mt-6 text-base">Mask and anonymize sensitive data</h1>
      <p className="mt-2 max-w-md text-muted-foreground text-sm">
        Mask sensitive information according to rules you define, giving you
        realistic, production-shaped data without exposing PII. When you&apos;re
        done, simply delete the branch and move on.{" "}
        <a
          className="text-link"
          href="https://neon.com/docs/workflows/data-anonymization"
          target="_blank"
          rel="noreferrer"
        >
          Learn more
        </a>
      </p>
      <Button className="mt-5" onClick={() => setOpen(true)}>
        <CirclePlus className="size-3.5" />
        Create anonymized branch
      </Button>
      <CreateBranchDialog
        projectId={projectId}
        branches={branches}
        defaultParentId={branchId}
        defaultMode="anonymized"
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
