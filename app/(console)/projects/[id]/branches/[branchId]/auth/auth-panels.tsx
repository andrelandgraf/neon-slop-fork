"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Info, Loader2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enableAuthAction } from "@/app/actions";

const DOCS_URL = "https://neon.com/docs/auth/overview";
const QUICKSTART_URL = "https://neon.com/docs/auth/quick-start/nextjs";

export function SignupBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="mb-5 flex items-center gap-2 rounded-[3px] border border-link/30 bg-link/5 px-3 py-2.5 text-sm">
      <Info className="size-4 shrink-0 text-link" />
      <span className="flex-1">
        Anyone on the web can sign up for your app. Support for restricted
        signups is coming soon.
      </span>
      <button type="button" className="font-semibold text-link" onClick={() => setDismissed(true)}>
        Acknowledge and dismiss
      </button>
    </div>
  );
}

export function AuthLinks({ configureHref }: { configureHref: string }) {
  return (
    <>
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={DOCS_URL} target="_blank" rel="noreferrer" />}
      >
        <ExternalLink className="size-3.5" />
        Read the docs
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={QUICKSTART_URL} target="_blank" rel="noreferrer" />}
      >
        Open quickstart
      </Button>
      <Button nativeButton={false} render={<Link href={configureHref} />}>
        Configure Auth
      </Button>
    </>
  );
}

export function EnableAuth({ projectId, branchId }: { projectId: string; branchId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div className="grid w-full max-w-[520px] grid-cols-2 gap-4 rounded-[6px] bg-muted p-5 text-left">
        <div className="space-y-2 rounded-[6px] border border-panel-border bg-panel p-3">
          <div className="font-semibold text-xs">Sign in</div>
          <div className="h-6 rounded border border-panel-border" />
          <div className="h-6 rounded border border-panel-border" />
          <div className="h-6 rounded bg-foreground" />
        </div>
        <div className="rounded-[6px] border border-panel-border bg-panel p-3 font-mono text-[11px]">
          <div className="mb-1 text-muted-foreground">neon_auth.user</div>
          {["ada@example.com", "linus@example.com", "grace@example.com"].map((email) => (
            <div key={email} className="border-panel-border border-t py-1">
              {email}
            </div>
          ))}
        </div>
      </div>
      <h1 className="mt-6 font-semibold text-base">Your app&apos;s users, in your Neon database</h1>
      <p className="mt-2 max-w-md text-muted-foreground text-sm">
        Embed ready-made auth UI components into your app in minutes. User data
        lives directly in your Neon database, no syncing required.
      </p>
      <Button
        className="mt-5"
        disabled={pending}
        onClick={() => {
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("branchId", branchId);
          startTransition(async () => {
            const result = await enableAuthAction(fd);
            if (result.ok) toast.success("Neon Auth is enabled");
            else toast.error(result.error);
          });
        }}
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Enable Neon Auth
      </Button>
    </div>
  );
}

export function NoUsers({
  configureHref,
  createUser,
}: {
  configureHref: string;
  createUser: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[3px] border border-panel-border px-6 py-10 text-center">
      <UsersRound className="size-4 text-muted-foreground" />
      <div className="mt-1 text-base">Ready for your first users</div>
      <p className="text-muted-foreground text-sm">
        Integrate Neon Auth into your application to get started
      </p>
      <div className="mt-3 flex gap-2">
        {createUser}
        <AuthLinks configureHref={configureHref} />
      </div>
    </div>
  );
}
