import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/page-header";

const INTEGRATIONS = [
  {
    name: "GitHub",
    title: "Create a database branch with every pull request",
    body: "Create a database branch with every pull request for production-like preview deployments. Add the app and get started connecting Neon projects to your GitHub repositories.",
    cta: "Install GitHub App",
    guide: "https://neon.com/docs/guides/neon-github-integration",
  },
  {
    name: "Vercel",
    title: "Instant database branching with every Preview Deployment",
    body: "When you push changes to your repository, the integration automatically creates a Neon branch for your preview deployment, so your team works on isolated database branches.",
    cta: "Install from Vercel Marketplace",
    guide: "https://neon.com/docs/guides/vercel-overview",
  },
];

export default function OrgIntegrationsPage() {
  return (
    <PageBody>
      <PageHeader title="Integrations" />
      <div className="max-w-[860px] space-y-4">
        {INTEGRATIONS.map((i) => (
          <section key={i.name} className="rounded-[3px] border border-panel-border p-5">
            <div className="text-muted-foreground text-xs">{i.name}</div>
            <h2 className="mt-1 font-semibold text-lg">{i.title}</h2>
            <p className="mt-1 text-sm">{i.body}</p>
            <div className="mt-4 flex gap-2">
              <Button disabled title="These installs use Neon's OAuth apps, which this clone can't use.">
                {i.cta}
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={i.guide} target="_blank" rel="noreferrer" />}
              >
                Read the guide
              </Button>
            </div>
          </section>
        ))}
      </div>
    </PageBody>
  );
}
