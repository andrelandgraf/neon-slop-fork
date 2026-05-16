"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodeSnippet {
  id: string;
  label: string;
  filename: string;
  language: string;
  code: string;
}

interface Props {
  snippets: CodeSnippet[];
}

/**
 * Lightweight tabbed code viewer with a copy button. Uses plain <pre>
 * (no syntax highlighter dependency on the page) so the auth tab stays
 * cheap to render on every navigation.
 */
export function CodeSnippetTabs({ snippets }: Props) {
  const [activeId, setActiveId] = useState(snippets[0]?.id);
  const active = snippets.find((s) => s.id === activeId) ?? snippets[0];

  return (
    <div className="rounded-lg border bg-zinc-950 text-zinc-100 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
        <div className="flex">
          {snippets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={cn(
                "px-3 py-2 text-xs font-mono border-r border-white/10 transition-colors",
                s.id === active.id
                  ? "text-white bg-white/[0.04]"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {s.filename}
            </button>
          ))}
        </div>
        <CopyButton text={active.code} />
      </div>
      <pre className="text-[12px] leading-[1.55] overflow-x-auto p-4 font-mono">
        <code>{active.code}</code>
      </pre>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="mr-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}
