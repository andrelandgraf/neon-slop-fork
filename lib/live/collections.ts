import type { RealtimeClient, SealedLiveQuery } from "@neon/realtime/client";
import { realtimeCollectionOptions, type RealtimeCollectionConfig } from "@neon/realtime-tanstack";
import { collectionOptions } from "@tanstack/react-db";
import { renameOrgAction } from "@/lib/orgs/actions";
import { dismissCreationAction } from "@/lib/projects/create";
import type { PageIdentity } from "@/lib/tenancy";
import type { LiveCollectionName, LiveParams } from "./load";
import type {
  DatabaseRow,
  EndpointRow,
  OperationRow,
  OrgBranchRow,
  OrgMemberRow,
  OrgRow,
  ProjectBranchRow,
  ProjectCreationLiveRow,
  ProjectRow,
  RoleRow,
} from "./queries";
import { leavePage, renewLiveQuery } from "./renew";
import { ECHO_TIMEOUT_MS, NotSyncedYetError, type LiveWriteResult } from "./writes";

type Handlers<Row extends object> = Pick<RealtimeCollectionConfig<Row, string>, "onInsert" | "onUpdate" | "onDelete">;

/*
 * Cheap descriptors: the factory runs once per DbClient, and the id resolves
 * every later call to the same collection. The id carries the user and org,
 * and a session or org change is a full page load, so a collection never
 * outlives the identity it was sealed for.
 */
function liveCollection<Row extends object>(
  name: LiveCollectionName,
  params: LiveParams,
  query: SealedLiveQuery<Row>,
  getKey: (row: Row) => string,
  handlers: Handlers<Row> = {}
) {
  const id = [name, params.userId, params.orgId, params.projectId, params.branchId].filter(Boolean).join(":");
  return collectionOptions(id, (db) =>
    realtimeCollectionOptions<Row, string>({
      id,
      query,
      client: db.requireDependency<RealtimeClient>("realtime"),
      getKey,
      // A collection rebuilt after collection would start from this sealed
      // query, long expired, so keep it for the life of the page.
      gcTime: 0,
      refreshQuery: () => renewLiveQuery<Row>(name, params),
      ...handlers,
    })
  );
}

/**
 * Waits for a server action's write to come back over Realtime, so TanStack
 * DB drops the optimistic change and shows the synced row in one step.
 */
export async function settle(
  write: Promise<LiveWriteResult>,
  awaitTxId: (txid: string, timeout: number) => Promise<boolean>
): Promise<void> {
  const outcome = await write;
  if (!outcome.ok) {
    if (outcome.status === 401) leavePage();
    throw new Error(outcome.error);
  }
  if (outcome.result.kind !== "committed") return;
  await awaitTxId(outcome.result.txid, ECHO_TIMEOUT_MS).catch((cause: unknown) => {
    throw new NotSyncedYetError("Saved, but not synced yet.", { cause });
  });
}

export const orgsCollection = (identity: PageIdentity, query: SealedLiveQuery<OrgRow>) =>
  liveCollection("orgs", identity, query, (org) => org.id, {
    onUpdate: async ({ transaction, collection }) => {
      for (const { modified } of transaction.mutations) {
        await settle(renameOrgAction(identity, modified.id, modified.name), collection.utils.awaitTxId);
      }
    },
  });

export const orgMembersCollection = (identity: PageIdentity, query: SealedLiveQuery<OrgMemberRow>) =>
  liveCollection("org-members", identity, query, (member) => member.id);

export const projectsCollection = (identity: PageIdentity, query: SealedLiveQuery<ProjectRow>) =>
  liveCollection("projects", identity, query, (project) => project.id);

export const orgBranchesCollection = (identity: PageIdentity, query: SealedLiveQuery<OrgBranchRow>) =>
  liveCollection("org-branches", identity, query, (branch) => branch.id);

export const projectCreationsCollection = (
  identity: PageIdentity,
  query: SealedLiveQuery<ProjectCreationLiveRow>
) =>
  liveCollection("project-creations", identity, query, (creation) => creation.id, {
    onDelete: async ({ transaction, collection }) => {
      for (const { original } of transaction.mutations) {
        await settle(dismissCreationAction(identity, original.id), collection.utils.awaitTxId);
      }
    },
  });

export const projectBranchesCollection = (params: LiveParams, query: SealedLiveQuery<ProjectBranchRow>) =>
  liveCollection("project-branches", params, query, (branch) => branch.id);

export const endpointsCollection = (params: LiveParams, query: SealedLiveQuery<EndpointRow>) =>
  liveCollection("endpoints", params, query, (endpoint) => endpoint.id);

export const operationsCollection = (params: LiveParams, query: SealedLiveQuery<OperationRow>) =>
  liveCollection("operations", params, query, (operation) => operation.id);

export const databasesCollection = (params: LiveParams, query: SealedLiveQuery<DatabaseRow>) =>
  liveCollection("databases", params, query, (database) => `${database.branch_id}:${database.name}`);

export const rolesCollection = (params: LiveParams, query: SealedLiveQuery<RoleRow>) =>
  liveCollection("roles", params, query, (role) => `${role.branch_id}:${role.name}`);
