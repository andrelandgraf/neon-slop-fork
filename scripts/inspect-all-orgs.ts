import { neon } from "@neondatabase/serverless";

const url =
  process.env.META_DATABASE_URL ??
  "postgresql://neondb_owner:npg_8TegRr2HIjOb@ep-holy-unit-apgu4qfi.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const rows = await sql`
  SELECT o.id, o.slug, o.name, o.created_at, u.email AS owner
  FROM app_org o
  JOIN "user" u ON u.id = o.created_by
  ORDER BY o.created_at DESC
`;
console.log("All app orgs:");
for (const r of rows) {
  console.log(
    `  ${r.id}  ${String(r.slug).padEnd(28)} "${r.name}"  by ${r.owner}  at ${r.created_at}`
  );
}
console.log(`\nTotal: ${rows.length}`);

console.log("\nName collisions (same name + same creator):");
const dupes = await sql`
  SELECT name, created_by, COUNT(*) AS n
  FROM app_org
  GROUP BY name, created_by
  HAVING COUNT(*) > 1
`;
for (const d of dupes) {
  console.log(`  "${d.name}" by ${d.created_by} → ${d.n} rows`);
}
