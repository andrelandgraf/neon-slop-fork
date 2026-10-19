"use client";
import { useLiveHeader } from "@/components/live/project-live";
import { useSidebarBranches } from "@/components/sidebar";
import { GeneralSettings } from "./general-settings";

/**
 * Feeds the general settings the live project, branch and branch list. Keyed
 * on the live names, so a rename from another tab refreshes the form fields.
 */
export function LiveGeneralSettings({
  projectId,
  branchId,
  otherOrgs,
  claimLinkExpiresAt,
}: {
  projectId: string;
  branchId: string;
  otherOrgs: { id: string; name: string }[];
  claimLinkExpiresAt: string | null;
}) {
  const { project, branch } = useLiveHeader(projectId, branchId);
  const branches = useSidebarBranches();
  if (!project || !branch) return null;
  return (
    <GeneralSettings
      key={`${branch.id}:${branch.name}:${project.name}`}
      project={{ id: project.id, name: project.name }}
      branch={{
        id: branch.id,
        name: branch.name,
        default: branch.default,
        protected: branch.protected,
        expiresAt: branch.expires_at?.toISOString(),
      }}
      branches={branches}
      otherOrgs={otherOrgs}
      claimLinkExpiresAt={claimLinkExpiresAt}
    />
  );
}
