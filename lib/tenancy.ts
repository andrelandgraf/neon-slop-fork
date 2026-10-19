import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { auth, type Session } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { appOrg, appOrgMember, appProject, user } from "@/lib/db/schema";

/**
 * Cookie that stores the user's *active* virtual org. The session
 * itself is owned by Better Auth and we don't extend it — this is a
 * plain UI cookie. If it's missing we fall back to the user's first
 * org by createdAt.
 */
const ACTIVE_ORG_COOKIE = "neon-slop-fork-active-org";

export interface TenantContext {
  session: Session;
  /** Every org this user is a member of, ordered by created_at asc. */
  orgs: { id: string; slug: string; name: string }[];
  /** Currently selected org. Always one of `orgs`. */
  activeOrg: { id: string; slug: string; name: string };
}

/**
 * Resolve session + tenant context for a request. Redirects to
 * `/login` if the session is missing (or invalid).
 *
 * Bootstraps a Personal org for first-time signups: every user has
 * at least one app_org row, so callers can treat `activeOrg` as
 * always defined.
 */
export async function requireTenant(returnTo?: string): Promise<TenantContext> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const target = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${target}`);
  }

  // Ensure the user has at least one org. New signups land here on
  // their first authenticated request — better than running this
  // inside a Better Auth `databaseHooks` callback (which would fire
  // synchronously inside /api/auth and force a slower response).
  const memberRows = await db
    .select({
      id: appOrg.id,
      slug: appOrg.slug,
      name: appOrg.name,
      createdAt: appOrg.createdAt,
    })
    .from(appOrgMember)
    .innerJoin(appOrg, eq(appOrg.id, appOrgMember.orgId))
    .where(eq(appOrgMember.userId, session.user.id))
    .orderBy(appOrg.createdAt);

  let orgs = memberRows.map(({ id, slug, name }) => ({ id, slug, name }));
  if (orgs.length === 0) {
    orgs = [await provisionPersonalOrg(session.user.id, session.user.name)];
  }

  const activeId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const activeOrg = orgs.find((o) => o.id === activeId) ?? orgs[0];

  return { session, orgs, activeOrg };
}

/**
 * Create a "Personal" org + membership row for a brand-new user.
 * Slug is `personal-<short user id>` so two different users can both
 * have a "Personal" org without colliding on the unique slug.
 */
async function provisionPersonalOrg(
  userId: string,
  userName: string
): Promise<{ id: string; slug: string; name: string }> {
  const shortId = userId.slice(0, 8);
  const slug = `personal-${shortId}`;
  const orgRow = await db
    .insert(appOrg)
    .values({
      slug,
      name: personalOrgName(userName),
      createdBy: userId,
    })
    .returning({ id: appOrg.id, slug: appOrg.slug, name: appOrg.name });
  const org = orgRow[0]!;
  await db.insert(appOrgMember).values({
    orgId: org.id,
    userId,
    role: "owner",
  });
  return org;
}

/**
 * Persist the user's active org choice across requests. The cookie
 * is plain (not signed) — wrong values just don't resolve to a
 * membership row, so they're ignored by `requireTenant`.
 */
export async function setActiveOrgCookie(orgId: string): Promise<void> {
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * List the Neon project ids owned by an app org. This is the
 * authoritative scope for every "what can this user see?" check —
 * the Neon API itself has no concept of our virtual tenancy.
 */
export async function listOrgProjectIds(orgId: string): Promise<string[]> {
  const rows = await db
    .select({ projectId: appProject.projectId })
    .from(appProject)
    .where(eq(appProject.orgId, orgId));
  return rows.map((r) => r.projectId);
}

/**
 * Throw / redirect 404 if the active org doesn't own the project.
 */
export async function requireProjectAccess(
  tenant: TenantContext,
  projectId: string
): Promise<void> {
  const row = await db
    .select({ orgId: appProject.orgId })
    .from(appProject)
    .where(eq(appProject.projectId, projectId))
    .limit(1);
  const owner = row[0]?.orgId;
  if (!owner || owner !== tenant.activeOrg.id) {
    // We treat "exists but not yours" the same as "doesn't exist" —
    // no information leakage about whether the id is taken.
    const { notFound } = await import("next/navigation");
    notFound();
  }
}

/**
 * Attach a Neon project to an app org. Idempotent: re-attaching the
 * same project is a no-op (handy if a deploy raced with createProject).
 */
export async function attachProjectToOrg(
  projectId: string,
  orgId: string,
  userId: string
): Promise<void> {
  await db
    .insert(appProject)
    .values({ projectId, orgId, createdBy: userId })
    .onConflictDoNothing();
}

export async function detachProject(projectId: string): Promise<void> {
  await db.delete(appProject).where(eq(appProject.projectId, projectId));
}

/**
 * Create a new virtual org and add the current user as its owner.
 */
export async function createAppOrg(
  userId: string,
  name: string
): Promise<{ id: string; slug: string; name: string }> {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("Organization name is required.");
  const slug = slugify(trimmed) + "-" + Math.random().toString(36).slice(2, 8);
  const inserted = await db
    .insert(appOrg)
    .values({ slug, name: trimmed, createdBy: userId })
    .returning({ id: appOrg.id, slug: appOrg.slug, name: appOrg.name });
  const org = inserted[0]!;
  await db.insert(appOrgMember).values({
    orgId: org.id,
    userId,
    role: "owner",
  });
  return org;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * For routes that should still let the user in (e.g. /login) even
 * if a session exists. Returns null when not logged in.
 */
export async function maybeSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Helper to look up an app org by id, scoped to memberships. Used
 * by the org switcher action to validate the chosen id belongs to
 * the user before persisting the cookie.
 */
export async function getMemberOrgs(userId: string): Promise<
  { id: string; slug: string; name: string }[]
> {
  const rows = await db
    .select({
      id: appOrg.id,
      slug: appOrg.slug,
      name: appOrg.name,
    })
    .from(appOrgMember)
    .innerJoin(appOrg, eq(appOrg.id, appOrgMember.orgId))
    .where(eq(appOrgMember.userId, userId))
    .orderBy(appOrg.createdAt);
  return rows;
}

/**
 * Lookup helper used by the project list page to fetch the names of
 * orgs that own a set of projects (only really needed for the "Org
 * total" badge — kept here for future cross-org views).
 */
export async function listOrgs(orgIds: string[]) {
  if (orgIds.length === 0) return [];
  return db
    .select({ id: appOrg.id, name: appOrg.name, slug: appOrg.slug })
    .from(appOrg)
    .where(inArray(appOrg.id, orgIds));
}

/**
 * Personal orgs are named after the user, like the Console's ("Testing" →
 * "Testing's projects" in the page header).
 */
export function personalOrgName(userName: string): string {
  return userName.trim().split(/\s+/)[0] || "Personal";
}

export async function listOrgMembers(orgId: string) {
  return db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: appOrgMember.role,
      joinedAt: appOrgMember.createdAt,
    })
    .from(appOrgMember)
    .innerJoin(user, eq(user.id, appOrgMember.userId))
    .where(eq(appOrgMember.orgId, orgId))
    .orderBy(appOrgMember.createdAt);
}

export async function getMemberRole(
  orgId: string,
  userId: string
): Promise<string | null> {
  const rows = await db
    .select({ role: appOrgMember.role })
    .from(appOrgMember)
    .where(and(eq(appOrgMember.orgId, orgId), eq(appOrgMember.userId, userId)))
    .limit(1);
  return rows[0]?.role ?? null;
}

export async function renameAppOrg(orgId: string, name: string): Promise<void> {
  await db.update(appOrg).set({ name }).where(eq(appOrg.id, orgId));
}

export type VirtualTransferResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "claim_link_active"; until?: Date };

/**
 * Moves a project to another virtual org in one conditional statement, so a
 * concurrent claim-link reservation or a second transfer can't interleave.
 * Callers have already checked the user's membership in both orgs.
 */
export async function transferProjectToAppOrg(
  projectId: string,
  sourceOrgId: string,
  destinationOrgId: string
): Promise<VirtualTransferResult> {
  const moved = await db
    .update(appProject)
    .set({ orgId: destinationOrgId })
    .where(
      and(
        eq(appProject.projectId, projectId),
        eq(appProject.orgId, sourceOrgId),
        or(
          isNull(appProject.claimLinkExpiresAt),
          lt(appProject.claimLinkExpiresAt, sql`now()`)
        )
      )
    )
    .returning({ projectId: appProject.projectId });
  if (moved.length > 0) return { ok: true };

  const row = await db
    .select({
      orgId: appProject.orgId,
      claimLinkExpiresAt: appProject.claimLinkExpiresAt,
    })
    .from(appProject)
    .where(eq(appProject.projectId, projectId))
    .limit(1);
  const current = row[0];
  if (current?.orgId === sourceOrgId && current.claimLinkExpiresAt) {
    return {
      ok: false,
      reason: "claim_link_active",
      until: current.claimLinkExpiresAt,
    };
  }
  return { ok: false, reason: "not_found" };
}

/**
 * Claim links are reserved before Neon issues them: the conditional update
 * fails if the project already moved to another virtual org, and while the
 * reservation stands a virtual transfer is refused.
 */
export async function reserveClaimLink(
  projectId: string,
  orgId: string
): Promise<boolean> {
  const reserved = await db
    .update(appProject)
    .set({
      claimLinkExpiresAt: sql`greatest(coalesce(${appProject.claimLinkExpiresAt}, now()), now() + interval '24 hours')`,
    })
    .where(and(eq(appProject.projectId, projectId), eq(appProject.orgId, orgId)))
    .returning({ projectId: appProject.projectId });
  return reserved.length > 0;
}

export async function recordClaimLinkExpiry(
  projectId: string,
  expiresAt: Date
): Promise<void> {
  await db
    .update(appProject)
    .set({
      claimLinkExpiresAt: sql`greatest(coalesce(${appProject.claimLinkExpiresAt}, now()), ${expiresAt.toISOString()}::timestamptz)`,
    })
    .where(eq(appProject.projectId, projectId));
}

export async function getClaimLinkExpiry(projectId: string): Promise<Date | null> {
  const rows = await db
    .select({ claimLinkExpiresAt: appProject.claimLinkExpiresAt })
    .from(appProject)
    .where(eq(appProject.projectId, projectId))
    .limit(1);
  const expiresAt = rows[0]?.claimLinkExpiresAt ?? null;
  return expiresAt && expiresAt.getTime() > Date.now() ? expiresAt : null;
}

export { ACTIVE_ORG_COOKIE };

// Re-export so consumers don't import drizzle directly from API
// routes (keeps the dependency graph in one place).
export { and, eq };
