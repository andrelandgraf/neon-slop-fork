"use client";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateIpAllowlistAction } from "@/app/actions";

export function IpAllowlistForm({
  projectId,
  initialIps,
  protectedOnly,
}: {
  projectId: string;
  initialIps: string[];
  protectedOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateIpAllowlistAction(formData);
      if (res.ok) {
        toast.success("IP allowlist saved.");
        return;
      }
      const friendly = /allowed ip entries exceeds allowed maximum/i.test(
        res.error
      )
        ? "IP allowlists require the Neon Scale plan or above. The Free plan caps allowed_ips at 0."
        : res.error;
      setError(friendly);
      toast.error(friendly);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-1.5">
        <Label htmlFor="ips">Allowed IPs</Label>
        <textarea
          id="ips"
          name="ips"
          rows={4}
          defaultValue={initialIps.join("\n")}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          placeholder={"203.0.113.0/24\n198.51.100.42"}
        />
        <p className="text-[11px] text-muted-foreground">
          One per line, comma- or whitespace-separated. Validation happens
          server-side via the Neon API.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="protectedOnly"
          defaultChecked={protectedOnly}
        />
        Apply only to protected branches
      </label>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Saving…" : "Save allowlist"}
        </Button>
      </div>
    </form>
  );
}
