import { neon } from "@neondatabase/serverless";

const url =
  process.env.META_DATABASE_URL ??
  "postgresql://neondb_owner:npg_8TegRr2HIjOb@ep-holy-unit-apgu4qfi.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

const email = process.argv[2];
if (!email) {
  console.error("usage: bun scripts/inspect-orgs.ts <email>");
  process.exit(1);
}

const rows = await sql`
  SELECT o.id, o.slug, o.name, o.created_at, m.role
  FROM app_org o
  JOIN app_org_member m ON m.org_id = o.id
  JOIN "user" u ON u.id = m.user_id
  WHERE u.email = ${email}
  ORDER BY o.created_at ASC
`;
console.log(`Orgs for ${email}:`);
for (const r of rows) {
  console.log(`  ${r.id}  ${r.slug.padEnd(30)} "${r.name}"  ${r.created_at}`);
}
console.log(`\nTotal: ${rows.length}`);
