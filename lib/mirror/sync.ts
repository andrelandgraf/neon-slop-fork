import "server-only";
import { after } from "next/server";
import { and, eq, lt, notInArray, sql } from "drizzle-orm";
import { NeonApiError } from "@neon/sdk";
import { db } from "@/lib/db/client";
import { appProject, mirrorSync, neonBranch, neonProject } from "@/lib/db/schema";
import { neon } from "@/lib/neon";
import { branchRow, projectRow } from "./rows";
import { excludedSet, newerAndChanged, txid } from "./sql";

/** What a write did to the rows a collection subscribes to. */
export type MirrorResult = { kind: "committed"; txid: string } | { kind: "unchanged" };

export interface ProjectSync {
  project: MirrorResult;
  branches: MirrorResult;
}

const BACKGROUND_MAX_AGE_MS = 20_000;

export const scope = {
  org: (orgId: string) => `org:${orgId}`,
  project: (projectId: string) => `project:${projectId}`,
};

function result(rows: { txid: string }[]): MirrorResult {
  const first = rows[0];
  return first ? { kind: "committed", txid: first.txid } : { kind: "unchanged" };
}

async function databaseNow(): Promise<string> {
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
async function claim(scopeKey: string, maxAgeMs: number): Promise<string | null> {
  const { rows } = await db.execute<{ started: string }>(sql`
    insert into mirror_sync (scope, claimed_at) values (${scopeKey}, now())
    on conflict (scope) do update set claimed_at = now()
    where (mirror_sync.claimed_at is null or mirror_sync.claimed_at < now() - interval '60 seconds')
      and (mirror_sync.synced_at is null or mirror_sync.synced_at < now() - ${maxAgeMs} * interval '1 millisecond')
    returning now()::text as started`);
  return rows[0]?.started ?? null;
}

function markSynced(scopeKey: string) {
  return db
    .insert(mirrorSync)
    .values({ scope: scopeKey, synced_at: sql`now()`, claimed_at: null })
    .onConflictDoUpdate({ target: mirrorSync.scope, set: { synced_at: sql`now()`, claimed_at: null } });
}

/**
 * Mirrors one project and its branches. `version` is the database time taken
 * before the API reads; it defaults to now, which is right for a sync that
 * follows a write the caller just made.
 */
export async function syncProject(projectId: string, version?: string): Promise<ProjectSync> {
  const started = version ?? (await databaseNow());
  const v = sql`${started}::timestamptz`;
  let project;
  let branches;
  try {
    const [projectRes, branchesRes] = await Promise.all([
      neon.getProject(projectId),
      neon.listProjectBranches({ projectId }),
    ]);
    project = projectRes.data.project;
    branches = branchesRes.data.branches;
  } catch (error) {
    // Deleted, or claimed into another Neon account. Branch rows cascade.
    if (error instanceof NeonApiError && error.status === 404) {
      const [deleted] = await db.batch([
        db.delete(neonProject).where(eq(neonProject.id, projectId)).returning({ txid }),
        markSynced(scope.project(projectId)),
      ]);
      const gone = result(deleted);
      return { project: gone, branches: gone };
    }
    throw error;
  }
  if (branches.length === 0) throw new Error(`Neon returned no branches for project ${projectId}.`);

  const [projectRows, branchRows, removedBranches] = await db.batch([
    db
      .insert(neonProject)
      .values({ ...projectRow(project), mirrored_at: v })
      .onConflictDoUpdate({
        target: neonProject.id,
        set: excludedSet(neonProject, ["id"]),
        setWhere: newerAndChanged(neonProject, v),
      })
      .returning({ txid }),
    db
      .insert(neonBranch)
      .values(branches.map((b) => ({ ...branchRow(b), mirrored_at: v })))
      .onConflictDoUpdate({
        target: neonBranch.id,
        set: excludedSet(neonBranch, ["id"]),
        setWhere: newerAndChanged(neonBranch, v),
      })
      .returning({ txid }),
    db
      .delete(neonBranch)
      .where(
        and(
          eq(neonBranch.project_id, projectId),
          notInArray(
            neonBranch.id,
            branches.map((b) => b.id)
          ),
          lt(neonBranch.mirrored_at, v)
        )
      )
      .returning({ txid }),
    markSynced(scope.project(projectId)),
  ]);
  return { project: result(projectRows), branches: result([...branchRows, ...removedBranches]) };
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
  await Promise.all(
    owned.map(async ({ projectId }) => {
      const started = await claim(scope.project(projectId), BACKGROUND_MAX_AGE_MS);
      if (started) await syncProject(projectId, started);
    })
  );
  await markSynced(scope.org(orgId));
}

async function reconcileProject(projectId: string): Promise<void> {
  const started = await claim(scope.project(projectId), BACKGROUND_MAX_AGE_MS);
  if (started) await syncProject(projectId, started);
}

/** Schedules a throttled background reconcile after the response is sent. */
export function reconcileLater(target: { orgId: string } | { projectId: string }): void {
  after(() => ("orgId" in target ? reconcileOrg(target.orgId) : reconcileProject(target.projectId)));
}

/**
 * Before a page renders an org's mirror: a scope that never synced is synced
 * now, so existing projects never render as an empty list; otherwise the
 * page renders what's mirrored and a reconcile runs after the response.
 */
export async function ensureOrgMirrored(orgId: string): Promise<void> {
  const [row] = await db
    .select({ synced_at: mirrorSync.synced_at })
    .from(mirrorSync)
    .where(eq(mirrorSync.scope, scope.org(orgId)));
  if (!row?.synced_at) {
    await syncOrg(orgId);
    return;
  }
  reconcileLater({ orgId });
}
