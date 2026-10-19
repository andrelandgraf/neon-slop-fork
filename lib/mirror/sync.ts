import "server-only";
import { after } from "next/server";
import { and, eq, notInArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { NeonApiError } from "@neon/sdk";
import { db } from "@/lib/db/client";
import {
  appProject,
  mirrorSync,
  neonBranch,
  neonDatabase,
  neonEndpoint,
  neonOperation,
  neonProject,
  neonRole,
} from "@/lib/db/schema";
import { neon, neonSdk } from "@/lib/neon";
import { branchRow, databaseRow, endpointRow, operationRow, projectRow, roleRow } from "./rows";
import { changedColumns, excludedSet, gatedInsert, txid } from "./sql";

/** What a write did to the rows a collection subscribes to. */
export type MirrorResult = { kind: "committed"; txid: string } | { kind: "unchanged" };

export interface ProjectSync {
  project: MirrorResult;
  branches: MirrorResult;
  endpoints: MirrorResult;
  operations: MirrorResult;
  /** An operation was still scheduled or running when the snapshot was read. */
  inFlight: boolean;
}

export interface BranchSync {
  databases: MirrorResult;
  roles: MirrorResult;
}

export const BACKGROUND_MAX_AGE_MS = 20_000;
const IN_FLIGHT = new Set(["scheduling", "running", "cancelling"]);

export const scope = {
  org: (orgId: string) => `org:${orgId}`,
  project: (projectId: string) => `project:${projectId}`,
  branch: (projectId: string, branchId: string) => `branch:${projectId}:${branchId}`,
  services: (projectId: string, branchId: string) => `services:${projectId}:${branchId}`,
  extras: (projectId: string) => `extras:${projectId}`,
  masking: (projectId: string, branchId: string) => `masking:${projectId}:${branchId}`,
};

export function result(...rowSets: { txid: string }[][]): MirrorResult {
  const first = rowSets.flat()[0];
  return first ? { kind: "committed", txid: first.txid } : { kind: "unchanged" };
}

export async function databaseNow(): Promise<string> {
  const { rows } = await db.execute<{ now: string }>(sql`select now()::text as now`);
  const row = rows[0];
  if (!row) throw new Error("select now() returned no row");
  return row.now;
}

/**
 * Claims a scope for a background reconcile. Returns the database time to
 * use as the snapshot's version, or null when another request holds the
 * scope or it synced within `maxAgeMs`. An abandoned claim expires after 60 s.
 */
export async function claim(scopeKey: string, maxAgeMs: number): Promise<string | null> {
  const { rows } = await db.execute<{ started: string }>(sql`
    insert into mirror_sync (scope, claimed_at) values (${scopeKey}, now())
    on conflict (scope) do update set claimed_at = now()
    where (mirror_sync.claimed_at is null or mirror_sync.claimed_at < now() - interval '60 seconds')
      and (mirror_sync.synced_at is null or mirror_sync.synced_at < now() - ${maxAgeMs} * interval '1 millisecond')
    returning now()::text as started`);
  return rows[0]?.started ?? null;
}

export function markSynced(scopeKey: string) {
  return db
    .insert(mirrorSync)
    .values({ scope: scopeKey, synced_at: sql`now()`, claimed_at: null })
    .onConflictDoUpdate({ target: mirrorSync.scope, set: { synced_at: sql`now()`, claimed_at: null } });
}

/**
 * Raises the scope's applied version to this snapshot's, unless a newer
 * snapshot already applied. Concurrent syncs of one scope serialize on this
 * row, so each later statement of the batch can check `appliedIs(version)`
 * and an older snapshot that commits last writes nothing.
 */
export function applyVersion(scopeKey: string, version: SQL) {
  return db
    .insert(mirrorSync)
    .values({ scope: scopeKey, applied_version: version })
    .onConflictDoUpdate({
      target: mirrorSync.scope,
      set: { applied_version: sql`excluded.applied_version` },
      setWhere: sql`${mirrorSync.applied_version} is null or ${mirrorSync.applied_version} <= excluded.applied_version`,
    });
}

export const appliedIs = (scopeKey: string, version: SQL) =>
  sql`exists (select 1 from mirror_sync where scope = ${scopeKey} and applied_version = ${version})`;

/** Inserts or updates a snapshot's rows, only while it's the newest applied snapshot of its scope. */
export function upsert(table: PgTable, target: PgColumn[], keys: string[], rows: Record<string, unknown>[], gate: SQL) {
  return gatedInsert(table, rows, gate)
    .onConflictDoUpdate({ target, set: excludedSet(table, keys), setWhere: changedColumns(table) })
    .returning({ txid });
}

/**
 * Mirrors one project with its branches, computes and newest operations.
 * `version` is the database time taken before the API reads; it defaults to
 * now, which is right for a sync that follows a write the caller just made.
 */
export async function syncProject(projectId: string, version?: string): Promise<ProjectSync> {
  const started = version ?? (await databaseNow());
  const v = sql`${started}::timestamptz`;
  const scopeKey = scope.project(projectId);
  const current = appliedIs(scopeKey, v);
  let snapshot;
  try {
    const [projectRes, branchesRes, endpointsRes, operationsPage] = await Promise.all([
      neon.getProject(projectId),
      neon.listProjectBranches({ projectId }),
      neon.listProjectEndpoints(projectId),
      neonSdk.operations.list({ projectId }).page(),
    ]);
    snapshot = {
      project: projectRes.data.project,
      branches: branchesRes.data.branches,
      endpoints: endpointsRes.data.endpoints,
      operations: operationsPage.items,
    };
  } catch (error) {
    // Deleted, or claimed into another Neon account. Child rows cascade.
    if (error instanceof NeonApiError && error.status === 404) {
      const [, deleted] = await db.batch([
        applyVersion(scopeKey, v),
        db.delete(neonProject).where(and(eq(neonProject.id, projectId), current)).returning({ txid }),
        markSynced(scopeKey),
      ]);
      const gone = result(deleted);
      return { project: gone, branches: gone, endpoints: gone, operations: gone, inFlight: false };
    }
    throw error;
  }
  const { project, branches, endpoints, operations } = snapshot;
  if (branches.length === 0) throw new Error(`Neon returned no branches for project ${projectId}.`);
  const stamp = <T extends object>(row: T) => ({ ...row, mirrored_at: started });
  const absent = (column: PgColumn, ids: string[]) => (ids.length ? notInArray(column, ids) : sql`true`);

  const [, projectRows, branchRows, removedBranches, endpointRows, removedEndpoints, operationRows, removedOperations] =
    await db.batch([
      applyVersion(scopeKey, v),
      upsert(neonProject, [neonProject.id], ["id"], [stamp(projectRow(project))], current),
      upsert(neonBranch, [neonBranch.id], ["id"], branches.map((b) => stamp(branchRow(b))), current),
      db
        .delete(neonBranch)
        .where(and(eq(neonBranch.project_id, projectId), absent(neonBranch.id, branches.map((b) => b.id)), current))
        .returning({ txid }),
      upsert(neonEndpoint, [neonEndpoint.id], ["id"], endpoints.map((e) => stamp(endpointRow(e))), current),
      db
        .delete(neonEndpoint)
        .where(and(eq(neonEndpoint.project_id, projectId), absent(neonEndpoint.id, endpoints.map((e) => e.id)), current))
        .returning({ txid }),
      upsert(neonOperation, [neonOperation.id], ["id"], operations.map((o) => stamp(operationRow(o))), current),
      db
        .delete(neonOperation)
        .where(
          and(eq(neonOperation.project_id, projectId), absent(neonOperation.id, operations.map((o) => o.id)), current)
        )
        .returning({ txid }),
      markSynced(scopeKey),
    ]);
  return {
    project: result(projectRows),
    branches: result(branchRows, removedBranches),
    endpoints: result(endpointRows, removedEndpoints),
    operations: result(operationRows, removedOperations),
    inFlight: operations.some((o) => IN_FLIGHT.has(o.status)),
  };
}

/** Mirrors one branch's databases and roles. */
export async function syncBranch(projectId: string, branchId: string, version?: string): Promise<BranchSync> {
  const started = version ?? (await databaseNow());
  const v = sql`${started}::timestamptz`;
  const scopeKey = scope.branch(projectId, branchId);
  const current = appliedIs(scopeKey, v);
  let databases;
  let roles;
  try {
    const [databasesRes, rolesRes] = await Promise.all([
      neon.listProjectBranchDatabases(projectId, branchId),
      neon.listProjectBranchRoles(projectId, branchId),
    ]);
    databases = databasesRes.data.databases;
    roles = rolesRes.data.roles;
  } catch (error) {
    // The branch is gone; its rows cascade from neon_branch when the project syncs.
    if (error instanceof NeonApiError && error.status === 404) {
      return { databases: { kind: "unchanged" }, roles: { kind: "unchanged" } };
    }
    throw error;
  }
  // The branch row must exist for the foreign key; a branch the project
  // mirror hasn't seen yet gets it on this project sync.
  const [mirrored] = await db.select({ id: neonBranch.id }).from(neonBranch).where(eq(neonBranch.id, branchId));
  if (!mirrored) await syncProject(projectId);
  const stamp = <T extends object>(row: T) => ({ ...row, mirrored_at: started });
  const names = (list: { name: string }[]) => list.map((x) => x.name);

  const [, databaseRows, removedDatabases, roleRows, removedRoles] = await db.batch([
    applyVersion(scopeKey, v),
    upsert(
      neonDatabase,
      [neonDatabase.branch_id, neonDatabase.name],
      ["branch_id", "name"],
      databases.map((d) => stamp(databaseRow(projectId, d))),
      current
    ),
    db
      .delete(neonDatabase)
      .where(
        and(
          eq(neonDatabase.branch_id, branchId),
          databases.length ? notInArray(neonDatabase.name, names(databases)) : sql`true`,
          current
        )
      )
      .returning({ txid }),
    upsert(
      neonRole,
      [neonRole.branch_id, neonRole.name],
      ["branch_id", "name"],
      roles.map((r) => stamp(roleRow(projectId, r))),
      current
    ),
    db
      .delete(neonRole)
      .where(and(eq(neonRole.branch_id, branchId), roles.length ? notInArray(neonRole.name, names(roles)) : sql`true`, current))
      .returning({ txid }),
    markSynced(scopeKey),
  ]);
  return { databases: result(databaseRows, removedDatabases), roles: result(roleRows, removedRoles) };
}

/** Mirrors every project the org owns. */
export async function syncOrg(orgId: string): Promise<void> {
  const owned = await db
    .select({ projectId: appProject.projectId })
    .from(appProject)
    .where(eq(appProject.orgId, orgId));
  await Promise.all(owned.map(({ projectId }) => syncProject(projectId)));
  await markSynced(scope.org(orgId));
}

async function reconcileOrg(orgId: string): Promise<void> {
  if (!(await claim(scope.org(orgId), BACKGROUND_MAX_AGE_MS))) return;
  const owned = await db
    .select({ projectId: appProject.projectId })
    .from(appProject)
    .where(eq(appProject.orgId, orgId));
  await Promise.all(owned.map(({ projectId }) => reconcileProject(projectId)));
  await markSynced(scope.org(orgId));
}

export async function reconcileProject(projectId: string): Promise<void> {
  const started = await claim(scope.project(projectId), BACKGROUND_MAX_AGE_MS);
  if (started) await syncProject(projectId, started);
}

async function reconcileBranch(projectId: string, branchId: string): Promise<void> {
  if (!(await branchIsMirrored(projectId, branchId))) return reconcileProject(projectId);
  const started = await claim(scope.branch(projectId, branchId), BACKGROUND_MAX_AGE_MS);
  if (started) await syncBranch(projectId, branchId, started);
}

/** Schedules a throttled background reconcile after the response is sent. */
export function reconcileLater(
  target: { orgId: string } | { projectId: string; branchId?: string }
): void {
  after(() => {
    if ("orgId" in target) return reconcileOrg(target.orgId);
    if (target.branchId) return reconcileBranch(target.projectId, target.branchId);
    return reconcileProject(target.projectId);
  });
}

const FOLLOW_INTERVAL_MS = 1_500;
const FOLLOW_LIMIT_MS = 45_000;

/**
 * Keeps syncing a project while Neon operations it started are still
 * running, so states like a compute starting or a branch being created move
 * in the live views. Best effort inside the function's time budget: the
 * renewal reconciles catch anything it doesn't see.
 */
export function followOperations(projectId: string): void {
  after(async () => {
    const deadline = Date.now() + FOLLOW_LIMIT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, FOLLOW_INTERVAL_MS));
      const { inFlight } = await syncProject(projectId);
      if (!inFlight) return;
    }
  });
}

/**
 * Before a page renders an org's mirror: a scope that never synced is synced
 * now, so existing projects never render as an empty list; otherwise the
 * page renders what's mirrored and a reconcile runs after the response.
 */
export async function ensureOrgMirrored(orgId: string): Promise<void> {
  if (!(await syncedOnce(scope.org(orgId)))) {
    await syncOrg(orgId);
    return;
  }
  reconcileLater({ orgId });
}

/** `ensureOrgMirrored` for one project's computes and operations. */
export async function ensureProjectMirrored(projectId: string): Promise<void> {
  if (!(await syncedOnce(scope.project(projectId)))) {
    await syncProject(projectId);
    return;
  }
  reconcileLater({ projectId });
}

/** `ensureOrgMirrored` for one branch's databases and roles. */
export async function ensureBranchMirrored(projectId: string, branchId: string): Promise<void> {
  if (!(await syncedOnce(scope.branch(projectId, branchId)))) {
    await syncBranch(projectId, branchId);
    return;
  }
  reconcileLater({ projectId, branchId });
}

export async function syncedOnce(scopeKey: string): Promise<boolean> {
  const [row] = await db.select({ synced_at: mirrorSync.synced_at }).from(mirrorSync).where(eq(mirrorSync.scope, scopeKey));
  return Boolean(row?.synced_at);
}

/**
 * Branch ids in renewals come from the browser. Background reconciles only
 * claim a scope for a branch the project mirror knows; an unknown one (new,
 * or invented) waits for the throttled project reconcile instead of minting
 * a scope per request.
 */
export async function branchIsMirrored(projectId: string, branchId: string): Promise<boolean> {
  const [known] = await db
    .select({ id: neonBranch.id })
    .from(neonBranch)
    .where(and(eq(neonBranch.id, branchId), eq(neonBranch.project_id, projectId)));
  return Boolean(known);
}
