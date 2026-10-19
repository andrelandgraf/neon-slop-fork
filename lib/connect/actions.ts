"use server";
import { getProjectCapabilities } from "@/lib/capabilities";
import { dataApiDatabase, ifFound, neon, neonSdk } from "@/lib/neon";
import { loadBranch } from "@/lib/project-context";
import { parseConnectionUri, type ConnectionParts } from "@/lib/connect-snippets";

export interface ConnectEndpoint {
  id: string;
  label: string;
  state: string;
}

export interface ConnectDetails {
  branchName: string;
  isDefault: boolean;
  endpoints: ConnectEndpoint[];
  databases: { name: string; owner: string }[];
  roles: string[];
  storage: { endpoint: string; region: string } | null;
  aiGateway: { baseUrl: string } | null;
  dataApi: { url: string } | null;
  auth: { baseUrl: string; jwksUrl: string } | null;
}

/**
 * Everything the Connect dialog shows, loaded when it opens. Services the
 * project's region doesn't offer come back `null` and their tabs are hidden;
 * a service that exists but isn't enabled on this branch also comes back
 * `null` and its tab explains how to enable it.
 */
export async function loadConnectDetailsAction(
  projectId: string,
  branchId: string
): Promise<ConnectDetails> {
  const { branch } = await loadBranch(projectId, branchId);
  const capabilities = await getProjectCapabilities(projectId, branchId);

  const [endpointsRes, databasesRes, rolesRes] = await Promise.all([
    neon.listProjectBranchEndpoints(projectId, branchId),
    neon.listProjectBranchDatabases(projectId, branchId),
    neon.listProjectBranchRoles(projectId, branchId),
  ]);
  const endpoints = endpointsRes.data.endpoints;
  const databases = databasesRes.data.databases;
  const firstDatabase = dataApiDatabase(databases);

  const [storage, aiGateway, dataApi, auth] = await Promise.all([
    capabilities.storage
      ? ifFound(neonSdk.storage.get({ projectId, branchId }))
      : null,
    capabilities.aiGateway
      ? ifFound(neonSdk.aiGateway.get({ projectId, branchId }))
      : null,
    firstDatabase
      ? ifFound(
          neonSdk.postgres.dataApi.get({
            projectId,
            branchId,
            databaseName: firstDatabase,
          })
        )
      : null,
    ifFound(neonSdk.auth.get({ projectId, branchId })),
  ]);

  let replica = 0;
  return {
    branchName: branch.name,
    isDefault: branch.default,
    endpoints: endpoints.map((e) => ({
      id: e.id,
      label: e.type === "read_write" ? "Primary" : `Read replica ${++replica}`,
      state: e.current_state,
    })),
    databases: databases.map((d) => ({ name: d.name, owner: d.owner_name })),
    roles: rolesRes.data.roles.filter((r) => !r.protected).map((r) => r.name),
    storage: storage?.enabled
      ? { endpoint: storage.s3_endpoint, region: storage.region }
      : null,
    aiGateway: aiGateway?.enabled ? { baseUrl: aiGateway.base_url } : null,
    dataApi: dataApi ? { url: dataApi.url } : null,
    auth: auth?.base_url ? { baseUrl: auth.base_url, jwksUrl: auth.jwks_url } : null,
  };
}

export async function getConnectionPartsAction(
  projectId: string,
  branchId: string,
  endpointId: string,
  databaseName: string,
  roleName: string
): Promise<ConnectionParts> {
  await loadBranch(projectId, branchId);
  const params = {
    projectId,
    branch_id: branchId,
    endpoint_id: endpointId,
    database_name: databaseName,
    role_name: roleName,
  };
  const [pooled, direct] = await Promise.all([
    neon.getConnectionUri({ ...params, pooled: true }),
    neon.getConnectionUri({ ...params, pooled: false }),
  ]);
  return parseConnectionUri(direct.data.uri, pooled.data.uri);
}
