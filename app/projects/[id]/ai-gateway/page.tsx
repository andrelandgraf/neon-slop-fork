import { Sparkles, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * `/projects/[id]/ai-gateway`
 *
 * Mirrors console.neon.tech's per-branch AI Gateway screen. AI Gateway is a
 * paid feature, so on a Free project the console shows a gated "Upgrade to
 * use AI Gateway" state rather than the routes/analytics UI. Billing isn't
 * wired in this clone, so the upgrade CTA points at Neon's pricing page.
 */
const HIGHLIGHTS = [
  "OpenAI-compatible endpoint — no SDK changes",
  "Per-branch credentials with granular scopes",
  "Usage analytics across every model and route",
];

export default async function AiGatewayPage() {
  return (
    <div className="px-8 py-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          AI Gateway
        </h1>
        <Badge variant="muted">Beta</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Send AI model requests through this branch using an OpenAI-compatible
        endpoint.
      </p>

      <Card className="p-8">
        <div className="flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-md bg-primary/10 grid place-items-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h2 className="mt-4 text-base font-semibold">
            Upgrade to use AI Gateway
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            AI Gateway is available on paid plans. Route requests to Llama,
            Mistral, GPT, Claude, and Gemini through a single OpenAI-compatible
            endpoint with usage analytics and per-branch credentials. Free
            during Beta; future usage will be billed at provider list prices
            with no Neon markup.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Button
              asChild
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <a href="https://neon.com/pricing" target="_blank" rel="noreferrer">
                Upgrade to Paid
              </a>
            </Button>
            <a
              href="https://neon.com/docs/ai-gateway/get-started"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-sm text-primary hover:underline"
            >
              Learn more about AI Gateway <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="mt-7 border-t pt-5 space-y-2.5">
          {HIGHLIGHTS.map((h) => (
            <div key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {h}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
