import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NeonAuthEmailServerConfig } from "@neondatabase/api-client";

/**
 * Email provider card (read-only). The Neon Console lets you swap
 * between the shared SMTP server and a "Standard" SMTP server with
 * your own host/port/credentials. Editing standard credentials would
 * mean POSTing host + port + username + password — which crosses a
 * sensitive boundary we don't want to bake into this clone's UI
 * (you'd want a 2-factor confirmation, secret obfuscation, etc.).
 * We display the current config and link out to the upstream console
 * for changes.
 */
export function EmailProviderCard({
  provider,
}: {
  provider: NeonAuthEmailServerConfig | null;
}) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">Email provider</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Sender used for verification, magic-link, and invitation emails.
      </p>
      {provider ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground mb-0.5">Server</dt>
            <dd>
              <Badge variant="muted">
                {provider.type === "shared" ? "Shared" : "Standard SMTP"}
              </Badge>
            </dd>
          </div>
          {provider.type === "shared" && (
            <>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">
                  Sender address
                </dt>
                <dd className="text-xs font-mono">
                  {provider.sender_email ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">
                  Sender name
                </dt>
                <dd className="text-xs font-mono">
                  {provider.sender_name ?? "—"}
                </dd>
              </div>
            </>
          )}
          {provider.type === "standard" && (
            <>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Host</dt>
                <dd className="text-xs font-mono break-all">{provider.host}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Port</dt>
                <dd className="text-xs font-mono">{provider.port}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">
                  Username
                </dt>
                <dd className="text-xs font-mono break-all">
                  {provider.username}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">
                  Sender address
                </dt>
                <dd className="text-xs font-mono break-all">
                  {provider.sender_email}
                </dd>
              </div>
            </>
          )}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No email provider configured yet. The shared transactional server is
          used by default for invites and verification.
        </p>
      )}
      <p className="text-[11px] text-muted-foreground mt-3">
        To swap to your own SMTP server, run{" "}
        <code className="text-[10px] font-mono">
          PATCH /projects/{`{id}`}/branches/{`{branch}`}/auth/email_provider
        </code>{" "}
        with the standard config payload — we intentionally don&apos;t edit
        SMTP creds in this clone.
      </p>
    </Card>
  );
}
