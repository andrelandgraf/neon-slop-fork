import Link from "next/link";
import { CheckCircle2, Bot, ChevronsUpDown } from "lucide-react";
import { Mock } from "@/components/ui/mock";
import { ORG_NAME } from "@/lib/neon";

export function TopBar({ context }: { context?: string }) {
  return (
    <header className="h-14 border-b bg-background sticky top-0 z-30">
      <div className="flex h-full items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2" title="Home">
          <div className="h-8 w-8 rounded bg-neon-dark grid place-items-center">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-neon-green" fill="currentColor">
              <path d="M3 3h7l11 18h-7L3 3z" />
            </svg>
          </div>
        </Link>
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm rounded-md px-1.5 py-0.5 -mx-0.5 hover:bg-muted"
          title="Back to projects"
        >
          <span className="font-semibold">{ORG_NAME}</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted border font-medium">
            Launch
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        {context && (
          <>
            <div className="text-muted-foreground">/</div>
            <div className="text-sm font-mono text-foreground/80">{context}</div>
          </>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Mock inline>
            <button className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 hover:bg-muted text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              All OK
            </button>
          </Mock>
          <Mock inline>
            <button className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 hover:bg-muted text-xs">
              <Bot className="h-3 w-3" />
              Ask AI
            </button>
          </Mock>
          <Mock inline label="Account menu is mocked">
            <span className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 block" />
          </Mock>
        </div>
      </div>
    </header>
  );
}
