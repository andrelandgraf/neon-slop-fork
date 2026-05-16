"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EndpointType } from "@neondatabase/api-client";
import { neon, ORG_ID } from "@/lib/neon";

export async function createProjectAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "aws-us-east-1");
  const pg_version_raw = String(formData.get("pg_version") ?? "17");

  if (!name) throw new Error("Project name is required.");

  const res = await neon.createProject({
    project: {
      name,
      region_id: region,
      pg_version: Number.parseInt(pg_version_raw, 10),
      org_id: ORG_ID,
    },
  });
  revalidatePath("/projects");
  redirect(`/projects/${res.data.project.id}`);
}

export async function deleteProjectAction(projectId: string): Promise<void> {
  await neon.deleteProject(projectId);
  revalidatePath("/projects");
  redirect("/projects");
}

export async function renameProjectAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) throw new Error("projectId and name are required.");
  await neon.updateProject(projectId, { project: { name } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function createBranchAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim() || undefined;
  if (!projectId) throw new Error("projectId is required.");
  await neon.createProjectBranch(projectId, {
    ...(name ? { branch: { name } } : {}),
    endpoints: [{ type: EndpointType.ReadWrite }],
  });
  revalidatePath(`/projects/${projectId}/branches`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteBranchAction(
  projectId: string,
  branchId: string
): Promise<void> {
  await neon.deleteProjectBranch(projectId, branchId);
  revalidatePath(`/projects/${projectId}/branches`);
  revalidatePath(`/projects/${projectId}`);
}

export async function setDefaultBranchAction(
  projectId: string,
  branchId: string
): Promise<void> {
  await neon.setDefaultProjectBranch(projectId, branchId);
  revalidatePath(`/projects/${projectId}/branches`);
}

/**
 * Mint a real Neon project-scoped API key via the Neon control plane.
 * The plaintext token is returned exactly once and never again.
 */
export interface CreatedProjectApiKey {
  id: number;
  key: string;
  name: string;
  created_at: string;
}

export async function createProjectApiKeyAction(
  projectId: string,
  name: string
): Promise<CreatedProjectApiKey> {
  if (!projectId) throw new Error("projectId is required.");
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("Key name is required.");
  const apiKey = process.env.NEON_API_KEY!;
  const r = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/api_keys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key_name: trimmed }),
    }
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Failed to create API key: ${r.status} ${text}`);
  }
  const json = (await r.json()) as CreatedProjectApiKey;
  revalidatePath(`/projects/${projectId}/api-keys`);
  return json;
}

export async function revokeProjectApiKeyAction(
  projectId: string,
  keyId: number
): Promise<void> {
  const apiKey = process.env.NEON_API_KEY!;
  const r = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/api_keys/${keyId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  if (!r.ok) {
    throw new Error(`Failed to revoke API key: ${r.status}`);
  }
  revalidatePath(`/projects/${projectId}/api-keys`);
}

export async function restoreToTimestampAction(
  projectId: string,
  branchId: string,
  timestamp: string,
  preserveName?: string
): Promise<void> {
  await neon.restoreProjectBranch(projectId, branchId, {
    source_branch_id: branchId,
    source_timestamp: timestamp,
    ...(preserveName ? { preserve_under_name: preserveName } : {}),
  });
  revalidatePath(`/projects/${projectId}/backup`);
}
