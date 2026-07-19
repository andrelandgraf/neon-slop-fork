import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Data Masking is a Console/Scale-plan workflow. The public Neon API and
 * @neon/sdk do not expose the masking-rule or anonymized-branch operations, so
 * the clone can faithfully expose the discovery surface but must not pretend it
 * can create an anonymized branch. The action links to the supported Console
 * documentation instead of creating a branch with unmasked data.
 */
export default function DataMaskingPage() {
  return (
    <div className="max-w-3xl px-8 py-10">
      <Card className="flex flex-col items-center px-8 py-12 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </span>
        <div className="mt-4 flex items-center gap-2">
          <h1 className="text-xl font-semibold">
            Mask and anonymize sensitive data
          </h1>
          <Badge variant="muted">Beta</Badge>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Mask sensitive information according to rules you define, giving you
          realistic, production-shaped data without exposing PII. When you’re
          done, simply delete the branch and move on.
        </p>
        <div className="mt-6 flex items-center gap-2">
          <Button disabled title="The public Neon API does not expose Data Masking operations.">
            Create anonymized branch
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://neon.com/docs/guides/data-masking"
              target="_blank"
              rel="noreferrer"
            >
              Learn more <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
        <p className="mt-5 max-w-lg text-xs text-muted-foreground">
          This operation is available in the Neon Console, but the public REST
          API does not yet expose masking rules or anonymized-branch creation.
        </p>
      </Card>
    </div>
  );
}
