"use server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appOrg } from "@/lib/db/schema";
import type { LiveWriteResult } from "@/lib/live/writes";
import { txid } from "@/lib/mirror/sql";
import { verifyPageIdentity, type PageIdentity } from "@/lib/tenancy";

export async function renameOrgAction(identity: PageIdentity, orgId: string, name: string): Promise<LiveWriteResult> {
  const check = await verifyPageIdentity(identity);
  if (!check.ok) return check;
  if (orgId !== identity.orgId) return { ok: false, status: 403, error: "You can only rename the organization you're in." };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Organization name is required." };
  if (trimmed.length > 64) return { ok: false, error: "Use 64 characters or fewer." };
  if (check.role !== "owner") return { ok: false, status: 403, error: "Only organization owners can rename it." };
  const [renamed] = await db
    .update(appOrg)
    .set({ name: trimmed })
    .where(and(eq(appOrg.id, orgId), ne(appOrg.name, trimmed)))
    .returning({ txid });
  return { ok: true, result: renamed ? { kind: "committed", txid: renamed.txid } : { kind: "unchanged" } };
}
