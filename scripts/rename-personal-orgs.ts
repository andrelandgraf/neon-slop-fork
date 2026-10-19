import { neon } from "@neondatabase/serverless";

const url = process.env.META_DATABASE_URL;
if (!url) {
  console.error("META_DATABASE_URL is not set. Source .env first.");
  process.exit(1);
}
const sql = neon(url);
const apply = process.argv.includes("--apply");

/**
 * Personal orgs used to be named "<First name>'s projects"; the projects
 * page now renders "<org name>'s projects" like the Console, so those rows
 * would read "Ada's projects's projects". Renames only orgs this app
 * provisioned automatically: slug `personal-<first 8 chars of creator id>`
 * and a name that still equals the generated one. Dry run by default; pass
 * `--apply` to write. Safe to rerun.
 */
const rows = await sql`
  SELECT o.id, o.name, u.name AS user_name
  FROM app_org o
  JOIN "user" u ON u.id = o.created_by
  WHERE o.slug = 'personal-' || left(o.created_by, 8)
`;

let renamed = 0;
for (const row of rows) {
  const first = String(row.user_name).trim().split(/\s+/)[0] || "Personal";
  if (row.name !== `${first}'s projects`) continue;
  console.log(`${row.id}: "${row.name}" -> "${first}"${apply ? "" : " (dry run)"}`);
  if (apply) {
    await sql`UPDATE app_org SET name = ${first} WHERE id = ${row.id} AND name = ${row.name}`;
  }
  renamed += 1;
}
console.log(`${renamed} org(s) ${apply ? "renamed" : "would be renamed"}.`);
