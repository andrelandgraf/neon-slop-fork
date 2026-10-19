import "server-only";
import { z } from "zod";

/**
 * The AI Gateway catalog Neon publishes at neon.com/models.json (models.dev
 * shape). The Console reads `/ai_gateway/models`, which rejects organization
 * API keys, so the public catalog is the source here.
 */
const CATALOG_URL = "https://neon.com/models.json";

const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  family: z.string().optional(),
  release_date: z.string().optional(),
  modalities: z.object({ output: z.array(z.string()) }).optional(),
  limit: z.object({ context: z.number().optional(), output: z.number().optional() }).optional(),
  cost: z.object({ input: z.number().optional(), output: z.number().optional() }).optional(),
});

const catalogSchema = z.object({
  neon: z.object({ models: z.record(z.string(), modelSchema) }),
});

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  meta: "Meta",
  alibaba: "Alibaba",
  xai: "xAI",
  deepseek: "DeepSeek",
  moonshotai: "Moonshot AI",
  zhipuai: "Zhipu AI",
  thinkingmachines: "Thinking Machines",
  baai: "BAAI",
};

export interface GatewayModel {
  id: string;
  name: string;
  provider: string;
  providerLabel: string;
  family: string;
  releaseDate: string | null;
  context: number | null;
  costIn: number | null;
  costOut: number | null;
  output: string[];
  capabilities: ("Web search" | "Image generation" | "Embeddings")[];
}

export async function loadGatewayModels(): Promise<GatewayModel[]> {
  const res = await fetch(CATALOG_URL, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`neon.com/models.json returned ${res.status}`);
  const catalog = catalogSchema.parse(await res.json());
  return Object.values(catalog.neon.models)
    .map((m): GatewayModel => {
      const embedding = m.family === "text-embedding";
      const output = embedding ? ["embedding"] : (m.modalities?.output ?? ["text"]);
      const capabilities: GatewayModel["capabilities"] = [];
      // The catalog has no tool flags; the Console lists web search and image
      // generation for the OpenAI models that can return images.
      if (m.provider === "openai" && output.includes("image")) {
        capabilities.push("Web search", "Image generation");
      }
      if (embedding) capabilities.push("Embeddings");
      return {
        id: m.id,
        name: m.name,
        provider: m.provider,
        providerLabel: PROVIDER_LABELS[m.provider] ?? m.provider,
        family: m.family ?? m.id,
        releaseDate: m.release_date ?? null,
        context: m.limit?.context ?? null,
        costIn: m.cost?.input ?? null,
        costOut: m.cost?.output ?? null,
        output,
        capabilities,
      };
    })
    .sort(
      (a, b) =>
        a.providerLabel.localeCompare(b.providerLabel) || a.name.localeCompare(b.name)
    );
}
