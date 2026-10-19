import Link from "next/link";
import { Sparkles, ExternalLink } from "lucide-react";
import { requireCapability } from "@/lib/capabilities";
import { neon } from "@/lib/neon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CodeSnippetTabs } from "@/components/code-snippet-tabs";

export const dynamic = "force-dynamic";

const MODEL = "gpt-5";

/**
 * `/projects/[id]/ai-gateway`
 *
 * Mirrors console.neon.tech's per-branch AI Gateway screen: the branch's
 * OpenAI-compatible base URL, per-language snippets wired to it, and links to
 * the credential that authorizes calls. The gateway only exists in regions
 * where it has been rolled out, so the nav entry and this route are both
 * gated on the branch reporting one.
 *
 * The Console additionally offers a model picker; the public API exposes no
 * model catalog, so the snippets name a representative model instead.
 */
export default async function AiGatewayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id: projectId } = await params;
  const { branch: branchParam } = await searchParams;

  const branchesRes = await neon.listProjectBranches({ projectId });
  const branches = branchesRes.data.branches;
  const defaultBranch = branches.find((b) => b.default) ?? branches[0];
  const activeBranch =
    branches.find((b) => b.id === branchParam) ?? defaultBranch;

  await requireCapability(projectId, activeBranch.id, "aiGateway");

  const gateway = await neon
    .getBranchAiGateway(projectId, activeBranch.id)
    .then((r) => r.data)
    .catch(() => null);

  const branchQuery = branchParam ? `?branch=${branchParam}` : "";
  const baseUrl = gateway?.base_url ?? "";

  const envCode = `NEON_AI_GATEWAY_BASE_URL=${baseUrl}
# Create an ai_gateway:invoke credential on the Credentials page:
NEON_AI_GATEWAY_TOKEN=nak_live_...`;

  const aiSdkCode = `import { generateText } from "ai";
import { neon } from "@neon/ai-sdk-provider";

const { text } = await generateText({
  model: neon("${MODEL}"),
  prompt: "Explain Serverless Postgres.",
});

console.log(text);`;

  const pythonCode = `import os
from openai import OpenAI

client = OpenAI(
    base_url=f"{os.environ['NEON_AI_GATEWAY_BASE_URL']}/openai/v1",
    api_key=os.environ["NEON_AI_GATEWAY_TOKEN"],
)

response = client.responses.create(
    model="${MODEL}",
    input="Explain Serverless Postgres.",
)

print(response.output_text)`;

  const curlCode = `curl "$NEON_AI_GATEWAY_BASE_URL/openai/v1/responses" \\
  -H "Authorization: Bearer $NEON_AI_GATEWAY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${MODEL}","input":"Explain Serverless Postgres."}'`;

  return (
    <div className="px-8 py-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          AI Gateway
        </h1>
        <Badge variant="secondary">Beta</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Send AI model requests through{" "}
        <span className="font-medium text-foreground">{activeBranch.name}</span>{" "}
        using an OpenAI-compatible endpoint.
      </p>

      {gateway ? (
        <CodeSnippetTabs
          snippets={[
            {
              id: "env",
              label: ".env",
              filename: ".env",
              language: "bash",
              code: envCode,
            },
            {
              id: "ai-sdk",
              label: "AI SDK",
              filename: "generate.ts",
              language: "typescript",
              code: aiSdkCode,
            },
            {
              id: "python",
              label: "Python",
              filename: "generate.py",
              language: "python",
              code: pythonCode,
            },
            {
              id: "curl",
              label: "cURL",
              filename: "request.sh",
              language: "bash",
              code: curlCode,
            },
          ]}
        />
      ) : (
        <Callout tone="warning">
          Couldn&apos;t read this branch&apos;s gateway endpoint. Reload to try
          again.
        </Callout>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button
          nativeButton={false}
          render={
            <Link href={`/projects/${projectId}/credentials${branchQuery}`} />
          }
        >
          Generate credential
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
  );
}
