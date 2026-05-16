import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Hand-rolled .env loader: drizzle-kit's CLI doesn't autoload .env
// and we don't want a dotenv dep just for the migrate workflow.
function loadDotEnv() {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const [, key, valueRaw] = m;
      if (process.env[key] !== undefined) continue;
      let value = valueRaw.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    /* No .env in CI / prod is fine; rely on real env vars. */
  }
}

loadDotEnv();

const url = process.env.META_DATABASE_URL;
if (!url) {
  throw new Error("META_DATABASE_URL is not set in .env");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
