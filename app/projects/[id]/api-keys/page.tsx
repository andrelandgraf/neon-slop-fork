import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeySquare, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * `/projects/[id]/api-keys` — informational only.
 *
 * The Neon public REST API exposes two kinds of API keys:
 *
 *   - **Personal** (`GET/POST /api_keys`) — tied to the calling user,
 *     not scoped to a project. Useful for personal automation.
 *   - **Organization-level** (`/organizations/{org_id}/api_keys`) —
 *     shared across every project in the org.
 *
 * There is **no** `/projects/{id}/api_keys` endpoint. console.neon.tech
 * historically surfaced "project keys" as a UI affordance over the
 * org-level endpoint scoped client-side; our multi-tenant clone can't
 * faithfully reproduce that without leaking keys across tenants.
 *
 * We render an empty state pointing the user at the upstream console
 * for personal/org key management. The sidebar item is disabled and
 * direct URL hits land here.
 */
export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return (
    <div className="px-8 py-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1 flex items-center gap-2">
            API keys
            <Badge variant="muted">Not available</Badge>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Project-scoped API keys aren&apos;t surfaced by the public Neon
            REST API. Only personal keys and organization-level keys exist,
            and exposing the org&apos;s keys through this multi-tenant clone
            would leak credentials across users.
          </p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
            <KeySquare className="h-4 w-4" />
          </div>
          <div className="space-y-2 text-sm">
            <p>
              Mint personal or org-level Neon API keys on{" "}
              <a
                href="https://console.neon.tech/app/settings/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                console.neon.tech/app/settings/api-keys
                <ExternalLink className="h-3 w-3" />
              </a>
              . Both flavors are usable against{" "}
              <code className="text-xs">https://console.neon.tech/api/v2/…</code>
              .
            </p>
            <p className="text-xs text-muted-foreground">
              SDK references: <code>listApiKeys</code> /{" "}
              <code>createApiKey</code> (personal) and{" "}
              <code>listOrgApiKeys</code> / <code>createOrgApiKey</code>{" "}
              (organization) in <code>@neon/sdk</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
