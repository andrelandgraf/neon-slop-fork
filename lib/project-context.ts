import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { NeonApiError } from "@neon/sdk";
import { neon, type Branch, type Project } from "@/lib/neon";
import {
  requireProjectAccess,
  requireTenant,
  type TenantContext,
} from "@/lib/tenancy";

export interface ProjectContext {
  tenant: TenantContext;
  project: Project;
  branches: Branch[];
  defaultBranch: Branch;
}

export interface BranchContext extends ProjectContext {
  branch: Branch;
}

/**
 * Authorizes the request against the active virtual org and loads the
 * project with its branches. Every page calls this itself rather than relying
 * on the layout, because Next renders pages and layouts independently.
 * Cached per request, so the layout and the page share one round-trip.
 */
export const loadProject = cache(
  async (projectId: string): Promise<ProjectContext> => {
    const tenant = await requireTenant(`/projects/${projectId}`);
    await requireProjectAccess(tenant, projectId);
    try {
      const [projectRes, branchesRes] = await Promise.all([
        neon.getProject(projectId),
        neon.listProjectBranches({ projectId }),
      ]);
      const branches = branchesRes.data.branches;
      const defaultBranch = branches.find((b) => b.default) ?? branches[0];
      if (!defaultBranch) notFound();
      return {
        tenant,
        project: projectRes.data.project,
        branches,
        defaultBranch,
      };
    } catch (error) {
      // A project claimed into another Neon account is gone from the shared
      // org while its ownership row remains.
      if (error instanceof NeonApiError && error.status === 404) notFound();
      throw error;
    }
  }
);

/** A branch from the URL path; 404 when it isn't one of the project's. */
export async function loadBranch(
  projectId: string,
  branchId: string
): Promise<BranchContext> {
  const context = await loadProject(projectId);
  const branch = context.branches.find((b) => b.id === branchId);
  if (!branch) notFound();
  return { ...context, branch };
}

/**
 * Project-level pages (Branches, Integrations, Settings) act on the branch
 * the user came from, passed as `?branch=`. Unknown ids fall back to the
 * default branch instead of erroring, because the link may predate a delete.
 */
export async function loadProjectBranch(
  projectId: string,
  branchParam: string | undefined
): Promise<BranchContext> {
  const context = await loadProject(projectId);
  const branch =
    context.branches.find((b) => b.id === branchParam) ??
    context.defaultBranch;
  return { ...context, branch };
}

export function branchPath(
  projectId: string,
  branchId: string,
  page?: string
): string {
  const base = `/projects/${projectId}/branches/${branchId}`;
  return page ? `${base}/${page}` : base;
}
