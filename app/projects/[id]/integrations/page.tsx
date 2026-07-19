import {
  ArrowUpRight,
  Boxes,
  Cable,
  Database,
  GitPullRequest,
  Network,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type Integration = {
  category: "Develop" | "Deploy" | "Query" | "Replicate";
  description: string;
  docs: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  setup: "console-oauth" | "docs";
};

/**
 * The public API has no create/list endpoints for partner OAuth integrations,
 * but the Console exposes its catalog as a first-class project surface. Keep
 * that discovery workflow in the clone and link outward for the partners'
 * documented integration paths; only the Console can complete its private
 * OAuth handshakes for GitHub/Vercel today.
 */
const INTEGRATIONS: Integration[] = [
  {
    category: "Develop",
    description: "Connect to GitHub and branch your database with every PR.",
    docs: "https://neon.com/docs/guides/neon-github-integration",
    icon: GitPullRequest,
    name: "GitHub",
    setup: "console-oauth",
  },
  {
    category: "Develop",
    description: "Configure your Neon database schema with Prisma.",
    docs: "https://neon.com/docs/guides/prisma",
    icon: Database,
    name: "Prisma",
    setup: "docs",
  },
  {
    category: "Deploy",
    description: "Create a database branch for every Vercel preview deployment.",
    docs: "https://neon.com/docs/guides/vercel",
    icon: Workflow,
    name: "Vercel",
    setup: "console-oauth",
  },
  {
    category: "Deploy",
    description: "Access your Neon project from Netlify Functions.",
    docs: "https://neon.com/docs/guides/netlify",
    icon: Cable,
    name: "Netlify",
    setup: "docs",
  },
  {
    category: "Query",
    description: "Add GraphQL APIs to your Neon database with Hasura.",
    docs: "https://neon.com/docs/guides/hasura",
    icon: Network,
    name: "Hasura",
    setup: "docs",
  },
  {
    category: "Replicate",
    description: "Move data out of or into your Neon database with Airbyte.",
    docs: "https://neon.com/docs/guides/airbyte",
    icon: Boxes,
    name: "Airbyte",
    setup: "docs",
  },
];

const CATEGORIES = ["Develop", "Deploy", "Query", "Replicate"] as const;

export default function IntegrationsPage() {
  return (
    <div className="max-w-5xl px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Neon with the tools you use to develop, deploy, query, and
          replicate data.
        </p>
      </div>

      <div className="space-y-8">
        {CATEGORIES.map((category) => {
          const integrations = INTEGRATIONS.filter(
            (integration) => integration.category === category
          );
          return (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold">{category}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {integrations.map((integration) => (
                  <IntegrationCard key={integration.name} integration={integration} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;
  const isConsoleOAuth = integration.setup === "console-oauth";

  return (
    <div className="flex min-h-32 flex-col rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{integration.name}</h3>
            {isConsoleOAuth && <Badge variant="muted">Console setup</Badge>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {integration.description}
          </p>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <Button variant="outline" size="sm" asChild>
          <a href={integration.docs} target="_blank" rel="noreferrer">
            {isConsoleOAuth ? "Open setup guide" : "Read guide"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
