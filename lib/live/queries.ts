import "server-only";
import { and, asc, desc, eq, exists, getTableColumns, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  appOrg,
  appOrgMember,
  appProject,
  neonBranch,
  neonDatabase,
  neonEndpoint,
  neonOperation,
  neonProject,
  neonRole,
  projectCreation,
  user,
} from "@/lib/db/schema";

/*
 * One Drizzle query per collection, used for the server render and for the
 * sealed live query, so both produce identical rows. Authorization is part
 * of each query: when a membership or a project's owner changes, the rows
 * drop out of the subscription. Realtime matches result columns to keys by
 * name, so every key is its SQL column name or an explicit alias.
 */

const isMember = (userId: string, orgId: string) =>
  exists(
    db
      .select({ one: sql`1` })
      .from(appOrgMember)
      .where(and(eq(appOrgMember.orgId, orgId), eq(appOrgMember.userId, userId)))
  );

/** Orgs the user belongs to, for the account menu and org settings. */
export const orgsQuery = (userId: string) =>
  db
    .select({
      id: appOrg.id,
      name: appOrg.name,
      slug: appOrg.slug,
      role: appOrgMember.role,
      created_at: sql<Date>`${appOrg.createdAt}`.mapWith(appOrg.createdAt).as("created_at"),
    })
    .from(appOrgMember)
    .innerJoin(appOrg, eq(appOrg.id, appOrgMember.orgId))
    .where(eq(appOrgMember.userId, userId));

/** The org's members, readable by any member. */
export const orgMembersQuery = (userId: string, orgId: string) =>
  db
    .select({
      id: appOrgMember.id,
      user_id: sql<string>`${appOrgMember.userId}`.as("user_id"),
      role: appOrgMember.role,
      joined_at: sql<Date>`${appOrgMember.createdAt}`.mapWith(appOrgMember.createdAt).as("joined_at"),
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(appOrgMember)
    .innerJoin(user, eq(user.id, appOrgMember.userId))
    .where(and(eq(appOrgMember.orgId, orgId), isMember(userId, orgId)))
    .orderBy(asc(appOrgMember.createdAt));

/** Projects the org owns. */
export const projectsQuery = (userId: string, orgId: string) =>
  db
    .select(getTableColumns(neonProject))
    .from(neonProject)
    .innerJoin(appProject, eq(appProject.projectId, neonProject.id))
    .where(and(eq(appProject.orgId, orgId), isMember(userId, orgId)));

/** The branch facts the projects list shows, across the org's projects. */
export const orgBranchesQuery = (userId: string, orgId: string) =>
  db
    .select({
      id: neonBranch.id,
      project_id: neonBranch.project_id,
      name: neonBranch.name,
      default: neonBranch.default,
      logical_size: neonBranch.logical_size,
    })
    .from(neonBranch)
    .innerJoin(appProject, eq(appProject.projectId, neonBranch.project_id))
    .where(and(eq(appProject.orgId, orgId), isMember(userId, orgId)));

/** Every creation row of the org; views filter by status locally. */
export const projectCreationsQuery = (userId: string, orgId: string) =>
  db
    .select(getTableColumns(projectCreation))
    .from(projectCreation)
    .where(and(eq(projectCreation.org_id, orgId), isMember(userId, orgId)));

/** The project belongs to the org and the requester is a member; the join keeps it live. */
const ownsProject = (userId: string, orgId: string, projectId: string) =>
  and(
    exists(
      db
        .select({ one: sql`1` })
        .from(appProject)
        .where(and(eq(appProject.projectId, projectId), eq(appProject.orgId, orgId)))
    ),
    isMember(userId, orgId)
  );

export const projectBranchesQuery = (userId: string, orgId: string, projectId: string) =>
  db
    .select(getTableColumns(neonBranch))
    .from(neonBranch)
    .where(and(eq(neonBranch.project_id, projectId), ownsProject(userId, orgId, projectId)));

export const endpointsQuery = (userId: string, orgId: string, projectId: string) =>
  db
    .select(getTableColumns(neonEndpoint))
    .from(neonEndpoint)
    .where(and(eq(neonEndpoint.project_id, projectId), ownsProject(userId, orgId, projectId)));

export const operationsQuery = (userId: string, orgId: string, projectId: string) =>
  db
    .select(getTableColumns(neonOperation))
    .from(neonOperation)
    .where(and(eq(neonOperation.project_id, projectId), ownsProject(userId, orgId, projectId)))
    .orderBy(desc(neonOperation.created_at))
    .limit(50);

export const databasesQuery = (userId: string, orgId: string, projectId: string, branchId: string) =>
  db
    .select(getTableColumns(neonDatabase))
    .from(neonDatabase)
    .where(
      and(
        eq(neonDatabase.project_id, projectId),
        eq(neonDatabase.branch_id, branchId),
        ownsProject(userId, orgId, projectId)
      )
    );

export const rolesQuery = (userId: string, orgId: string, projectId: string, branchId: string) =>
  db
    .select(getTableColumns(neonRole))
    .from(neonRole)
    .where(
      and(eq(neonRole.project_id, projectId), eq(neonRole.branch_id, branchId), ownsProject(userId, orgId, projectId))
    );

export type ProjectBranchRow = Awaited<ReturnType<typeof projectBranchesQuery>>[number];
export type EndpointRow = Awaited<ReturnType<typeof endpointsQuery>>[number];
export type OperationRow = Awaited<ReturnType<typeof operationsQuery>>[number];
export type DatabaseRow = Awaited<ReturnType<typeof databasesQuery>>[number];
export type RoleRow = Awaited<ReturnType<typeof rolesQuery>>[number];
export type OrgRow = Awaited<ReturnType<typeof orgsQuery>>[number];
export type OrgMemberRow = Awaited<ReturnType<typeof orgMembersQuery>>[number];
export type ProjectRow = Awaited<ReturnType<typeof projectsQuery>>[number];
export type OrgBranchRow = Awaited<ReturnType<typeof orgBranchesQuery>>[number];
export type ProjectCreationLiveRow = Awaited<ReturnType<typeof projectCreationsQuery>>[number];
