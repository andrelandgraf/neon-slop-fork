import "server-only";
import { createApiClient } from "@neondatabase/api-client";

const apiKey = process.env.NEON_API_KEY;
if (!apiKey) {
  throw new Error(
    "NEON_API_KEY is not set. Add it to .env (see README)."
  );
}

export const ORG_ID =
  process.env.NEON_ORG_ID ?? "org-nameless-thunder-12993511";
export const ORG_NAME = process.env.NEON_ORG_NAME ?? "Neon Clone";

export const neon = createApiClient({ apiKey });

export type ProjectListItem = Awaited<
  ReturnType<typeof neon.listProjects>
>["data"]["projects"][number];

export type Project = Awaited<
  ReturnType<typeof neon.getProject>
>["data"]["project"];

export type Branch = Awaited<
  ReturnType<typeof neon.listProjectBranches>
>["data"]["branches"][number];
