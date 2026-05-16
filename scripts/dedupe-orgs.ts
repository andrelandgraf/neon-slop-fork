import { neon } from "@neondatabase/serverless";

const url =
  process.env.META_DATABASE_URL ??
  "postgresql://neondb_owner:npg_8TegRr2HIjOb@ep-holy-unit-apgu4qfi.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

/**
 * Best-effort one-shot dedupe for the org_id == (same name, same creator)
 * race we saw in prod. For each name+creator group, keep the OLDEST row
 * (it's the one whose memberships + projects are most likely already
 * attached) and delete the rest.
 *
 * Cascade deletes drop the corresponding app_org_member rows; app_project
 * rows are FK'd to app_org with ON DELETE CASCADE too, so if any project
 * happened to attach to a duplicate it gets removed (none should — the
 * race window is < 1s and the user hasn't clicked into the new org yet).
 */
const dupes = await sql<{
  name: string;
  created_by: string;
}>`
  SELECT name, created_by
  FROM app_org
  GROUP BY name, created_by
  HAVING COUNT(*) > 1
`;

for (const d of dupes) {
  const rows = await sql<{ id: string; created_at: Date }>`
    SELECT id, created_at
    FROM app_org
    WHERE name = ${d.name} AND created_by = ${d.created_by}
    ORDER BY created_at ASC
  `;
  const [keep, ...drop] = rows;
  console.log(
    `"${d.name}" by ${d.created_by}: keeping ${keep.id}, dropping ${drop.length} dupe(s).`
  );
  for (const r of drop) {
    await sql`DELETE FROM app_org WHERE id = ${r.id}`;
  }
}
console.log("Done.");
