"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A light-surface command / code block with a copy affordance, matching the
 * console's getting-started snippets. `inline` renders a single-line command
 * with a trailing copy icon; the default renders a multi-line block with a
 * "Copy snippet" control in a footer.
 */
export function CopyableCode({
  code,
  inline = false,
  className,
}: {
  code: string;
  inline?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  if (inline) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2",
          className
        )}
      >
        <code className="font-mono text-[12.5px] text-foreground truncate">
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy command"
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border bg-muted/40 overflow-hidden", className)}>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] leading-relaxed">
        <code>{code}</code>
      </pre>
      <div className="flex justify-end border-t bg-background/60 px-2 py-1">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy snippet
            </>
          )}
        </button>
      </div>
    </div>
  );
}
