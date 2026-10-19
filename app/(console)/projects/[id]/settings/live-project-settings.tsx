"use client";
import { useLiveHeader } from "@/components/live/project-live";
import { HipaaCard } from "./hipaa-card";
import { NetworkingCard } from "./networking-card";

/* Project-wide setting cards fed by the live project row, keyed on the values they edit. */

export function LiveNetworkingCard({ projectId }: { projectId: string }) {
  const { project } = useLiveHeader(projectId, undefined);
  if (!project) return null;
  const settings = project.settings ?? {};
  const values = {
    blockPublic: settings.block_public_connections ?? false,
    blockVpc: settings.block_vpc_connections ?? false,
    ips: settings.allowed_ips?.ips ?? [],
    protectedOnly: settings.allowed_ips?.protected_branches_only ?? false,
  };
  return (
    <NetworkingCard
      key={JSON.stringify(values)}
      projectId={projectId}
      initialBlockPublic={values.blockPublic}
      initialBlockVpc={values.blockVpc}
      initialIps={values.ips}
      initialProtectedOnly={values.protectedOnly}
    />
  );
}

export function LiveHipaaCard({ projectId }: { projectId: string }) {
  const { project } = useLiveHeader(projectId, undefined);
  if (!project) return null;
  const enabled = project.settings?.hipaa ?? false;
  return <HipaaCard key={String(enabled)} projectId={projectId} initialEnabled={enabled} />;
}
