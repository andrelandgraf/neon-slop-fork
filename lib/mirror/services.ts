import "server-only";
import { after } from "next/server";
import { and, eq, isNull, notInArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { NeonApiError } from "@neon/sdk";
import { getProjectCapabilities } from "@/lib/capabilities";
import { db } from "@/lib/db/client";
import {
  neonBranch,
  neonBranchService,
  neonBucket,
  neonCredential,
  neonCustomDomain,
  neonDataApi,
  neonFunction,
  neonMaskingStatus,
  neonProjectPermission,
  neonSnapshot,
  neonSnapshotSchedule,
  neonTrigger,
} from "@/lib/db/schema";
import { ifFound, neon, neonRaw, neonSdk, type NeonFunction } from "@/lib/neon";
import { txid } from "./sql";
import {
  appliedIs,
  applyVersion,
  BACKGROUND_MAX_AGE_MS,
  branchIsMirrored,
  claim,
  databaseNow,
  markSynced,
  reconcileProject,
  result,
  scope,
  syncedOnce,
  syncProject,
  upsert,
  type MirrorResult,
} from "./sync";

const absent = (column: PgColumn, keys: string[]) => (keys.length ? notInArray(column, keys) : sql`true`);

/** Deployments can list environment variables; the console never shows them, so they aren't stored. */
function withoutEnvironment(fn: NeonFunction): NeonFunction {
  const strip = (d: NeonFunction["current_deployment"]) => (d ? { ...d, environment: undefined } : undefined);
  return { ...fn, current_deployment: strip(fn.current_deployment), active_deployment: strip(fn.active_deployment) };
}

async function defaultBranchId(projectId: string): Promise<string> {
  const [row] = await db
    .select({ id: neonBranch.id })
    .from(neonBranch)
    .where(and(eq(neonBranch.project_id, projectId), eq(neonBranch.default, true)));
  if (row) return row.id;
  await syncProject(projectId);
  return defaultBranchId(projectId);
}

async function ensureBranchRow(projectId: string, branchId: string): Promise<void> {
  if (!(await branchIsMirrored(projectId, branchId))) await syncProject(projectId);
}

/**
 * Mirrors one branch's app-backend state: which services are on, its Data
 * APIs, buckets, functions, triggers, custom domains and credential metadata.
 * Services the project's region doesn't offer are skipped rather than probed.
 */
export async function syncServices(projectId: string, branchId: string, version?: string): Promise<MirrorResult> {
  const started = version ?? (await databaseNow());
  const v = sql`${started}::timestamptz`;
  const scopeKey = scope.services(projectId, branchId);
  const current = appliedIs(scopeKey, v);
  const caps = await getProjectCapabilities(projectId, await defaultBranchId(projectId));
  const scoped = { projectId, branchId };
  let snapshot;
  try {
    const [realtime, auth, storage, aiGateway, databases, functions, triggers, domains, credentials] = await Promise.all([
      caps.realtime ? ifFound(neonSdk.realtime.get(scoped)) : null,
      ifFound(neonSdk.auth.get(scoped)),
      caps.storage ? ifFound(neonSdk.storage.get(scoped)) : null,
      caps.aiGateway ? ifFound(neonSdk.aiGateway.get(scoped)) : null,
      neon.listProjectBranchDatabases(projectId, branchId).then((r) => r.data.databases),
      caps.functions ? neonSdk.functions.list(scoped).all() : [],
      caps.functions ? neonSdk.triggers.list(scoped) : [],
      caps.functions ? neonSdk.functions.customDomains.list(scoped).all() : [],
      caps.credentials ? neonSdk.credentials.list(scoped) : [],
    ]);
    const [dataApis, buckets] = await Promise.all([
      Promise.all(
        databases.map(async (d) => ({
          name: d.name,
          api: await ifFound(neonSdk.postgres.dataApi.get({ ...scoped, databaseName: d.name })),
        }))
      ),
      storage?.enabled ? (ifFound(neonSdk.storage.buckets.list(scoped)).then((b) => b ?? [])) : [],
    ]);
    snapshot = { realtime, auth, storage, aiGateway, dataApis, buckets, functions, triggers, domains, credentials };
  } catch (error) {
    // The branch is gone; its rows cascade when the project syncs.
    if (error instanceof NeonApiError && error.status === 404) return { kind: "unchanged" };
    throw error;
  }
  await ensureBranchRow(projectId, branchId);
  const s = snapshot;
  const keys = <T>(rows: T[], key: (row: T) => string) => rows.map(key);
  const apis = s.dataApis.flatMap((d) => (d.api ? [{ name: d.name, api: d.api }] : []));
  const branchRows = <T extends object>(rows: T[]) =>
    rows.map((row) => ({ ...row, project_id: projectId, branch_id: branchId, mirrored_at: started }));
  const ofBranch = (column: PgColumn) => eq(column, branchId);

  const [, service, apisUp, apisDown, bucketsUp, bucketsDown, fnsUp, fnsDown, trgUp, trgDown, domUp, domDown, credUp, credDown] =
    await db.batch([
    applyVersion(scopeKey, v),
    upsert(
      neonBranchService,
      [neonBranchService.branch_id],
      ["branch_id"],
      branchRows([{ realtime: s.realtime, auth: s.auth, storage: s.storage, ai_gateway: s.aiGateway }]),
      current
    ),
    upsert(
      neonDataApi,
      [neonDataApi.branch_id, neonDataApi.database_name],
      ["branch_id", "database_name"],
      branchRows(apis.map((d) => ({ database_name: d.name, data: d.api }))),
      current
    ),
    db
      .delete(neonDataApi)
      .where(and(ofBranch(neonDataApi.branch_id), absent(neonDataApi.database_name, keys(apis, (d) => d.name)), current))
      .returning({ txid }),
    upsert(
      neonBucket,
      [neonBucket.branch_id, neonBucket.name],
      ["branch_id", "name"],
      branchRows(s.buckets.map((b) => ({ name: b.name, access_level: b.access_level, created_at: b.created_at }))),
      current
    ),
    db
      .delete(neonBucket)
      .where(and(ofBranch(neonBucket.branch_id), absent(neonBucket.name, keys(s.buckets, (b) => b.name)), current))
      .returning({ txid }),
    upsert(
      neonFunction,
      [neonFunction.id],
      ["id"],
      branchRows(s.functions.map((f) => ({ id: f.id, data: withoutEnvironment(f) }))),
      current
    ),
    db
      .delete(neonFunction)
      .where(and(ofBranch(neonFunction.branch_id), absent(neonFunction.id, keys(s.functions, (f) => f.id)), current))
      .returning({ txid }),
    upsert(
      neonTrigger,
      [neonTrigger.trigger_id],
      ["trigger_id"],
      branchRows(s.triggers.map((t) => ({ trigger_id: t.trigger_id, data: t }))),
      current
    ),
    db
      .delete(neonTrigger)
      .where(
        and(ofBranch(neonTrigger.branch_id), absent(neonTrigger.trigger_id, keys(s.triggers, (t) => t.trigger_id)), current)
      )
      .returning({ txid }),
    upsert(
      neonCustomDomain,
      [neonCustomDomain.domain],
      ["domain"],
      branchRows(s.domains.map((d) => ({ domain: d.domain, data: d }))),
      current
    ),
    db
      .delete(neonCustomDomain)
      .where(
        and(ofBranch(neonCustomDomain.branch_id), absent(neonCustomDomain.domain, keys(s.domains, (d) => d.domain)), current)
      )
      .returning({ txid }),
    upsert(
      neonCredential,
      [neonCredential.token_id],
      ["token_id"],
      branchRows(s.credentials.map((c) => ({ token_id: c.token_id, data: c }))),
      current
    ),
    db
      .delete(neonCredential)
      .where(
        and(
          ofBranch(neonCredential.branch_id),
          absent(neonCredential.token_id, keys(s.credentials, (c) => c.token_id)),
          current
        )
      )
      .returning({ txid }),
    markSynced(scopeKey),
  ]);
  return result(service, apisUp, apisDown, bucketsUp, bucketsDown, fnsUp, fnsDown, trgUp, trgDown, domUp, domDown, credUp, credDown);
}

/** Mirrors a project's snapshots, its root branches' snapshot schedules, and its collaborators. */
export async function syncExtras(projectId: string, version?: string): Promise<MirrorResult> {
  const started = version ?? (await databaseNow());
  const v = sql`${started}::timestamptz`;
  const scopeKey = scope.extras(projectId);
  const current: SQL = appliedIs(scopeKey, v);
  const roots = await db
    .select({ id: neonBranch.id })
    .from(neonBranch)
    .where(and(eq(neonBranch.project_id, projectId), isNull(neonBranch.parent_id)));
  const [snapshots, schedules, permissions] = await Promise.all([
    neonSdk.snapshots.list({ projectId }),
    Promise.all(
      roots.map(async (b) => ({
        branchId: b.id,
        items: (await neonSdk.snapshots.getSchedule({ projectId, branchId: b.id })).schedule,
      }))
    ),
    neon.listProjectPermissions(projectId).then((r) => r.data.project_permissions),
  ]);
  const stamp = <T extends object>(row: T) => ({ ...row, project_id: projectId, mirrored_at: started });

  const [, snapsUp, snapsDown, schedulesUp, permsUp, permsDown] = await db.batch([
    applyVersion(scopeKey, v),
    upsert(neonSnapshot, [neonSnapshot.id], ["id"], snapshots.map((x) => stamp({ id: x.id, data: x })), current),
    db
      .delete(neonSnapshot)
      .where(and(eq(neonSnapshot.project_id, projectId), absent(neonSnapshot.id, snapshots.map((x) => x.id)), current))
      .returning({ txid }),
    upsert(
      neonSnapshotSchedule,
      [neonSnapshotSchedule.branch_id],
      ["branch_id"],
      schedules.map((x) => stamp({ branch_id: x.branchId, data: x.items })),
      current
    ),
    upsert(
      neonProjectPermission,
      [neonProjectPermission.id],
      ["id"],
      permissions.map((x) => stamp({ id: x.id, data: x })),
      current
    ),
    db
      .delete(neonProjectPermission)
      .where(
        and(
          eq(neonProjectPermission.project_id, projectId),
          absent(neonProjectPermission.id, permissions.map((x) => x.id)),
          current
        )
      )
      .returning({ txid }),
    markSynced(scopeKey),
  ]);
  return result(snapsUp, snapsDown, schedulesUp, permsUp, permsDown);
}

/** Mirrors an anonymized branch's masking status; other branches have none. */
export async function syncMasking(projectId: string, branchId: string, version?: string): Promise<MirrorResult> {
  const started = version ?? (await databaseNow());
  const v = sql`${started}::timestamptz`;
  const scopeKey = scope.masking(projectId, branchId);
  const current = appliedIs(scopeKey, v);
  const status = await ifFound(neonRaw.getAnonymizedStatus(projectId, branchId));
  await ensureBranchRow(projectId, branchId);
  const [, upserted, removed] = await db.batch([
    applyVersion(scopeKey, v),
    upsert(
      neonMaskingStatus,
      [neonMaskingStatus.branch_id],
      ["branch_id"],
      status ? [{ branch_id: branchId, project_id: projectId, data: status, mirrored_at: started }] : [],
      current
    ),
    db
      .delete(neonMaskingStatus)
      .where(and(eq(neonMaskingStatus.branch_id, branchId), status ? sql`false` : sql`true`, current))
      .returning({ txid }),
    markSynced(scopeKey),
  ]);
  return result(upserted, removed);
}

/** Keeps syncing a branch's services while Neon reports Realtime as pending, within the request's time budget. */
export function followServices(projectId: string, branchId: string): void {
  after(async () => {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      const [row] = await db
        .select({ realtime: neonBranchService.realtime })
        .from(neonBranchService)
        .where(eq(neonBranchService.branch_id, branchId));
      if (!row?.realtime?.pending) return;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await syncServices(projectId, branchId);
    }
  });
}

const MASKING_BUSY = new Set(["created", "anonymizing"]);

/** Keeps syncing a branch's masking status while Neon sets it up or anonymizes, within the request's time budget. */
export function followMasking(projectId: string, branchId: string): void {
  after(async () => {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await syncMasking(projectId, branchId);
      const [row] = await db
        .select({ data: neonMaskingStatus.data })
        .from(neonMaskingStatus)
        .where(eq(neonMaskingStatus.branch_id, branchId));
      if (!row || !MASKING_BUSY.has(row.data.state)) return;
    }
  });
}

type Target =
  | { kind: "services"; projectId: string; branchId: string }
  | { kind: "extras"; projectId: string }
  | { kind: "masking"; projectId: string; branchId: string };

async function reconcile(target: Target): Promise<void> {
  if (target.kind !== "extras" && !(await branchIsMirrored(target.projectId, target.branchId))) {
    return reconcileProject(target.projectId);
  }
  const key =
    target.kind === "services"
      ? scope.services(target.projectId, target.branchId)
      : target.kind === "masking"
        ? scope.masking(target.projectId, target.branchId)
        : scope.extras(target.projectId);
  const started = await claim(key, BACKGROUND_MAX_AGE_MS);
  if (!started) return;
  if (target.kind === "services") await syncServices(target.projectId, target.branchId, started);
  else if (target.kind === "masking") await syncMasking(target.projectId, target.branchId, started);
  else await syncExtras(target.projectId, started);
}

/** Schedules a throttled background reconcile of a services, extras or masking scope. */
export function reconcileServicesLater(target: Target): void {
  after(() => reconcile(target));
}

/** Before a page renders a scope: sync it now if it never synced, else reconcile after the response. */
export async function ensureMirrored(target: Target): Promise<void> {
  const key =
    target.kind === "services"
      ? scope.services(target.projectId, target.branchId)
      : target.kind === "masking"
        ? scope.masking(target.projectId, target.branchId)
        : scope.extras(target.projectId);
  if (await syncedOnce(key)) {
    reconcileServicesLater(target);
    return;
  }
  if (target.kind === "services") await syncServices(target.projectId, target.branchId);
  else if (target.kind === "masking") await syncMasking(target.projectId, target.branchId);
  else await syncExtras(target.projectId);
}
