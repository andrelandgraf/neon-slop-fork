import "server-only";
import { after } from "next/server";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projectCreation } from "@/lib/db/schema";
import { txid } from "@/lib/mirror/sql";

/**
 * A request that dies between creating the Neon project and recording the
 * outcome leaves its row in `creating` or `configuring`. Five minutes is well
 * past the slowest creation with every service.
 */
const INTERRUPTED_AFTER = sql`now() - interval '5 minutes'`;

export async function recordCreationStart(row: {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  regionId: string;
  pgVersion: number;
}): Promise<"started" | "duplicate"> {
  const inserted = await db
    .insert(projectCreation)
    .values({
      id: row.id,
      org_id: row.orgId,
      created_by: row.userId,
      name: row.name,
      region_id: row.regionId,
      pg_version: row.pgVersion,
      status: "creating",
      failures: [],
    })
    .onConflictDoNothing()
    .returning({ id: projectCreation.id });
  return inserted.length ? "started" : "duplicate";
}

export function creationUpdate(
  id: string,
  values: Partial<Pick<typeof projectCreation.$inferInsert, "status" | "project_id" | "error" | "failures">>
) {
  return db
    .update(projectCreation)
    .set({ ...values, updated_at: sql`now()` })
    .where(eq(projectCreation.id, id))
    .returning({ txid });
}

/** Drops the org's finished creation rows older than a day, so the table stays small. */
export function pruneCreations(orgId: string) {
  return db
    .delete(projectCreation)
    .where(
      and(
        eq(projectCreation.org_id, orgId),
        inArray(projectCreation.status, ["ready", "failed"]),
        lt(projectCreation.created_at, sql`now() - interval '1 day'`)
      )
    );
}

export function failInterruptedCreationsLater(orgId: string): void {
  after(async () => {
    await db
      .update(projectCreation)
      .set({ status: "failed", error: "Interrupted before it finished.", updated_at: sql`now()` })
      .where(
        and(
          eq(projectCreation.org_id, orgId),
          inArray(projectCreation.status, ["creating", "configuring"]),
          lt(projectCreation.updated_at, INTERRUPTED_AFTER)
        )
      );
  });
}
