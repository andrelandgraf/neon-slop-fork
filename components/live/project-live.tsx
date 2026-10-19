"use client";
import { createContext, useContext } from "react";
import { eq, useDbClient, useLiveQuery } from "@tanstack/react-db";
import { useShellCollections } from "@/components/live/live-root";
import {
  branchServicesCollection,
  dataApisCollection,
  bucketsCollection,
  functionsCollection,
  triggersCollection,
  customDomainsCollection,
  credentialsCollection,
  maskingStatusCollection,
  snapshotsCollection,
  snapshotSchedulesCollection,
  collaboratorsCollection,
  databasesCollection,
  endpointsCollection,
  operationsCollection,
  projectBranchesCollection,
  rolesCollection,
} from "@/lib/live/collections";
import type { LiveParams, LiveSeed } from "@/lib/live/load";
import type {
  BranchServiceRow,
  DataApiRow,
  BucketRow,
  FunctionRow,
  TriggerRow,
  CustomDomainRow,
  CredentialRow,
  MaskingStatusRow,
  SnapshotRow,
  SnapshotScheduleRow,
  CollaboratorRow,
  DatabaseRow,
  EndpointRow,
  OperationRow,
  ProjectBranchRow,
  RoleRow,
} from "@/lib/live/queries";

function useCollections(
  params: LiveParams,
  seeds: { branches: LiveSeed<ProjectBranchRow>; endpoints: LiveSeed<EndpointRow>; operations: LiveSeed<OperationRow> }
) {
  const db = useDbClient();
  return {
    params,
    branches: db.collection(projectBranchesCollection(params, seeds.branches.sealedQuery), {
      initialData: seeds.branches.initialData,
    }),
    endpoints: db.collection(endpointsCollection(params, seeds.endpoints.sealedQuery), {
      initialData: seeds.endpoints.initialData,
    }),
    operations: db.collection(operationsCollection(params, seeds.operations.sealedQuery), {
      initialData: seeds.operations.initialData,
    }),
  };
}

type ProjectCollections = ReturnType<typeof useCollections>;

const ProjectContext = createContext<ProjectCollections | null>(null);

/** The open project's branches, computes and newest operations, live for every page under the project. */
export function ProjectLive({
  params,
  branches,
  endpoints,
  operations,
  children,
}: {
  params: LiveParams;
  branches: LiveSeed<ProjectBranchRow>;
  endpoints: LiveSeed<EndpointRow>;
  operations: LiveSeed<OperationRow>;
  children: React.ReactNode;
}) {
  const value = useCollections(params, { branches, endpoints, operations });
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectLive(): ProjectCollections {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("useProjectLive must be used inside <ProjectLive>.");
  return value;
}

/** One branch's databases, seeded from the page that shows them. */
export function useBranchDatabases(branchId: string, seed: LiveSeed<DatabaseRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(databasesCollection({ ...params, branchId }, seed.sealedQuery), {
    initialData: seed.initialData,
  });
}

/** One branch's roles, seeded from the page that shows them. */
export function useBranchRoles(branchId: string, seed: LiveSeed<RoleRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(rolesCollection({ ...params, branchId }, seed.sealedQuery), {
    initialData: seed.initialData,
  });
}

/**
 * The live project and branch rows for a header. Outside a project page the
 * branch is undefined, and callers keep what the server rendered.
 */
export function useLiveHeader(projectId: string | undefined, branchId: string | undefined) {
  const shell = useShellCollections();
  const live = useContext(ProjectContext);
  const { data: projects } = useLiveQuery({
    query: (q) =>
      projectId ? q.from({ project: shell.projects }).where(({ project }) => eq(project.id, projectId)) : undefined,
  });
  const { data: branches } = useLiveQuery({
    query: (q) =>
      live && branchId ? q.from({ branch: live.branches }).where(({ branch }) => eq(branch.id, branchId)) : undefined,
  });
  return { project: projects?.[0], branch: branches?.[0] };
}

/* App-backend collections, each seeded by the page that shows it. */

export function useBranchServices(branchId: string, seed: LiveSeed<BranchServiceRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(branchServicesCollection({ ...params, branchId }, seed.sealedQuery), { initialData: seed.initialData });
}

export function useDataApis(branchId: string, seed: LiveSeed<DataApiRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(dataApisCollection({ ...params, branchId }, seed.sealedQuery), { initialData: seed.initialData });
}

export function useBuckets(branchId: string, seed: LiveSeed<BucketRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(bucketsCollection({ ...params, branchId }, seed.sealedQuery), { initialData: seed.initialData });
}

export function useFunctions(branchId: string, seed: LiveSeed<FunctionRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(functionsCollection({ ...params, branchId }, seed.sealedQuery), { initialData: seed.initialData });
}

export function useTriggers(branchId: string, seed: LiveSeed<TriggerRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(triggersCollection({ ...params, branchId }, seed.sealedQuery), { initialData: seed.initialData });
}

export function useCustomDomains(branchId: string, seed: LiveSeed<CustomDomainRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(customDomainsCollection({ ...params, branchId }, seed.sealedQuery), { initialData: seed.initialData });
}

export function useCredentials(branchId: string, seed: LiveSeed<CredentialRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(credentialsCollection({ ...params, branchId }, seed.sealedQuery), { initialData: seed.initialData });
}

export function useMaskingStatus(branchId: string, seed: LiveSeed<MaskingStatusRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(maskingStatusCollection({ ...params, branchId }, seed.sealedQuery), { initialData: seed.initialData });
}

export function useSnapshots(seed: LiveSeed<SnapshotRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(snapshotsCollection(params, seed.sealedQuery), { initialData: seed.initialData });
}

export function useSnapshotSchedules(seed: LiveSeed<SnapshotScheduleRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(snapshotSchedulesCollection(params, seed.sealedQuery), { initialData: seed.initialData });
}

export function useCollaborators(seed: LiveSeed<CollaboratorRow>) {
  const { params } = useProjectLive();
  return useDbClient().collection(collaboratorsCollection(params, seed.sealedQuery), { initialData: seed.initialData });
}
