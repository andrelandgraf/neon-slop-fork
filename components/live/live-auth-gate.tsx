"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { LiveStatus } from "@/components/live/live-status";
import { useBranchServices } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { BranchServiceRow } from "@/lib/live/queries";

/**
 * Shows an Auth page's enabled view or its "enable" view from the branch's
 * live Auth state. The enabled view reads data the mirror doesn't hold
 * (the tenant's own database), so when the service turns on elsewhere and
 * the server rendered no enabled view, it asks the server for a fresh render.
 */
export function LiveAuthGate({
  branchId,
  services: seed,
  off,
  children,
}: {
  branchId: string;
  services: LiveSeed<BranchServiceRow>;
  off: React.ReactNode;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const services = useBranchServices(branchId, seed);
  const query = useLiveQuery({ query: (q) => q.from({ s: services }).where(({ s }) => eq(s.branch_id, branchId)) });
  const row = query.data[0];
  const enabled = Boolean(row?.auth);
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
