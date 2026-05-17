import { neon } from "@neondatabase/serverless";

const url = process.env.META_DATABASE_URL;
if (!url) {
  console.error("META_DATABASE_URL is not set. Source .env first.");
  process.exit(1);
}
const sql = neon(url);

const [projectId, email] = process.argv.slice(2);
if (!projectId || !email) {
  console.error("usage: bun scripts/attach-test-project.ts <projectId> <userEmail>");
  process.exit(1);
}

const userRows = await sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`;
if (userRows.length === 0) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}
const userId = userRows[0].id as string;

const orgRows = await sql`
  SELECT o.id
  FROM app_org o
  JOIN app_org_member m ON m.org_id = o.id
  WHERE m.user_id = ${userId}
  ORDER BY o.created_at ASC
  LIMIT 1
`;
if (orgRows.length === 0) {
  console.error(`User ${email} has no org`);
  process.exit(1);
}
const orgId = orgRows[0].id as string;

await sql`
  INSERT INTO app_project (project_id, org_id, created_by)
  VALUES (${projectId}, ${orgId}, ${userId})
  ON CONFLICT (project_id) DO UPDATE SET org_id = EXCLUDED.org_id
`;
console.log(`Attached ${projectId} → ${email} (${orgId})`);
