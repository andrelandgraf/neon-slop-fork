"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateNetworkingAction, updateIpAllowlistAction } from "@/app/actions";

/**
 * Networking card — combines what the real Neon console splits into
 * two sub-sections:
 *
 * - Top: two switches for the project-level transport gates
 *   (`block_public_connections`, `block_vpc_connections`).
 * - Bottom: the IP allowlist, which scopes the public transport.
 *
 * Both live under `project.settings.*` so they share the same
 * patching endpoint, but we send them as separate updateProject
 * calls so toggling one doesn't accidentally overwrite the other
 * (we don't refetch between toggles).
 */
export function NetworkingCard({
  projectId,
  initialBlockPublic,
  initialBlockVpc,
  initialIps,
  initialProtectedOnly,
}: {
  projectId: string;
  initialBlockPublic: boolean;
  initialBlockVpc: boolean;
  initialIps: string[];
  initialProtectedOnly: boolean;
}) {
  const [blockPublic, setBlockPublic] = useState(initialBlockPublic);
  const [blockVpc, setBlockVpc] = useState(initialBlockVpc);
  const [pending, startTransition] = useTransition();

  function togglePublic(next: boolean) {
    const prev = blockPublic;
    setBlockPublic(next);
    const fd = new FormData();
    fd.set("projectId", projectId);
    if (next) fd.set("blockPublic", "on");
    if (blockVpc) fd.set("blockVpc", "on");
    startTransition(async () => {
      const res = await updateNetworkingAction(fd);
      if (res.ok) {
        toast.success(
          next
            ? "Public internet access disabled."
            : "Public internet access enabled."
        );
        return;
      }
      setBlockPublic(prev);
      toast.error(res.error);
    });
  }

  function toggleVpc(next: boolean) {
    const prev = blockVpc;
    setBlockVpc(next);
    const fd = new FormData();
    fd.set("projectId", projectId);
    if (blockPublic) fd.set("blockPublic", "on");
    if (next) fd.set("blockVpc", "on");
    startTransition(async () => {
      const res = await updateNetworkingAction(fd);
      if (res.ok) {
        toast.success(
          next ? "VPC access disabled." : "VPC access enabled."
        );
        return;
      }
      setBlockVpc(prev);
      toast.error(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={!blockPublic}
              onCheckedChange={(on) => togglePublic(!on)}
              disabled={pending}
              aria-label="Allow public internet"
            />
            <div className="text-sm">Allow traffic via the public internet</div>
          </div>
          <p className="ml-12 mt-1 text-[12px] text-muted-foreground">
            <span className="text-primary hover:underline cursor-default">
              Upgrade your plan
            </span>{" "}
            to limit database access to trusted IP addresses.
          </p>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={!blockVpc}
              onCheckedChange={(on) => toggleVpc(!on)}
              disabled={pending}
              aria-label="Allow VPC"
            />
            <div className="text-sm">
              Allow traffic via Virtual Private Network (VPC)
            </div>
          </div>
          <p className="ml-12 mt-1 text-[12px] text-muted-foreground">
            <span className="text-primary hover:underline cursor-default">
              Upgrade your plan
            </span>{" "}
            to limit database access using VPC.
          </p>
        </div>
      </div>

      <IpAllowlistSubsection
        projectId={projectId}
        initialIps={initialIps}
        initialProtectedOnly={initialProtectedOnly}
      />
    </div>
  );
}

function IpAllowlistSubsection({
  projectId,
  initialIps,
  initialProtectedOnly,
}: {
  projectId: string;
  initialIps: string[];
  initialProtectedOnly: boolean;
}) {
  const [ips, setIps] = useState(initialIps.join("\n"));
  const [protectedOnly, setProtectedOnly] = useState(initialProtectedOnly);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("ips", ips);
    if (protectedOnly) fd.set("protectedOnly", "on");
    startTransition(async () => {
      const res = await updateIpAllowlistAction(fd);
      if (res.ok) {
        toast.success("IP allowlist saved.");
        return;
      }
      const friendly = /allowed ip entries exceeds allowed maximum/i.test(
        res.error
      )
        ? "IP allowlists require the Neon Scale plan or above. The Free plan caps allowed_ips at 0."
        : res.error;
      toast.error(friendly);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
      <div>
        <div className="text-sm font-semibold">IP allowlist</div>
        <p className="text-[12px] text-muted-foreground">
          Restrict who can reach the project&apos;s computes. Empty list
          means &ldquo;allow all&rdquo;. CIDR ranges are accepted.
        </p>
      </div>
      <textarea
        rows={4}
        value={ips}
        onChange={(e) => setIps(e.target.value)}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        placeholder={"203.0.113.0/24\n198.51.100.42"}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={protectedOnly}
          onChange={(e) => setProtectedOnly(e.target.checked)}
        />
        Apply only to protected branches
      </label>
      <div>
        <Button type="submit" disabled={pending} variant="outline">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save allowlist
        </Button>
      </div>
    </form>
  );
}
