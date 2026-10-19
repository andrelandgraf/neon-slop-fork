"use server";
import { and, eq } from "drizzle-orm";
import { DEMO_STORAGE_LIMITS, neon, neonSdk, ORG_ID } from "@/lib/neon";
import { apiErrorMessage } from "@/lib/errors";
import { attachProjectToOrg, verifyPageIdentity, type PageIdentity } from "@/lib/tenancy";
import { APP_BACKEND_REGIONS } from "@/lib/region-catalog";
import { db } from "@/lib/db/client";
import { projectCreation } from "@/lib/db/schema";
import { txid } from "@/lib/mirror/sql";
import { mirrorProject } from "@/lib/mirror/after-write";
import type { LiveWriteResult } from "@/lib/live/writes";
import { creationUpdate, pruneCreations, recordCreationStart } from "./creation";

export interface CreateProjectInput {
  /** Picked by the browser, so a retry of the same submission can't create a second project. */
  id: string;
  identity: PageIdentity;
  name: string;
  regionId: string;
  pgVersion: number;
  databaseName: string;
  buckets: { name: string; public: boolean }[];
  storage: boolean;
  functions: boolean;
  aiGateway: boolean;
  realtime: boolean;
  auth: boolean;
}

export interface CreatedProject {
  projectId: string;
  branchId: string;
  branchName: string;
  elapsedMs: number;
  /** Service steps that failed after the project itself was created. */
  failures: { service: string; error: string }[];
  databaseUrl: string;
  pooledDatabaseUrl: string;
  authBaseUrl: string | null;
  storage: { endpoint: string; region: string; bucket?: string } | null;
  aiGatewayBaseUrl: string | null;
  realtimeUrl: string | null;
}

export type CreateProjectResult =
  | { ok: true; project: CreatedProject }
  | { ok: false; error: string; status?: 401 | 403 };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BRANCH_NAME = "production";

export async function createProjectWithServicesAction(
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  const check = await verifyPageIdentity(input.identity);
  if (!check.ok) return check;
  const { userId, orgId } = input.identity;
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid creation id." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Project name is required." };
  const backend = APP_BACKEND_REGIONS.has(input.regionId);
  if (input.buckets.length > DEMO_STORAGE_LIMITS.maxBucketsPerBranch) {
    return { ok: false, error: `This demo instance allows ${DEMO_STORAGE_LIMITS.maxBucketsPerBranch} buckets per branch.` };
  }

  await pruneCreations(orgId);
  const start = await recordCreationStart({
    id: input.id,
    orgId,
    userId,
    name,
    regionId: input.regionId,
    pgVersion: input.pgVersion,
  });
  if (start === "duplicate") return { ok: false, error: "This project is already being created." };

  const started = Date.now();
  let projectId: string;
  try {
    const { data } = await neon.createProject({
      project: {
        name,
        region_id: input.regionId,
        pg_version: input.pgVersion,
        org_id: ORG_ID,
        // The Console's new-project default; without it the API may inherit
        // `0` from the org, which leaves Backup & Restore unusable.
        history_retention_seconds: 6 * 60 * 60,
        branch: { name: BRANCH_NAME, database_name: input.databaseName.trim() || "neondb" },
        ...(backend && input.realtime ? { realtime: {} } : {}),
      },
    });
    projectId = data.project.id;
  } catch (err) {
    const error = apiErrorMessage(err) ?? "Failed to create project.";
    await creationUpdate(input.id, { status: "failed", error });
    return { ok: false, error };
  }
  const elapsedMs = Date.now() - started;
  // Ownership is recorded before anything else can fail, so a broken service
  // step never leaves a project nobody can see. The creation row names the
  // project before its mirror row lands, so lists swap one for the other.
  try {
    await attachProjectToOrg(projectId, orgId, userId);
  } catch (cause) {
    console.error(`Neon project ${projectId} was created but attaching it to org ${orgId} failed.`, cause);
    const error = "The Neon project was created, but recording its owner failed.";
    await creationUpdate(input.id, { status: "failed", project_id: projectId, error });
    return { ok: false, error };
  }
  await creationUpdate(input.id, { status: "configuring", project_id: projectId });
  await mirrorProject(projectId);

  const branch = await neonSdk.branches.getDefault({ projectId });
  const branchId = branch.id;
  const failures: CreatedProject["failures"] = [];
  const attempt = async <T>(service: string, call: () => Promise<T>): Promise<T | null> => {
    try {
      return await call();
    } catch (err) {
      failures.push({ service, error: apiErrorMessage(err) ?? `Failed to set up ${service}.` });
      return null;
    }
  };

  const { data: dbs } = await neon.listProjectBranchDatabases(projectId, branchId);
  const database = dbs.databases[0];
  if (!database) throw new Error(`Project ${projectId} was created without a database.`);
  const uri = (pooled: boolean) =>
    neon
      .getConnectionUri({
        projectId,
        branch_id: branchId,
        database_name: database.name,
        role_name: database.owner_name,
        pooled,
      })
      .then((r) => r.data.uri);
  const [databaseUrl, pooledDatabaseUrl] = await Promise.all([uri(false), uri(true)]);

  if (backend && input.storage) {
    for (const bucket of input.buckets.filter((b) => b.name.trim())) {
      await attempt(`bucket ${bucket.name}`, () =>
        neonSdk.storage.buckets.create({
          projectId,
          branchId,
          name: bucket.name.trim(),
          access_level: bucket.public ? "public_read" : "private",
        })
      );
    }
  }
  const auth = input.auth
    ? await attempt("Neon Auth", () =>
        neonSdk.auth.create({ projectId, branchId, auth_provider: "better_auth" })
      )
    : null;
  const authBaseUrl = auth ? ((await neonSdk.auth.get({ projectId, branchId })).base_url ?? null) : null;
  const storage = backend && input.storage ? await attempt("Object storage", () => neonSdk.storage.get({ projectId, branchId })) : null;
  const gateway = backend && input.aiGateway ? await attempt("AI Gateway", () => neonSdk.aiGateway.get({ projectId, branchId })) : null;
  const realtime = backend && input.realtime ? await attempt("Realtime", () => neonSdk.realtime.get({ projectId, branchId })) : null;

  await creationUpdate(input.id, { status: "ready", failures });
  return {
    ok: true,
    project: {
      projectId,
      branchId,
      branchName: branch.name,
      elapsedMs,
      failures,
      databaseUrl,
      pooledDatabaseUrl,
      authBaseUrl,
      storage: storage
        ? { endpoint: storage.s3_endpoint, region: storage.region, bucket: input.buckets[0]?.name.trim() || undefined }
        : null,
      aiGatewayBaseUrl: gateway?.base_url ?? null,
      realtimeUrl: realtime?.invocation_url ?? null,
    },
  };
}

/** Removes a failed creation row from the org's projects list. */
export async function dismissCreationAction(identity: PageIdentity, id: string): Promise<LiveWriteResult> {
  const check = await verifyPageIdentity(identity);
  if (!check.ok) return check;
  const [removed] = await db
    .delete(projectCreation)
    .where(
      and(eq(projectCreation.id, id), eq(projectCreation.org_id, identity.orgId), eq(projectCreation.status, "failed"))
    )
    .returning({ txid });
  return { ok: true, result: removed ? { kind: "committed", txid: removed.txid } : { kind: "unchanged" } };
}
