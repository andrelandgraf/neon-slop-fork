"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodePanelTab {
  label: string;
  /** What gets copied. */
  code: string;
  /** What's shown, when it differs from `code` (masked secrets). */
  display?: string;
}

/**
 * The Console's code block: file tabs on top, a gray mono body, and a
 * footer row of text actions starting with "Copy snippet".
 */
export function CodePanel({
  tabs,
  footer,
  copyLabel = "Copy snippet",
  className,
  bodyClassName,
}: {
  tabs: CodePanelTab[];
  footer?: React.ReactNode;
  copyLabel?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const [active, setActive] = useState(0);
  const tab = tabs[Math.min(active, tabs.length - 1)];

  return (
    <div className={cn("overflow-hidden rounded-[3px] border border-panel-border", className)}>
      {tabs.length > 1 || tabs[0]?.label ? (
        <div className="flex gap-4 border-panel-border border-b bg-panel px-3">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "-mb-px border-b-2 py-2 font-semibold text-xs transition-colors",
                i === active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
      <pre
        className={cn(
          "max-h-[360px] overflow-auto whitespace-pre-wrap break-all bg-muted px-3 py-2.5 font-mono text-[12px] leading-[1.55] text-foreground",
          bodyClassName
        )}
      >
        {tab?.display ?? tab?.code}
      </pre>
      <div className="flex flex-wrap items-center gap-4 border-panel-border border-t bg-muted px-3 py-1.5">
        {tab && <CopyAction text={tab.code} label={copyLabel} />}
        {footer}
      </div>
    </div>
  );
}

export function CopyAction({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <FooterAction
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </FooterAction>
  );
}

export function FooterAction({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground disabled:opacity-50"
    >
      {children}
    </button>
  );
}
