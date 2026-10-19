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
