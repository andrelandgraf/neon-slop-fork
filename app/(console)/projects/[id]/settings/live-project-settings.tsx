"use client";
import { useLiveHeader } from "@/components/live/project-live";
import { HipaaCard } from "./hipaa-card";
import { NetworkingCard } from "./networking-card";

/* Project-wide setting cards fed by the live project row. */

export function LiveNetworkingCard({ projectId }: { projectId: string }) {
  const { project } = useLiveHeader(projectId, undefined);
  if (!project) return null;
  const settings = project.settings ?? {};
  return (
    <NetworkingCard
      projectId={projectId}
      initialBlockPublic={settings.block_public_connections ?? false}
      initialBlockVpc={settings.block_vpc_connections ?? false}
      initialIps={settings.allowed_ips?.ips ?? []}
      initialProtectedOnly={settings.allowed_ips?.protected_branches_only ?? false}
    />
  );
}

export function LiveHipaaCard({ projectId }: { projectId: string }) {
  const { project } = useLiveHeader(projectId, undefined);
  if (!project) return null;
  const enabled = project.settings?.hipaa ?? false;
  return <HipaaCard key={String(enabled)} projectId={projectId} initialEnabled={enabled} />;
}
