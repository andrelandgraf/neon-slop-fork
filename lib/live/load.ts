import "server-only";
import type { SealedLiveQuery } from "@neon/realtime/server";
import { reconcileLater } from "@/lib/mirror/sync";
import { failInterruptedCreationsLater } from "@/lib/projects/creation";
import type { PageIdentity } from "@/lib/tenancy";
import { realtime } from "./realtime";
import {
  orgBranchesQuery,
  orgMembersQuery,
  orgsQuery,
  projectCreationsQuery,
  projectsQuery,
} from "./queries";

/** The sealed query and the rows a page renders before the subscription's first result. */
export interface LiveSeed<Row> {
  initialData: Row[];
  sealedQuery: SealedLiveQuery<Row>;
}

const definitions = {
  orgs: { query: (id: PageIdentity) => orgsQuery(id.userId), reconcile: () => {} },
  "org-members": { query: (id: PageIdentity) => orgMembersQuery(id.userId, id.orgId), reconcile: () => {} },
  projects: {
    query: (id: PageIdentity) => projectsQuery(id.userId, id.orgId),
    reconcile: (id: PageIdentity) => reconcileLater({ orgId: id.orgId }),
  },
  "org-branches": {
    query: (id: PageIdentity) => orgBranchesQuery(id.userId, id.orgId),
    reconcile: (id: PageIdentity) => reconcileLater({ orgId: id.orgId }),
  },
  "project-creations": {
    query: (id: PageIdentity) => projectCreationsQuery(id.userId, id.orgId),
    reconcile: (id: PageIdentity) => failInterruptedCreationsLater(id.orgId),
  },
} as const;

export type LiveCollectionName = keyof typeof definitions;

export function isLiveCollectionName(value: string): value is LiveCollectionName {
  return Object.hasOwn(definitions, value);
}

/** Seals the collection's query for a renewal and schedules its background reconcile. */
export async function sealLive(name: LiveCollectionName, identity: PageIdentity) {
  const definition = definitions[name];
  definition.reconcile(identity);
  return realtime.seal({ query: definition.query(identity) });
}

/** Reads and seals the same query for a server render. */
export async function loadLive<Name extends LiveCollectionName>(
  name: Name,
  identity: PageIdentity
): Promise<LiveSeed<Awaited<ReturnType<(typeof definitions)[Name]["query"]>>[number]>> {
  const query = definitions[name].query(identity);
  const [initialData, sealedQuery] = await Promise.all([query, realtime.seal({ query })]);
  return { initialData, sealedQuery };
}
