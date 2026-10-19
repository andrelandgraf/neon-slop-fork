/**
 * Fills the live mirror (neon_project, neon_branch) for every org that owns
 * projects, so the first page load after deploying live views doesn't sync
 * every org on demand. Dry run by default; pass `--apply` to write. Safe to
 * rerun: identical snapshots change nothing.
 *
 *   bun --conditions=react-server scripts/backfill-mirror.ts [--apply]
 *
 * Needs META_DATABASE_URL and NEON_API_KEY in the environment.
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { syncOrg } from "@/lib/mirror/sync";

const apply = process.argv.includes("--apply");
const { rows } = await db.execute<{ org_id: string; projects: number }>(
  sql`select org_id, count(*)::int as projects from app_project group by org_id order by org_id`
);
console.log(`${rows.length} org(s) own ${rows.reduce((s, r) => s + r.projects, 0)} project(s).`);
if (!apply) {
  console.log("Dry run. Pass --apply to sync them into the mirror.");
  process.exit(0);
}
for (const row of rows) {
  await syncOrg(row.org_id);
  console.log(`synced org ${row.org_id} (${row.projects} project(s))`);
}
const { rows: counts } = await db.execute<{ projects: number; branches: number }>(
  sql`select (select count(*)::int from neon_project) as projects, (select count(*)::int from neon_branch) as branches`
);
console.log(`mirror now holds ${counts[0]?.projects} project(s) and ${counts[0]?.branches} branch(es).`);
