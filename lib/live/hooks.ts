"use client";
import { useDbClient } from "@tanstack/react-db";
import { useIdentity } from "@/components/live/live-root";
import { orgBranchesCollection, orgMembersCollection, projectCreationsCollection } from "./collections";
import type { LiveSeed } from "./load";
import type { OrgBranchRow, OrgMemberRow, ProjectCreationLiveRow } from "./queries";

/*
 * Page-level collections. The server render passes a seed; the first page
 * that uses a collection creates it from that seed, and later renders and
 * navigations get the same live collection back.
 */

export function useOrgMembers(seed: LiveSeed<OrgMemberRow>) {
  const identity = useIdentity();
  return useDbClient().collection(orgMembersCollection(identity, seed.sealedQuery), { initialData: seed.initialData });
}

export function useOrgBranches(seed: LiveSeed<OrgBranchRow>) {
  const identity = useIdentity();
  return useDbClient().collection(orgBranchesCollection(identity, seed.sealedQuery), { initialData: seed.initialData });
}

export function useProjectCreations(seed: LiveSeed<ProjectCreationLiveRow>) {
  const identity = useIdentity();
  return useDbClient().collection(projectCreationsCollection(identity, seed.sealedQuery), {
    initialData: seed.initialData,
  });
}
