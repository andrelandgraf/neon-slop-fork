"use client";
import { Plug } from "lucide-react";
import type { BranchStorage } from "@/lib/neon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyableCode } from "@/components/copyable-code";
import { CodeSnippetTabs } from "@/components/code-snippet-tabs";

/**
 * "Connect to your branch" for object storage — mirrors the console's Storage
 * tab: the S3 client install command plus an `s3-client.ts` / `.env` snippet
 * wired to this branch's S3 endpoint. Access keys come from a Storage-scoped
 * credential (created on the Credentials page).
 */
export function StorageConnectDialog({
  branchName,
  storage,
  bucketName,
}: {
  branchName: string;
  storage: BranchStorage | null;
  bucketName: string;
}) {
  const endpoint = storage?.s3_endpoint ?? "https://<branch>.storage.<region>.aws.neon.tech";
  const region = storage?.region ?? "us-east-1";

  const clientCode = `import "dotenv/config";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ forcePathStyle: true });
const bucket = "${bucketName}";
const key = "uploads/file.txt";

await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "Hello World!" }));

const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
  expiresIn: 3600,
});
console.log(\`[view] \${url}\`);`;

  const envCode = `AWS_ENDPOINT_URL_S3=${endpoint}
AWS_REGION=${region}
# Create a Storage-scoped credential on the Credentials page:
AWS_ACCESS_KEY_ID=nak_live_...
AWS_SECRET_ACCESS_KEY=nsk_live_...`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plug className="h-3.5 w-3.5" />
          Connect
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect to your branch</DialogTitle>
        </DialogHeader>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Branch</span>
          <span className="inline-flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 font-mono">
            {branchName}
            <Badge variant="muted">Default</Badge>
          </span>
        </div>

        {/* The console shows a tab bar (Postgres / Storage / Data API / Auth);
            this is the Storage tab. */}
        <div className="mt-2 flex items-center gap-4 border-b text-sm">
          <span className="pb-2 -mb-px border-b-2 border-foreground font-medium">
            Storage
          </span>
        </div>

        <div className="space-y-3 mt-1">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">S3 client</div>
            <CopyableCode
              code="npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv"
              inline
            />
          </div>
          <CodeSnippetTabs
            snippets={[
              {
                id: "client",
                label: "s3-client.ts",
                filename: "s3-client.ts",
                language: "typescript",
                code: clientCode,
              },
              {
                id: "env",
                label: ".env",
                filename: ".env",
                language: "bash",
                code: envCode,
              },
            ]}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
