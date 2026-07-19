import "server-only";
import {
  createNeonClient,
  raw,
  type BranchStorage,
  type Bucket,
  type BucketAccessLevel,
  type BucketCreateRequest,
  type BucketObjectsListResponse,
  type CreateCredentialRequest,
  type CreateCredentialResponse,
  type CredentialMeta,
  type CredentialScope,
  type PresignRequest,
  type PresignResponse,
  type BranchCreateRequest,
  type ConsumptionHistoryGranularity as ConsumptionGranularity,
  type CreateSnapshotInput,
  type DataApiCreateRequest,
  type DataApiUpdateRequest,
  type EnableNeonAuthIntegrationRequest,
  type EndpointCreateRequest,
  type EndpointUpdateRequest,
  type GrantPermissionToProjectData,
  type NeonAuthAllowLocalhostResponse,
  type NeonAuthEmailAndPasswordConfig,
  type NeonAuthEmailAndPasswordConfigUpdate,
  type NeonAuthAddOAuthProviderRequest,
  type NeonAuthEmailServerConfig,
  type NeonAuthIntegration,
  type NeonAuthOauthProviderId,
  type NeonAuthRedirectUriWhitelistResponse,
  type NeonAuthSupportedAuthProvider as NeonAuthProvider,
  type NeonAuthWebhookConfig,
  type ListNeonAuthOauthProvidersResponse,
  type ListProjectPermissionsResponse,
  type EndpointsResponse,
  type ProjectCreateRequest,
  type ProjectQuota,
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

/**
 * Guard-rail consumption quota applied to every project this app provisions.
 * neon-slop-fork is a public, open-source Neon console clone — anyone can fork
 * it and point it at their own Neon org. Capping per-branch storage and egress
 * keeps a public instance from being abused to spin up unbounded databases,
 * mirroring the ceilings neon.new applies to its claimable projects. A zero or
 * absent quota means "unlimited", so we set explicit values.
 */
export const DEMO_PROJECT_QUOTA: ProjectQuota = {
  logical_size_bytes: 100 * 1024 * 1024, // 100 MB max logical size per branch
  data_transfer_bytes: 1000 * 1024 * 1024, // ~1 GB egress per billing period
};

// Object-storage guard-rails for the public instance. Defined in a
// server-only-free module so the client upload UI can share the numbers.
export { DEMO_STORAGE_LIMITS } from "./limits";

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
    const project = await sdk.projects.create({
      ...body.project,
      settings: {
        ...body.project.settings,
        // Enforce the guard-rail quota, but let an explicit caller quota win.
        quota: { ...DEMO_PROJECT_QUOTA, ...body.project.settings?.quota },
      },
    });
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
    await sdk.projects.permissions.grant(projectId, body.email);
  },

  async revokePermissionFromProject(projectId: string, permissionId: string) {
    await sdk.projects.permissions.revoke(projectId, permissionId);
  },

  async listProjectPermissions(
    projectId: string
  ): Promise<{ data: ListProjectPermissionsResponse }> {
    const project_permissions =
      await sdk.projects.permissions.list(projectId);
    return { data: { project_permissions } };
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

  async listProjectBranchEndpoints(
    projectId: string,
    branchId: string
  ): Promise<{ data: EndpointsResponse }> {
    const endpoints = await sdk.postgres.endpoints.listByBranch(
      projectId,
      branchId
    );
    return { data: { endpoints } };
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
    endpoint_id?: string;
    database_name: string;
    role_name: string;
    pooled?: boolean;
  }) {
    const uri = await sdk.postgres.connectionString({
      projectId: params.projectId,
      branchId: params.branch_id,
      endpointId: params.endpoint_id,
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

  async getNeonAuth(
    projectId: string,
    branchId: string
  ): Promise<{ data: NeonAuthIntegration }> {
    const data = await sdk.auth.get(projectId, branchId);
    return { data };
  },

  async createNeonAuth(
    projectId: string,
    branchId: string,
    body: EnableNeonAuthIntegrationRequest
  ) {
    await sdk.auth.create(projectId, branchId, body);
  },

  async disableNeonAuth(
    projectId: string,
    branchId: string,
    body?: { delete_data?: boolean }
  ) {
    await sdk.auth.disable(projectId, branchId, {
      deleteData: body?.delete_data,
    });
  },

  async addBranchNeonAuthTrustedDomain(
    projectId: string,
    branchId: string,
    body: NonNullable<
      import("@neon/sdk").AddBranchNeonAuthTrustedDomainData["body"]
    >
  ) {
    await sdk.auth.trustedDomains.add(projectId, branchId, body);
  },

  async deleteBranchNeonAuthTrustedDomain(
    projectId: string,
    branchId: string,
    body: NonNullable<
      import("@neon/sdk").DeleteBranchNeonAuthTrustedDomainData["body"]
    >
  ) {
    await sdk.auth.trustedDomains.delete(projectId, branchId, body);
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
    await sdk.auth.users.create(projectId, branchId, body);
  },

  async deleteBranchNeonAuthUser(
    projectId: string,
    branchId: string,
    userId: string
  ) {
    await sdk.auth.users.delete(projectId, branchId, userId);
  },

  async listBranchNeonAuthOauthProviders(
    projectId: string,
    branchId: string
  ): Promise<{ data: ListNeonAuthOauthProvidersResponse }> {
    const providers = await sdk.auth.oauthProviders.list(projectId, branchId);
    return { data: { providers } };
  },

  async listBranchNeonAuthTrustedDomains(
    projectId: string,
    branchId: string
  ): Promise<{ data: NeonAuthRedirectUriWhitelistResponse }> {
    const domains = await sdk.auth.trustedDomains.list(projectId, branchId);
    return { data: { domains } };
  },

  async getNeonAuthAllowLocalhost(
    projectId: string,
    branchId: string
  ): Promise<{ data: NeonAuthAllowLocalhostResponse }> {
    const data = await raw.getNeonAuthAllowLocalhost({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      throwOnError: true,
    });
    return { data };
  },

  async getNeonAuthEmailAndPasswordConfig(
    projectId: string,
    branchId: string
  ): Promise<{ data: NeonAuthEmailAndPasswordConfig }> {
    const data = await raw.getNeonAuthEmailAndPasswordConfig({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      throwOnError: true,
    });
    return { data };
  },

  async getNeonAuthWebhookConfig(
    projectId: string,
    branchId: string
  ): Promise<{ data: NeonAuthWebhookConfig }> {
    const data = await raw.getNeonAuthWebhookConfig({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      throwOnError: true,
    });
    return { data };
  },

  async getNeonAuthEmailProvider(
    projectId: string,
    branchId: string
  ): Promise<{ data: NeonAuthEmailServerConfig }> {
    const data = await raw.getNeonAuthEmailProvider({
      client: sdk.client,
      path: { project_id: projectId, branch_id: branchId },
      throwOnError: true,
    });
    return { data };
  },

  async addBranchNeonAuthOauthProvider(
    projectId: string,
    branchId: string,
    body: NeonAuthAddOAuthProviderRequest
  ) {
    await sdk.auth.oauthProviders.add(projectId, branchId, body);
  },

  async deleteBranchNeonAuthOauthProvider(
    projectId: string,
    branchId: string,
    providerId: NeonAuthOauthProviderId
  ) {
    await sdk.auth.oauthProviders.delete(projectId, branchId, providerId);
  },

  // -------------------------------------------------------------------------
  // Object storage (per-branch, S3-compatible). `sdk.storage.*`
  // -------------------------------------------------------------------------

  async getBranchStorage(
    projectId: string,
    branchId: string
  ): Promise<{ data: BranchStorage }> {
    const data = await sdk.storage.get(projectId, branchId);
    return { data };
  },

  async listBuckets(projectId: string, branchId: string) {
    const buckets = await sdk.storage.buckets.list(projectId, branchId);
    return { data: { buckets } };
  },

  async createBucket(
    projectId: string,
    branchId: string,
    input: BucketCreateRequest
  ) {
    const bucket = await sdk.storage.buckets.create(projectId, branchId, input);
    return { data: { bucket } };
  },

  async deleteBucket(projectId: string, branchId: string, bucketName: string) {
    await sdk.storage.buckets.delete(projectId, branchId, bucketName);
  },

  async listBucketObjects(
    projectId: string,
    branchId: string,
    bucketName: string,
    query?: { prefix?: string; delimiter?: string; cursor?: string; limit?: number }
  ): Promise<{ data: BucketObjectsListResponse }> {
    const data = await sdk.storage.objects.list(
      projectId,
      branchId,
      bucketName,
      query
    );
    return { data };
  },

  async presignBucketObject(
    projectId: string,
    branchId: string,
    bucketName: string,
    objectKey: string,
    input: PresignRequest
  ): Promise<{ data: PresignResponse }> {
    const data = await sdk.storage.objects.presign(
      projectId,
      branchId,
      bucketName,
      objectKey,
      input
    );
    return { data };
  },

  async deleteBucketObject(
    projectId: string,
    branchId: string,
    bucketName: string,
    objectKey: string
  ) {
    await sdk.storage.objects.delete(projectId, branchId, bucketName, objectKey);
  },

  // -------------------------------------------------------------------------
  // Branch-scoped credentials (S3 access keys / AI Gateway tokens).
  // `sdk.credentials.*`
  // -------------------------------------------------------------------------

  async listCredentials(projectId: string, branchId: string) {
    const credentials = await sdk.credentials.list(projectId, branchId);
    return { data: { credentials } };
  },

  async createCredential(
    projectId: string,
    branchId: string,
    input: CreateCredentialRequest
  ): Promise<{ data: CreateCredentialResponse }> {
    const data = await sdk.credentials.create(projectId, branchId, input);
    return { data };
  },

  async revokeCredential(
    projectId: string,
    branchId: string,
    tokenId: string
  ) {
    await sdk.credentials.revoke(projectId, branchId, tokenId);
  },
};

export type {
  BranchStorage,
  Bucket,
  BucketAccessLevel,
  BucketObjectsListResponse,
  CreateCredentialResponse,
  CredentialMeta,
  CredentialScope,
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
