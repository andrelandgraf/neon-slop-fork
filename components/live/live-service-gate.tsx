"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { LiveStatus } from "@/components/live/live-status";
import { useBranchServices } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { BranchServiceRow } from "@/lib/live/queries";

/**
 * Shows a service page's enabled view or its "enable" view from the branch's
 * live service state. The enabled view reads data the mirror doesn't hold
 * (the tenant's own database), so when the service turns on elsewhere and
 * the server rendered no enabled view, it asks the server for a fresh render.
 */
export function LiveServiceGate({
  branchId,
  service,
  services: seed,
  off,
  children,
}: {
  branchId: string;
  service: "auth" | "ai_gateway";
  services: LiveSeed<BranchServiceRow>;
  off: React.ReactNode;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const services = useBranchServices(branchId, seed);
  const query = useLiveQuery({ query: (q) => q.from({ s: services }).where(({ s }) => eq(s.branch_id, branchId)) });
  const row = query.data[0];
  const enabled = service === "auth" ? Boolean(row?.auth) : Boolean(row?.ai_gateway?.enabled);
  const needsRender = enabled && !children;
  useEffect(() => {
    if (needsRender) router.refresh();
  }, [needsRender, router]);
  return (
    <>
      <LiveStatus queries={[query]} />
      {enabled && children ? children : off}
    </>
  );
}
