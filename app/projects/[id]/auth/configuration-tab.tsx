import { neon } from "@/lib/neon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  NeonAuthIntegration,
  ListNeonAuthOauthProvidersResponse,
  NeonAuthRedirectURIWhitelistResponse,
  NeonAuthAllowLocalhostResponse,
  NeonAuthEmailAndPasswordConfig,
  NeonAuthWebhookConfig,
  NeonAuthEmailServerConfig,
} from "@neondatabase/api-client";
import { ProjectInfoCard } from "./cards/project-info-card";
import { DomainsCard } from "./cards/domains-card";
import { EmailPasswordCard } from "./cards/email-password-card";
import { OauthProvidersCard } from "./cards/oauth-providers-card";
import { EmailProviderCard } from "./cards/email-provider-card";
import { WebhooksCard } from "./cards/webhooks-card";
import { DisableAuthCard } from "./cards/disable-auth-card";

/**
 * Configuration tab — every section maps 1:1 to a Neon Auth REST endpoint
 * under `/projects/{pid}/branches/{bid}/auth/...`. We fan out a single
 * `Promise.all` here so the page renders in one round-trip rather than
 * waterfalling through six separate cards.
 *
 * All `.catch(() => null)` blocks tolerate the "endpoint exists but the
 * provider hasn't provisioned this object yet" 404s — observed on the
 * `webhooks` and `plugins` endpoints immediately after enabling Neon
 * Auth (the role isn't created until the first sign-up). We render the
 * card with sensible defaults instead of failing the whole page.
 */
export async function AuthConfigurationTab({
  projectId,
  branchId,
  integration,
}: {
  projectId: string;
  branchId: string;
  integration: NeonAuthIntegration;
}) {
  const [
    oauthProviders,
    domains,
    allowLocalhost,
    emailPassword,
    webhookConfig,
    emailProvider,
  ] = await Promise.all([
    neon
      .listBranchNeonAuthOauthProviders(projectId, branchId)
      .then((r) => r.data)
      .catch<ListNeonAuthOauthProvidersResponse>(() => ({ providers: [] })),
    neon
      .listBranchNeonAuthTrustedDomains(projectId, branchId)
      .then((r) => r.data)
      .catch<NeonAuthRedirectURIWhitelistResponse>(() => ({ domains: [] })),
    neon
      .getNeonAuthAllowLocalhost(projectId, branchId)
      .then((r) => r.data)
      .catch<NeonAuthAllowLocalhostResponse>(() => ({ allow_localhost: true })),
    neon
      .getNeonAuthEmailAndPasswordConfig(projectId, branchId)
      .then((r) => r.data)
      .catch<NeonAuthEmailAndPasswordConfig | null>(() => null),
    neon
      .getNeonAuthWebhookConfig(projectId, branchId)
      .then((r) => r.data)
      .catch<NeonAuthWebhookConfig | null>(() => null),
    neon
      .getNeonAuthEmailProvider(projectId, branchId)
      .then((r) => r.data)
      .catch<NeonAuthEmailServerConfig | null>(() => null),
  ]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-sm font-semibold">Provider</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Auth provider for this branch.
            </p>
          </div>
          <Badge variant="muted">{integration.auth_provider}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-muted-foreground mb-0.5">Provider project</dt>
            <dd className="font-mono break-all">
              {integration.auth_provider_project_id}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-0.5">Owned by</dt>
            <dd className="font-mono">{integration.owned_by}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground mb-0.5">JWKS URL</dt>
            <dd className="font-mono break-all">{integration.jwks_url}</dd>
          </div>
        </dl>
      </Card>

      <ProjectInfoCard integration={integration} />

      <DomainsCard
        projectId={projectId}
        branchId={branchId}
        domains={domains.domains.map((d) => d.domain)}
        allowLocalhost={allowLocalhost.allow_localhost}
      />

      <EmailPasswordCard
        projectId={projectId}
        branchId={branchId}
        config={emailPassword}
      />

      <OauthProvidersCard
        projectId={projectId}
        branchId={branchId}
        providers={oauthProviders.providers}
      />

      <EmailProviderCard provider={emailProvider} />

      <WebhooksCard
        projectId={projectId}
        branchId={branchId}
        config={webhookConfig}
      />

      <DisableAuthCard projectId={projectId} branchId={branchId} />
    </div>
  );
}
