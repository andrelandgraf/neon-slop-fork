"use client";
import { useLiveQuery } from "@tanstack/react-db";
import { LiveStatus } from "@/components/live/live-status";
import { useCollaborators } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { CollaboratorRow } from "@/lib/live/queries";
import { CollaboratorsCard } from "../collaborators-card";

/** The project's collaborators, live; keyed on the live list so the card's local state follows it. */
export function LiveCollaborators({
  projectId,
  ownerOrgName,
  collaborators: seed,
}: {
  projectId: string;
  ownerOrgName: string;
  collaborators: LiveSeed<CollaboratorRow>;
}) {
  const collection = useCollaborators(seed);
  const query = useLiveQuery((q) => q.from({ c: collection }));
  const collaborators = query.data
    .map((row) => row.data)
    .filter((p) => !p.revoked_at)
    .map((p) => ({ id: p.id, email: p.granted_to_email, grantedAt: p.granted_at }));
  return (
    <>
      <LiveStatus queries={[query]} />
      <CollaboratorsCard
        key={collaborators.map((c) => c.id).join(",")}
        projectId={projectId}
        ownerOrgName={ownerOrgName}
        collaborators={collaborators}
      />
    </>
  );
}
