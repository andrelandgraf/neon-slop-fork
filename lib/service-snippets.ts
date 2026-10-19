/**
 * Object storage and AI Gateway snippets, copied from the Neon Console's
 * Connect dialog and AI Gateway page so the clone shows the same code.
 */

export const STORAGE_CLIENTS = [
  { value: "s3", label: "S3 client", file: "s3-client.ts" },
  { value: "files", label: "Files SDK", file: "files-sdk.ts" },
  { value: "python", label: "Python", file: "upload.py" },
  { value: "env", label: "Parameters only", file: null },
] as const;

export type StorageClient = (typeof STORAGE_CLIENTS)[number]["value"];

export const STORAGE_INSTALL: Record<Exclude<StorageClient, "env">, string> = {
  s3: "npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv",
  files:
    "npm i files-sdk @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-presigned-post @aws-sdk/s3-request-presigner dotenv",
  python: "pip install boto3",
};

export const CREDENTIAL_PLACEHOLDER = "<generated when you copy>";

export function storageEnv(
  endpoint: string,
  region: string,
  accessKeyId = CREDENTIAL_PLACEHOLDER,
  secretAccessKey = CREDENTIAL_PLACEHOLDER
): string {
  return [
    "# S3-compatible storage. Generate a credential to fill in the key ID + secret.",
    `AWS_ENDPOINT_URL_S3="${endpoint}"`,
    `AWS_ACCESS_KEY_ID="${accessKeyId}"`,
    `AWS_SECRET_ACCESS_KEY="${secretAccessKey}"`,
    `AWS_REGION="${region}"`,
  ].join("\n");
}

export const STORAGE_CODE: Record<Exclude<StorageClient, "env">, string> = {
  s3: [
    'import "dotenv/config";',
    'import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";',
    'import { getSignedUrl } from "@aws-sdk/s3-request-presigner";',
    "",
    "const s3 = new S3Client({ forcePathStyle: true });",
    'const bucket = "assets";',
    'const key = "uploads/file.txt";',
    "",
    'await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "Hello World!" }));',
    "",
    "const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });",
    "console.log(`[view] ${url}`);",
  ].join("\n"),
  files: [
    'import "dotenv/config";',
    'import { Files } from "files-sdk";',
    'import { neon } from "files-sdk/neon";',
    "",
    'const bucket = "assets";',
    "const files = new Files({ adapter: neon({ bucket }) });",
    'const key = "uploads/file.txt";',
    "",
    'await files.upload(key, "Hello World!", { contentType: "text/plain" });',
    "",
    "const url = await files.url(key, { expiresIn: 3600 });",
    "console.log(`[view] ${url}`);",
  ].join("\n"),
  python: [
    "import os",
    "import boto3",
    "",
    's3 = boto3.client("s3", region_name=os.environ["AWS_REGION"])',
    'bucket = "assets"',
    'key = "uploads/file.txt"',
    "",
    's3.put_object(Bucket=bucket, Key=key, Body="Hello World!")',
    "",
    'url = s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=3600)',
    'print(f"[view] {url}")',
  ].join("\n"),
};

const GATEWAY_URL_VAR = "NEON_AI_GATEWAY_BASE_URL";
const GATEWAY_TOKEN_VAR = "NEON_AI_GATEWAY_TOKEN";
const PROMPT = "Explain Serverless Postgres.";
const OPENAI_PATH = "/v1";

export const GATEWAY_TOKEN_PLACEHOLDER = "<your-generated-credential>";

export function gatewayEnv(baseUrl: string, token = GATEWAY_TOKEN_PLACEHOLDER) {
  return [
    "# Add these variables to your .env file",
    "",
    `${GATEWAY_URL_VAR}="${baseUrl}"`,
    `${GATEWAY_TOKEN_VAR}="${token}"`,
  ].join("\n");
}

export function gatewayNeonTs(): string {
  return [
    "// Create a neon.ts file in your project repo, then run `npx neon link`",
    "// to automatically generate credentials and populate your app's .env file.",
    "",
    'import OpenAI from "openai";',
    "",
    "export const neon = new OpenAI({",
    `  baseURL: \`\${process.env.${GATEWAY_URL_VAR}}${OPENAI_PATH}\`,`,
    `  apiKey: process.env.${GATEWAY_TOKEN_VAR},`,
    "});",
  ].join("\n");
}

function envHeader(baseUrl: string, comment: string): string[] {
  return [
    `${comment} .env`,
    `${comment} ${GATEWAY_URL_VAR}=${baseUrl}`,
    `${comment} ${GATEWAY_TOKEN_VAR}=<your-token>`,
    "",
  ];
}

export const GATEWAY_LANGUAGES = [
  { key: "aisdk", label: "AI SDK" },
  { key: "mastra", label: "Mastra" },
  { key: "ts", label: "TypeScript" },
  { key: "python", label: "Python" },
  { key: "curl", label: "cURL" },
] as const;

export type GatewayLanguage = (typeof GATEWAY_LANGUAGES)[number]["key"];

export function gatewaySnippet(
  language: GatewayLanguage,
  baseUrl: string,
  model: string
): string {
  switch (language) {
    case "aisdk":
      return [
        ...envHeader(baseUrl, "//"),
        "import { generateText } from 'ai';",
        "import { neon } from '@neondatabase/ai-sdk-provider';",
        "",
        "const { text } = await generateText({",
        `  model: neon('${model}'),`,
        `  prompt: '${PROMPT}',`,
        "});",
        "",
        "console.log(text);",
      ].join("\n");
    case "mastra":
      return [
        ...envHeader(baseUrl, "//"),
        "import { Agent } from '@mastra/core/agent';",
        "",
        "const agent = new Agent({",
        "  name: 'neon-demo',",
        "  instructions: 'You are a helpful assistant.',",
        `  model: 'neon/${model}',`,
        "});",
        "",
        `const { text } = await agent.generate('${PROMPT}');`,
        "console.log(text);",
      ].join("\n");
    case "ts":
      return [
        ...envHeader(baseUrl, "//"),
        'import OpenAI from "openai";',
        "",
        "const client = new OpenAI({",
        `  apiKey: process.env.${GATEWAY_TOKEN_VAR},`,
        `  baseURL: \`\${process.env.${GATEWAY_URL_VAR}}${OPENAI_PATH}\`,`,
        "});",
        "",
        "const resp = await client.chat.completions.create({",
        `  model: "${model}",`,
        `  messages: [{ role: "user", content: "${PROMPT}" }],`,
        "});",
        "console.log(resp.choices[0].message.content);",
      ].join("\n");
    case "python":
      return [
        ...envHeader(baseUrl, "#"),
        "import os",
        "from openai import OpenAI",
        "",
        "client = OpenAI(",
        `    api_key=os.environ["${GATEWAY_TOKEN_VAR}"],`,
        `    base_url=f"{os.environ['${GATEWAY_URL_VAR}']}${OPENAI_PATH}",`,
        ")",
        "",
        "resp = client.chat.completions.create(",
        `    model="${model}",`,
        `    messages=[{"role": "user", "content": "${PROMPT}"}],`,
        ")",
        "print(resp.choices[0].message.content)",
      ].join("\n");
    case "curl":
      return [
        ...envHeader(baseUrl, "#"),
        `curl "\${${GATEWAY_URL_VAR}}/v1/chat/completions" \\`,
        `  -H "Authorization: Bearer \${${GATEWAY_TOKEN_VAR}}" \\`,
        '  -H "Content-Type: application/json" \\',
        "  -d '{",
        `    "model": "${model}",`,
        `    "messages": [{"role": "user", "content": "${PROMPT}"}]`,
        "  }'",
      ].join("\n");
  }
}

export type GatewayWorkflow = "chat" | "images" | "search" | "embeddings";

export const GATEWAY_WORKFLOWS: {
  value: GatewayWorkflow;
  title: string;
  description: string;
  languages: GatewayLanguage[];
}[] = [
  {
    value: "chat",
    title: "Send a simple chat message",
    description: "Send a simple message to an agent and get a response back.",
    languages: ["aisdk", "mastra", "ts", "python", "curl"],
  },
  {
    value: "images",
    title: "Generate images",
    description: "Create images from a text prompt.",
    languages: ["aisdk", "mastra", "ts", "python"],
  },
  {
    value: "search",
    title: "Search the web",
    description: "Ground answers in live web results.",
    languages: ["aisdk", "mastra", "ts", "python", "curl"],
  },
  {
    value: "embeddings",
    title: "Generate embeddings",
    description: "Turn text into vectors for semantic search and retrieval.",
    languages: ["ts", "python", "curl"],
  },
];

const RESPONSES_PATH = "/openai/v1";
const lines = (...l: string[]) => l.join("\n");

const WORKFLOW_SNIPPETS: Record<
  Exclude<GatewayWorkflow, "chat">,
  Partial<Record<GatewayLanguage, (model: string) => string>>
> = {
  images: {
    aisdk: (m) =>
      lines(
        'import { streamText } from "ai";',
        'import { neon } from "@neondatabase/ai-sdk-provider";',
        "",
        "const result = streamText({",
        `  model: neon("${m}"),`,
        '  prompt: "A red apple on a wooden table.",',
        "  tools: {",
        '    image_generation: neon.tools.imageGeneration({ outputFormat: "jpeg" }),',
        "  },",
        "});",
        "",
        "for await (const _ of result.textStream) {}",
        "",
        'const images = (await result.toolResults).filter((r) => r.toolName === "image_generation");',
        "console.log(images.length);"
      ),
    mastra: (m) =>
      lines(
        'import { Agent } from "@mastra/core/agent";',
        'import { neon } from "@neondatabase/ai-sdk-provider";',
        "",
        "const agent = new Agent({",
        '  id: "neon-demo",',
        '  name: "neon-demo",',
        '  instructions: "Generate the image the user asks for.",',
        `  model: "neon/${m}",`,
        '  tools: { image_generation: neon.tools.imageGeneration({ outputFormat: "jpeg" }) },',
        "});",
        "",
        'const { toolResults } = await agent.generate("A red apple on a wooden table.");',
        'const images = toolResults.filter((r) => r.payload.toolName === "image_generation");',
        "console.log(images.map((r) => r.payload.result.result.length));"
      ),
    ts: (m) =>
      lines(
        'import OpenAI from "openai";',
        "",
        "const client = new OpenAI({",
        "  apiKey: process.env.NEON_AI_GATEWAY_TOKEN,",
        `  baseURL: \`\${process.env.NEON_AI_GATEWAY_BASE_URL}${RESPONSES_PATH}\`,`,
        "});",
        "",
        "const stream = client.responses.stream({",
        `  model: "${m}",`,
        '  input: "A red apple on a wooden table.",',
        '  tools: [{ type: "image_generation" }],',
        "});",
        "",
        "const response = await stream.finalResponse();",
        "const sizes = response.output.flatMap((item) => {",
        '  if (item.type !== "image_generation_call") return [];',
        '  if (!("result" in item) || typeof item.result !== "string") return [];',
        "  return [item.result.length];",
        "});",
        "console.log(sizes);"
      ),
    python: (m) =>
      lines(
        "import os",
        "from openai import OpenAI",
        "",
        "client = OpenAI(",
        '    api_key=os.environ["NEON_AI_GATEWAY_TOKEN"],',
        `    base_url=f"{os.environ['NEON_AI_GATEWAY_BASE_URL']}${RESPONSES_PATH}",`,
        ")",
        "",
        "with client.responses.stream(",
        `    model="${m}",`,
        '    input="A red apple on a wooden table.",',
        '    tools=[{"type": "image_generation"}],',
        ") as stream:",
        "    for _ in stream:",
        "        pass",
        "    response = stream.get_final_response()",
        "",
        "sizes = [",
        "    len(item.result)",
        "    for item in response.output",
        '    if item.type == "image_generation_call" and getattr(item, "result", None)',
        "]",
        "print(sizes)"
      ),
  },
  search: {
    aisdk: (m) =>
      lines(
        'import { generateText } from "ai";',
        'import { neon } from "@neondatabase/ai-sdk-provider";',
        "",
        "const { text, sources } = await generateText({",
        `  model: neon("${m}"),`,
        '  prompt: "What is the latest stable Postgres release?",',
        "  tools: { web_search: neon.tools.webSearch({}) },",
        "});",
        "",
        "console.log(text);",
        'console.log(sources.filter((source) => source.sourceType === "url").map((source) => source.url));'
      ),
    mastra: (m) =>
      lines(
        'import { Agent } from "@mastra/core/agent";',
        'import { neon } from "@neondatabase/ai-sdk-provider";',
        "",
        "const agent = new Agent({",
        '  id: "neon-demo",',
        '  name: "neon-demo",',
        '  instructions: "Use web search when you need current information.",',
        `  model: "neon/${m}",`,
        "  tools: { web_search: neon.tools.webSearch({}) },",
        "});",
        "",
        'const { text } = await agent.generate("What is the latest stable Postgres release?");',
        "console.log(text);"
      ),
    ts: (m) =>
      lines(
        'import OpenAI from "openai";',
        "",
        "const client = new OpenAI({",
        "  apiKey: process.env.NEON_AI_GATEWAY_TOKEN,",
        `  baseURL: \`\${process.env.NEON_AI_GATEWAY_BASE_URL}${RESPONSES_PATH}\`,`,
        "});",
        "",
        "const response = await client.responses.create({",
        `  model: "${m}",`,
        '  input: "What is the latest stable Postgres release?",',
        '  tools: [{ type: "web_search" }],',
        "});",
        "console.log(response.output_text);"
      ),
    python: (m) =>
      lines(
        "import os",
        "from openai import OpenAI",
        "",
        "client = OpenAI(",
        '    api_key=os.environ["NEON_AI_GATEWAY_TOKEN"],',
        `    base_url=f"{os.environ['NEON_AI_GATEWAY_BASE_URL']}${RESPONSES_PATH}",`,
        ")",
        "",
        "response = client.responses.create(",
        `    model="${m}",`,
        '    input="What is the latest stable Postgres release?",',
        '    tools=[{"type": "web_search"}],',
        ")",
        "print(response.output_text)"
      ),
    curl: (m) =>
      lines(
        `curl "\${NEON_AI_GATEWAY_BASE_URL}/openai/v1/responses" \\`,
        '  -H "Authorization: Bearer ${NEON_AI_GATEWAY_TOKEN}" \\',
        '  -H "Content-Type: application/json" \\',
        "  -d '{",
        `    "model": "${m}",`,
        '    "input": "What is the latest stable Postgres release?",',
        '    "tools": [{"type": "web_search"}]',
        "  }'"
      ),
  },
  embeddings: {
    ts: (m) =>
      lines(
        'import OpenAI from "openai";',
        "",
        "const client = new OpenAI({",
        "  apiKey: process.env.NEON_AI_GATEWAY_TOKEN,",
        `  baseURL: \`\${process.env.NEON_AI_GATEWAY_BASE_URL}${OPENAI_PATH}\`,`,
        "});",
        "",
        "const resp = await client.embeddings.create({",
        `  model: "${m}",`,
        '  input: ["Explain Serverless Postgres."],',
        '  encoding_format: "float",',
        "});",
        "console.log(resp.data[0].embedding.length, resp.usage);"
      ),
    python: (m) =>
      lines(
        "import os",
        "from openai import OpenAI",
        "",
        "client = OpenAI(",
        '    api_key=os.environ["NEON_AI_GATEWAY_TOKEN"],',
        `    base_url=f"{os.environ['NEON_AI_GATEWAY_BASE_URL']}${OPENAI_PATH}",`,
        ")",
        "",
        "resp = client.embeddings.create(",
        `    model="${m}",`,
        '    input=["Explain Serverless Postgres."],',
        '    encoding_format="float",',
        ")",
        "print(len(resp.data[0].embedding), resp.usage)"
      ),
    curl: (m) =>
      lines(
        `curl "\${NEON_AI_GATEWAY_BASE_URL}/v1/embeddings" \\`,
        '  -H "Authorization: Bearer ${NEON_AI_GATEWAY_TOKEN}" \\',
        '  -H "Content-Type: application/json" \\',
        "  -d '{",
        `    "model": "${m}",`,
        '    "input": ["Explain Serverless Postgres."],',
        '    "encoding_format": "float"',
        "  }'"
      ),
  },
};

export function workflowSnippet(
  workflow: GatewayWorkflow,
  language: GatewayLanguage,
  baseUrl: string,
  model: string
): string {
  if (workflow === "chat") return gatewaySnippet(language, baseUrl, model);
  const build = WORKFLOW_SNIPPETS[workflow][language];
  if (!build) throw new Error(`No ${language} example for ${workflow}`);
  const comment = language === "python" || language === "curl" ? "#" : "//";
  return [...envHeader(baseUrl, comment), build(model)].join("\n");
}
