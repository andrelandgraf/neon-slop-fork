import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateApiKeyDialog } from "@/components/api-keys/create-dialog";
import { RevokeApiKeyButton } from "@/components/api-keys/revoke-button";

export const dynamic = "force-dynamic";

interface NeonApiKey {
  id: number;
  name: string;
  created_at: string;
  last_used_at?: string;
  created_by?: { id: string; name?: string; image?: string };
}

async function listProjectApiKeys(projectId: string): Promise<NeonApiKey[]> {
  const apiKey = process.env.NEON_API_KEY!;
  const r = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/api_keys`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    }
  );
  if (!r.ok) return [];
  const json = (await r.json()) as NeonApiKey[];
  return Array.isArray(json) ? json : [];
}

/**
 * `/projects/[id]/api-keys`
 *
 * Real Neon project-scoped API keys, fetched and managed via the
 * public Neon control-plane endpoints under
 * `/projects/{projectId}/api_keys`. The plaintext key is only ever
 * returned on creation — the dialog surfaces it once.
 */
export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const keys = await listProjectApiKeys(projectId);

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">API keys</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Project-scoped Neon API keys. Each key authenticates calls to the
            public Neon API under{" "}
            <code className="font-mono text-xs">
              /projects/{projectId.length > 24 ? projectId.slice(0, 12) + "…" : projectId}/…
            </code>{" "}
            with the same permissions you have in the console.
          </p>
        </div>
        <CreateApiKeyDialog projectId={projectId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active keys</CardTitle>
          <CardDescription>
            {keys.length === 0
              ? "No keys yet. Create one to authenticate a downstream app."
              : `${keys.length} key${keys.length === 1 ? "" : "s"} in this project.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Created</th>
                  <th className="py-2 font-medium">Last used</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{k.name}</td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {k.last_used_at ? (
                        new Date(k.last_used_at).toLocaleString()
                      ) : (
                        <Badge variant="muted">Never</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <RevokeApiKeyButton
                        projectId={projectId}
                        keyId={k.id}
                        keyName={k.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 max-w-xl">
        The plaintext token is shown exactly once at creation — copy it then.
        Revoking a key is immediate and irreversible.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      <p>No keys yet.</p>
      <p className="mt-1 text-xs">
        Use the <strong>Create key</strong> button to mint one. The token is
        shown once, then never again.
      </p>
    </div>
  );
}
