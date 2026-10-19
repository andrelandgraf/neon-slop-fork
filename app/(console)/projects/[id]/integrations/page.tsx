import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/page-header";
import { loadProjectBranch } from "@/lib/project-context";

export const dynamic = "force-dynamic";

interface Integration {
  name: string;
  description: string;
  guide: string;
  beta?: boolean;
  /** The Console connects these through Neon's OAuth apps, which this clone can't use. */
  oauth?: boolean;
}

const guide = (slug: string) => `https://neon.com/docs/guides/${slug}`;

const GITHUB: Integration = {
  name: "GitHub",
  description: "Connect to GitHub and branch your database with every PR.",
  guide: guide("neon-github-integration"),
  oauth: true,
};
const NETLIFY: Integration = {
  name: "Netlify",
  description: "Access your Neon project from Netlify Functions.",
  guide: guide("netlify-functions"),
};
const VERCEL: Integration = {
  name: "Vercel",
  description: "Create a database branch for every Vercel preview deployment.",
  guide: guide("vercel-overview"),
  oauth: true,
};

const CATEGORIES: { id: string; title: string; items: Integration[] }[] = [
  { id: "featured", title: "Featured", items: [GITHUB, NETLIFY, VERCEL] },
  {
    id: "monitor",
    title: "Monitor",
    items: [
      { name: "Datadog", description: "Send metrics and events from Neon to Datadog", guide: guide("datadog") },
      {
        name: "OpenTelemetry",
        description: "Send metrics and events from Neon to any OpenTelemetry compatible backend",
        guide: guide("opentelemetry"),
        beta: true,
      },
    ],
  },
  {
    id: "develop",
    title: "Develop",
    items: [
      GITHUB,
      { name: "Prisma", description: "Configure your Neon database schema with Prisma.", guide: guide("prisma") },
    ],
  },
  {
    id: "deploy",
    title: "Deploy",
    items: [
      { name: "Deno Deploy", description: "Access your Neon project from Deno Deploy.", guide: guide("deno") },
      { name: "Heroku", description: "Access your Neon project from Heroku.", guide: guide("heroku") },
      { name: "Koyeb", description: "Access your Neon project from Koyeb.", guide: guide("koyeb") },
      NETLIFY,
      { name: "Pages", description: "Access your Neon project from Cloudflare Pages.", guide: guide("cloudflare-pages") },
      { name: "Railway", description: "Access your Neon project from Railway.", guide: guide("railway") },
      { name: "Render", description: "Access your Neon project from Render.", guide: guide("render") },
      VERCEL,
      { name: "Workers", description: "Access your Neon project from Cloudflare Workers.", guide: guide("cloudflare-workers") },
      { name: "WunderGraph", description: "Access your Neon project from WunderGraph Cloud.", guide: guide("wundergraph") },
    ],
  },
  {
    id: "query",
    title: "Query",
    items: [
      { name: "Exograph", description: "Add GraphQL APIs to your Neon database with Exograph.", guide: guide("exograph") },
      { name: "Grafbase", description: "Deploy a serverless GraphQL backend with Grafbase and Neon.", guide: guide("grafbase") },
      { name: "Hasura", description: "Add GraphQL APIs to your Neon database with Hasura.", guide: guide("hasura") },
      { name: "Hyperdrive", description: "Go global with Cloudflare Hyperdrive's distributed network.", guide: guide("cloudflare-hyperdrive") },
    ],
  },
  {
    id: "replicate",
    title: "Replicate",
    items: [
      { name: "Airbyte", description: "Move data out of or into your Neon database with Airbyte.", guide: guide("logical-replication-airbyte") },
      { name: "Confluent", description: "Stream data in your Neon database to your Confluent cloud.", guide: guide("logical-replication-kafka-confluent") },
      { name: "Fivetran", description: "Move data out of or into your Neon database with Fivetran.", guide: guide("logical-replication-fivetran") },
      { name: "Materialize", description: "Stream data from your database to a Materialize warehouse.", guide: guide("logical-replication-materialize") },
      { name: "Sequin", description: "Use Sequin to sync real-time changes from your Neon database to other systems.", guide: guide("sequin") },
    ],
  },
];

export default async function IntegrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch: branchParam } = await searchParams;
  const { project, branch } = await loadProjectBranch(id, branchParam);

  return (
    <PageBody>
      <PageHeader
        title="Integrations"
        project={project}
        branch={branch}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href="https://github.com/andrelandgraf/neon-slop-fork/issues/new?title=Integration%20suggestion"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Suggest an integration
          </Button>
        }
      />
      <div className="flex gap-10">
        <div className="min-w-0 flex-1 space-y-8">
          {CATEGORIES.map((category) => (
            <section key={category.id} id={category.id} className="scroll-mt-4">
              <h2 className="mb-3 font-semibold text-lg">{category.title}</h2>
              <div className="grid grid-cols-3 gap-3">
                {category.items.map((item) => (
                  <div
                    key={`${category.id}-${item.name}`}
                    className="flex flex-col justify-between gap-4 rounded-[3px] border border-panel-border p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        {item.name}
                        {item.beta && <Badge className="bg-primary/20 text-foreground">Beta</Badge>}
                      </div>
                      <p className="mt-1 text-muted-foreground text-sm">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.oauth && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          title="The Console connects this through Neon's OAuth app, which this clone can't use."
                        >
                          Add
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<a href={item.guide} target="_blank" rel="noreferrer" />}
                      >
                        Read <ExternalLink className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <nav className="sticky top-4 h-fit w-[140px] shrink-0 space-y-1 text-sm">
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="block text-nav-foreground hover:text-foreground">
              {c.title}
            </a>
          ))}
        </nav>
      </div>
    </PageBody>
  );
}
