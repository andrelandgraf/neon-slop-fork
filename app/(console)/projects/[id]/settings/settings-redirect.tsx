"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HASH_TO_SECTION: Record<string, string> = {
  general: "general",
  compute: "postgres",
  history: "postgres",
  updates: "postgres",
  "logical-replication": "postgres",
  collaborators: "permissions",
  hipaa: "hipaa",
  networking: "networking",
  transfer: "general",
  delete: "general",
};

export function SettingsRedirect({ projectId, branch }: { projectId: string; branch?: string }) {
  const router = useRouter();
  // The fragment never reaches the server, so the mapping runs in the browser.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const section = HASH_TO_SECTION[hash] ?? "general";
    const anchor = section === "postgres" && hash ? `#${hash}` : "";
    router.replace(`/projects/${projectId}/settings/${section}${branch ? `?branch=${branch}` : ""}${anchor}`);
  }, [projectId, branch, router]);
  return null;
}
