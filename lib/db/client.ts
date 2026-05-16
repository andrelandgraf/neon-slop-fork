import "server-only";
import { neon as serverlessNeon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.META_DATABASE_URL;
if (!url) {
  throw new Error(
    "META_DATABASE_URL is not set. See README — it holds the auth + tenancy tables."
  );
}

export const sql = serverlessNeon(url);
export const db = drizzle(sql, { schema });
export { schema };
