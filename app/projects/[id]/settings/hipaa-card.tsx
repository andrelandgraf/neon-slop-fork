"use client";
import { useState, useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setHipaaAction } from "@/app/actions";

export function HipaaCard({
  projectId,
  initialEnabled,
}: {
  projectId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    startTransition(async () => {
      const res = await setHipaaAction(projectId, next);
      if (res.ok) {
        setEnabled(next);
        toast.success(
          next ? "HIPAA compliance enabled." : "HIPAA compliance disabled."
        );
        return;
      }
      const friendly = /hipaa/i.test(res.error)
        ? "HIPAA compliance requires an Enterprise Neon plan."
        : res.error;
      toast.error(friendly);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enable HIPAA compliance on this project to ensure that all protected
        health information (PHI) is protected in compliance with the Health
        Insurance Portability and Accountability Act (HIPAA). For more
        details about how we support HIPAA compliance, see our{" "}
        <a
          href="https://neon.com/docs/security/hipaa"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          HIPAA Compliance guide <ExternalLink className="h-3 w-3" />
        </a>
      </p>
      <div className="flex items-center gap-2 text-[12px]">
        <span
          className={
            enabled
              ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
              : "h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
          }
        />
        HIPAA compliance {enabled ? "enabled" : "disabled"}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => handleToggle(!enabled)}
          disabled={pending}
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {enabled ? "Disable" : "Enable"}
        </Button>
        {!enabled && (
          <span className="text-[12px] text-muted-foreground">
            Your current plan must support HIPAA compliance.
          </span>
        )}
      </div>
    </div>
  );
}
