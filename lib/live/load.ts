import "server-only";
import type { SealedLiveQuery } from "@neon/realtime/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appProject } from "@/lib/db/schema";
import { reconcileLater } from "@/lib/mirror/sync";
import { failInterruptedCreationsLater } from "@/lib/projects/creation";
import type { PageIdentity } from "@/lib/tenancy";
import { realtime } from "./realtime";
import {
  databasesQuery,
  endpointsQuery,
  operationsQuery,
  orgBranchesQuery,
  orgMembersQuery,
  orgsQuery,
  projectBranchesQuery,
  projectCreationsQuery,
  projectsQuery,
  rolesQuery,
} from "./queries";

/** The sealed query and the rows a page renders before the subscription's first result. */
export interface LiveSeed<Row> {
  initialData: Row[];
  sealedQuery: SealedLiveQuery<Row>;
}

/** What a live query is parameterized by: the page's identity, plus a project and branch where it's scoped to one. */
export interface LiveParams extends PageIdentity {
  projectId?: string;
  branchId?: string;
}

function projectOf(params: LiveParams): string {
  if (!params.projectId) throw new LiveParamsError("projectId is required.");
  return params.projectId;
}

function branchOf(params: LiveParams): string {
  if (!params.branchId) throw new LiveParamsError("branchId is required.");
  return params.branchId;
}

export class LiveParamsError extends Error {}

const definitions = {
  orgs: { query: (p: LiveParams) => orgsQuery(p.userId), reconcile: () => {} },
  "org-members": { query: (p: LiveParams) => orgMembersQuery(p.userId, p.orgId), reconcile: () => {} },
  projects: {
    query: (p: LiveParams) => projectsQuery(p.userId, p.orgId),
    reconcile: (p: LiveParams) => reconcileLater({ orgId: p.orgId }),
  },
  "org-branches": {
    query: (p: LiveParams) => orgBranchesQuery(p.userId, p.orgId),
    reconcile: (p: LiveParams) => reconcileLater({ orgId: p.orgId }),
  },
  "project-creations": {
    query: (p: LiveParams) => projectCreationsQuery(p.userId, p.orgId),
    reconcile: (p: LiveParams) => failInterruptedCreationsLater(p.orgId),
  },
  "project-branches": {
    query: (p: LiveParams) => projectBranchesQuery(p.userId, p.orgId, projectOf(p)),
    reconcile: (p: LiveParams) => reconcileLater({ projectId: projectOf(p) }),
  },
  endpoints: {
    query: (p: LiveParams) => endpointsQuery(p.userId, p.orgId, projectOf(p)),
    reconcile: (p: LiveParams) => reconcileLater({ projectId: projectOf(p) }),
  },
  operations: {
    query: (p: LiveParams) => operationsQuery(p.userId, p.orgId, projectOf(p)),
    reconcile: (p: LiveParams) => reconcileLater({ projectId: projectOf(p) }),
  },
  databases: {
    query: (p: LiveParams) => databasesQuery(p.userId, p.orgId, projectOf(p), branchOf(p)),
    reconcile: (p: LiveParams) => reconcileLater({ projectId: projectOf(p), branchId: branchOf(p) }),
  },
  roles: {
    query: (p: LiveParams) => rolesQuery(p.userId, p.orgId, projectOf(p), branchOf(p)),
    reconcile: (p: LiveParams) => reconcileLater({ projectId: projectOf(p), branchId: branchOf(p) }),
  },
} as const;

export type LiveCollectionName = keyof typeof definitions;

export function isLiveCollectionName(value: string): value is LiveCollectionName {
  return Object.hasOwn(definitions, value);
}

/** A project-scoped renewal for a project the org doesn't own is refused up front. */
export async function projectBelongsToOrg(params: LiveParams): Promise<boolean> {
  if (!params.projectId) return true;
  const [owned] = await db
    .select({ id: appProject.projectId })
    .from(appProject)
    .where(and(eq(appProject.projectId, params.projectId), eq(appProject.orgId, params.orgId)));
  return Boolean(owned);
}

/** Seals the collection's query for a renewal and schedules its background reconcile. */
export async function sealLive(name: LiveCollectionName, params: LiveParams) {
  const definition = definitions[name];
  const query = definition.query(params);
  definition.reconcile(params);
  return realtime.seal({ query });
}

/** Reads and seals the same query for a server render. */
export async function loadLive<Name extends LiveCollectionName>(
  name: Name,
  params: LiveParams
): Promise<LiveSeed<Awaited<ReturnType<(typeof definitions)[Name]["query"]>>[number]>> {
  const query = definitions[name].query(params);
  const [initialData, sealedQuery] = await Promise.all([query, realtime.seal({ query })]);
  return { initialData, sealedQuery };
}
