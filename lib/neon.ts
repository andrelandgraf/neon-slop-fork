import "server-only";
import {
  createNeonClient,
  raw,
  type BranchCreateRequest,
  type ConsumptionHistoryGranularity as ConsumptionGranularity,
  type CreateSnapshotInput,
  type DataApiCreateRequest,
  type DataApiUpdateRequest,
  type EnableNeonAuthIntegrationRequest,
  type EndpointCreateRequest,
  type EndpointUpdateRequest,
  type GrantPermissionToProjectData,
  type NeonAuthEmailAndPasswordConfigUpdate,
  type NeonAuthSupportedAuthProvider as NeonAuthProvider,
  type NeonAuthWebhookConfig,
  type ProjectCreateRequest,
  type ProjectUpdateRequest,
  type RestoreSnapshotInput,
} from "@neon/sdk";

const apiKey = process.env.NEON_API_KEY;
if (!apiKey) {
  throw new Error("NEON_API_KEY is not set. Add it to .env (see README).");
}

export const ORG_ID =
  process.env.NEON_ORG_ID ?? "org-nameless-thunder-12993511";
export const ORG_NAME = process.env.NEON_ORG_NAME ?? "Neon Clone";

/** Mirrors the old `@neondatabase/api-client` enums for call sites. */
export const EndpointType = {
  ReadWrite: "read_write",
  ReadOnly: "read_only",
} as const;

export const NeonAuthSupportedAuthProvider = {
  Mock: "mock",
  Stack: "stack",
  BetterAuth: "better_auth",
} as const satisfies Record<string, NeonAuthProvider>;

export const ConsumptionHistoryGranularity = {
  Hourly: "hourly",
  Daily: "daily",
  Monthly: "monthly",
} as const satisfies Record<string, ConsumptionGranularity>;

const sdk = createNeonClient({
  apiKey,
  orgId: ORG_ID,
  throwOnError: true,
  waitForReadiness: true,
});

/** Raw layer returns `{ data, request, response }` even with `throwOnError`. */
function unwrapRaw<T>(result: { data: T }): T {
  return result.data;
}

async function collectAll<T>(
  list: { all(): Promise<{ data: T[]; error: undefined } | { data: undefined; error: Error }> }
): Promise<T[]> {
  const result = await list.all();
  if (result.error) throw result.error;
  return result.data;
}

/**
 * Compatibility wrapper around `@neon/sdk` that preserves the
 * `{ data: … }` response shapes used throughout this app.
 */
export const neon = {
  async listProjects(query?: { org_id?: string; limit?: number }) {
    const projects = await collectAll(
      sdk.projects.list({ org_id: query?.org_id, limit: query?.limit })
    );
    return { data: { projects } };
  },

  async getProject(projectId: string) {
    const project = await sdk.projects.get(projectId);
    return { data: { project } };
  },

  async createProject(body: ProjectCreateRequest) {
    const project = await sdk.projects.create(body.project);
    return { data: { project } };
  },

  async deleteProject(projectId: string) {
    await sdk.projects.delete(projectId);
  },

  async updateProject(projectId: string, body: ProjectUpdateRequest) {
    await sdk.projects.update(projectId, body.project ?? {});
  },

  async grantPermissionToProject(
    projectId: string,
    body: NonNullable<GrantPermissionToProjectData["body"]>
  ) {
    await raw.grantPermissionToProject({
      client: sdk.client,
      path: { project_id: projectId },
      body,
      throwOnError: true,
    });
  },

  async revokePermissionFromProject(projectId: string, permissionId: string) {
    await raw.revokePermissionFromProject({
      client: sdk.client,
      path: { project_id: projectId, permission_id: permissionId },
      throwOnError: true,
    });
  },

  async listProjectPermissions(projectId: string) {
    const data = unwrapRaw(
      await raw.listProjectPermissions({
        client: sdk.client,
        path: { project_id: projectId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async transferProjectsFromOrgToOrg(
    sourceOrgId: string,
    body: { destination_org_id: string; project_ids: string[] }
  ) {
    await sdk.projects.transfer({
      fromOrgId: sourceOrgId,
      toOrgId: body.destination_org_id,
      projectIds: body.project_ids,
    });
  },

  async listProjectBranches(params: { projectId: string }) {
    const branches = await collectAll(sdk.branches.list(params.projectId));
    return { data: { branches } };
  },

  async createProjectBranch(projectId: string, body: BranchCreateRequest) {
    await raw.createProjectBranch({
      client: sdk.client,
      path: { project_id: projectId },
      body,
      throwOnError: true,
    });
  },

  async deleteProjectBranch(projectId: string, branchId: string) {
    await sdk.branches.delete(projectId, branchId);
  },

  async setDefaultProjectBranch(projectId: string, branchId: string) {
    await sdk.branches.setDefault(projectId, branchId);
  },

  async restoreProjectBranch(
    projectId: string,
    branchId: string,
    body: NonNullable<import("@neon/sdk").BranchRestoreRequest>
  ) {
    await raw.restoreProjectBranch({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async listSnapshots(projectId: string) {
    const snapshots = await sdk.snapshots.list(projectId);
    return { data: { snapshots } };
  },

  async createSnapshot(input: {
    projectId: string;
    branchId: string;
    name?: string;
    expires_at?: string;
  }) {
    const snapshotInput: CreateSnapshotInput = {
      ...(input.name ? { name: input.name } : {}),
      ...(input.expires_at ? { expiresAt: input.expires_at } : {}),
    };
    await sdk.snapshots.create(
      input.projectId,
      input.branchId,
      snapshotInput
    );
  },

  async deleteSnapshot(projectId: string, snapshotId: string) {
    await sdk.snapshots.delete(projectId, snapshotId);
  },

  async updateSnapshot(
    projectId: string,
    snapshotId: string,
    body: { snapshot: { name: string } }
  ) {
    await sdk.snapshots.update(projectId, snapshotId, body.snapshot);
  },

  async restoreSnapshot(
    ids: { projectId: string; snapshotId: string },
    body: {
      name?: string;
      target_branch_id?: string;
      finalize_restore?: boolean;
    }
  ) {
    const input: RestoreSnapshotInput = {
      ...(body.name ? { name: body.name } : {}),
      ...(body.target_branch_id
        ? { targetBranchId: body.target_branch_id }
        : {}),
      ...(body.finalize_restore !== undefined
        ? { finalize: body.finalize_restore }
        : {}),
    };
    await sdk.snapshots.restore(ids.projectId, ids.snapshotId, input);
  },

  async listProjectBranchRoles(projectId: string, branchId: string) {
    const roles = await sdk.postgres.roles.list(projectId, branchId);
    return { data: { roles } };
  },

  async createProjectBranchRole(
    projectId: string,
    branchId: string,
    body: { role: { name: string } }
  ) {
    await sdk.postgres.roles.create(projectId, branchId, body.role);
  },

  async deleteProjectBranchRole(
    projectId: string,
    branchId: string,
    roleName: string
  ) {
    await sdk.postgres.roles.delete(projectId, branchId, roleName);
  },

  async resetProjectBranchRolePassword(
    projectId: string,
    branchId: string,
    roleName: string
  ) {
    const role = await sdk.postgres.roles.resetPassword(
      projectId,
      branchId,
      roleName
    );
    return { data: { role } };
  },

  async listProjectBranchDatabases(projectId: string, branchId: string) {
    const databases = await sdk.postgres.databases.list(projectId, branchId);
    return { data: { databases } };
  },

  async createProjectBranchDatabase(
    projectId: string,
    branchId: string,
    body: { database: { name: string; owner_name: string } }
  ) {
    await sdk.postgres.databases.create(projectId, branchId, body.database);
  },

  async deleteProjectBranchDatabase(
    projectId: string,
    branchId: string,
    databaseName: string
  ) {
    await sdk.postgres.databases.delete(projectId, branchId, databaseName);
  },

  async listProjectEndpoints(projectId: string) {
    const endpoints = await sdk.postgres.endpoints.list(projectId);
    return { data: { endpoints } };
  },

  async listProjectBranchEndpoints(projectId: string, branchId: string) {
    const data = unwrapRaw(
      await raw.listProjectBranchEndpoints({
        client: sdk.client,
        path: { project_id: projectId, branch_id: branchId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async startProjectEndpoint(projectId: string, endpointId: string) {
    await sdk.postgres.endpoints.start(projectId, endpointId);
  },

  async suspendProjectEndpoint(projectId: string, endpointId: string) {
    await sdk.postgres.endpoints.suspend(projectId, endpointId);
  },

  async restartProjectEndpoint(projectId: string, endpointId: string) {
    await sdk.postgres.endpoints.restart(projectId, endpointId);
  },

  async updateProjectEndpoint(
    projectId: string,
    endpointId: string,
    body: EndpointUpdateRequest
  ) {
    await sdk.postgres.endpoints.update(
      projectId,
      endpointId,
      body.endpoint ?? {}
    );
  },

  async createProjectEndpoint(
    projectId: string,
    body: EndpointCreateRequest
  ) {
    await sdk.postgres.endpoints.create(projectId, body.endpoint ?? {});
  },

  async deleteProjectEndpoint(projectId: string, endpointId: string) {
    await sdk.postgres.endpoints.delete(projectId, endpointId);
  },

  async getConnectionUri(params: {
    projectId: string;
    branch_id: string;
    database_name: string;
    role_name: string;
    pooled?: boolean;
  }) {
    const uri = await sdk.postgres.connectionString({
      projectId: params.projectId,
      branchId: params.branch_id,
      databaseName: params.database_name,
      roleName: params.role_name,
      pooled: params.pooled,
    });
    return { data: { uri } };
  },

  async getConsumptionHistoryPerProject(query: {
    project_ids: string[];
    from: string;
    to: string;
    granularity: ConsumptionGranularity;
    org_id?: string;
  }) {
    const projects = await collectAll(sdk.consumption.perProject(query));
    return { data: { projects } };
  },

  async getProjectBranchDataApi(
    projectId: string,
    branchId: string,
    databaseName: string
  ) {
    const data = await sdk.postgres.dataApi.get(
      projectId,
      branchId,
      databaseName
    );
    return { data };
  },

  async createProjectBranchDataApi(
    projectId: string,
    branchId: string,
    databaseName: string,
    body?: DataApiCreateRequest
  ) {
    await sdk.postgres.dataApi.create(
      projectId,
      branchId,
      databaseName,
      body
    );
  },

  async updateProjectBranchDataApi(
    projectId: string,
    branchId: string,
    databaseName: string,
    body: DataApiUpdateRequest
  ) {
    await sdk.postgres.dataApi.update(
      projectId,
      branchId,
      databaseName,
      body
    );
  },

  async deleteProjectBranchDataApi(
    projectId: string,
    branchId: string,
    databaseName: string
  ) {
    await sdk.postgres.dataApi.delete(projectId, branchId, databaseName);
  },

  async getNeonAuth(projectId: string, branchId: string) {
    const data = unwrapRaw(
      await raw.getNeonAuth({
        client: sdk.client,
        path: { project_id: projectId, branch_id: branchId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async createNeonAuth(
    projectId: string,
    branchId: string,
    body: EnableNeonAuthIntegrationRequest
  ) {
    await raw.createNeonAuth({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async disableNeonAuth(
    projectId: string,
    branchId: string,
    body?: { delete_data?: boolean }
  ) {
    await raw.disableNeonAuth({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async addBranchNeonAuthTrustedDomain(
    projectId: string,
    branchId: string,
    body: NonNullable<
      import("@neon/sdk").AddBranchNeonAuthTrustedDomainData["body"]
    >
  ) {
    await raw.addBranchNeonAuthTrustedDomain({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async deleteBranchNeonAuthTrustedDomain(
    projectId: string,
    branchId: string,
    body: NonNullable<
      import("@neon/sdk").DeleteBranchNeonAuthTrustedDomainData["body"]
    >
  ) {
    await raw.deleteBranchNeonAuthTrustedDomain({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async updateNeonAuthAllowLocalhost(
    projectId: string,
    branchId: string,
    body: { allow_localhost: boolean }
  ) {
    await raw.updateNeonAuthAllowLocalhost({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async updateNeonAuthEmailAndPasswordConfig(
    projectId: string,
    branchId: string,
    body: NeonAuthEmailAndPasswordConfigUpdate
  ) {
    await raw.updateNeonAuthEmailAndPasswordConfig({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async updateNeonAuthWebhookConfig(
    projectId: string,
    branchId: string,
    body: NeonAuthWebhookConfig
  ) {
    await raw.updateNeonAuthWebhookConfig({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async createBranchNeonAuthNewUser(
    projectId: string,
    branchId: string,
    body: NonNullable<import("@neon/sdk").CreateBranchNeonAuthNewUserData["body"]>
  ) {
    await raw.createBranchNeonAuthNewUser({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
    });
  },

  async deleteBranchNeonAuthUser(
    projectId: string,
    branchId: string,
    userId: string
  ) {
    await raw.deleteBranchNeonAuthUser({
      client: sdk.client,
      path: {
        project_id: projectId,
        branch_id: branchId,
        user_id: userId,
      },
      throwOnError: true,
    });
  },

  async listBranchNeonAuthOauthProviders(projectId: string, branchId: string) {
    const data = unwrapRaw(
      await raw.listBranchNeonAuthOauthProviders({
        client: sdk.client,
        path: { project_id: projectId, branch_id: branchId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async listBranchNeonAuthTrustedDomains(projectId: string, branchId: string) {
    const data = unwrapRaw(
      await raw.listBranchNeonAuthTrustedDomains({
        client: sdk.client,
        path: { project_id: projectId, branch_id: branchId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async getNeonAuthAllowLocalhost(projectId: string, branchId: string) {
    const data = unwrapRaw(
      await raw.getNeonAuthAllowLocalhost({
        client: sdk.client,
        path: { project_id: projectId, branch_id: branchId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async getNeonAuthEmailAndPasswordConfig(projectId: string, branchId: string) {
    const data = unwrapRaw(
      await raw.getNeonAuthEmailAndPasswordConfig({
        client: sdk.client,
        path: { project_id: projectId, branch_id: branchId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async getNeonAuthWebhookConfig(projectId: string, branchId: string) {
    const data = unwrapRaw(
      await raw.getNeonAuthWebhookConfig({
        client: sdk.client,
        path: { project_id: projectId, branch_id: branchId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async getNeonAuthEmailProvider(projectId: string, branchId: string) {
    const data = unwrapRaw(
      await raw.getNeonAuthEmailProvider({
        client: sdk.client,
        path: { project_id: projectId, branch_id: branchId },
        throwOnError: true,
      })
    );
    return { data };
  },

  async addBranchNeonAuthOauthProvider(
    projectId: string,
    branchId: string,
    body: { id: string; client_id?: string; client_secret?: string }
  ) {
    // OpenAPI enum lags the live auth backend; use the configured SDK client.
    await sdk.client.post({
      url: "/projects/{project_id}/branches/{branch_id}/auth/oauth_providers",
      path: { project_id: projectId, branch_id: branchId },
      body,
      throwOnError: true,
      security: [{ scheme: "bearer", type: "http" }],
    });
  },

  async deleteBranchNeonAuthOauthProvider(
    projectId: string,
    branchId: string,
    providerId: string
  ) {
    await sdk.client.delete({
      url: "/projects/{project_id}/branches/{branch_id}/auth/oauth_providers/{provider_id}",
      path: {
        project_id: projectId,
        branch_id: branchId,
        provider_id: providerId,
      },
      throwOnError: true,
      security: [{ scheme: "bearer", type: "http" }],
    });
  },
};

export type ProjectListItem = Awaited<
  ReturnType<typeof neon.listProjects>
>["data"]["projects"][number];

export type Project = Awaited<
  ReturnType<typeof neon.getProject>
>["data"]["project"];

export type Branch = Awaited<
  ReturnType<typeof neon.listProjectBranches>
>["data"]["branches"][number];
