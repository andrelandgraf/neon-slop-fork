"use client";
import { useState, useTransition } from "react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enableDataApiAction } from "@/app/actions";

/** The Console's Data API empty state with its two opt-in checkboxes. */
export function EnableDataApiCard({
  projectId,
  branchId,
  databaseName,
}: {
  projectId: string;
  branchId: string;
  databaseName: string;
}) {
  const [useNeonAuth, setUseNeonAuth] = useState(true);
  const [grantPublic, setGrantPublic] = useState(true);
  const [pending, startTransition] = useTransition();

  function enable() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("branchId", branchId);
    fd.set("databaseName", databaseName);
    fd.set("useNeonAuth", useNeonAuth ? "on" : "off");
    fd.set("grantPublicSchemaAccess", grantPublic ? "on" : "off");
    startTransition(async () => {
      const result = await enableDataApiAction(fd);
      if (result.ok) toast.success("Data API has been enabled");
      else toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[430px] flex-col items-center justify-center py-10">
      <HttpsIllustration />
      <h1 className="mt-6 text-xl">Data API</h1>
      <p className="mt-2 text-center text-sm">
        Instantly generate a REST API on top of your database. Query tables,
        views, and functions via standard HTTP requests, with zero backend code
        required.{" "}
        <a
          className="text-link"
          href="https://neon.com/docs/data-api/get-started"
          target="_blank"
          rel="noreferrer"
        >
          Learn more
        </a>
      </p>
      <div className="mt-5 w-full space-y-3">
        <Check
          checked={useNeonAuth}
          onChange={setUseNeonAuth}
          label="Use Neon Auth"
          description="Manages sign-up, login and account access for the Data API. It issues the JWTs required for API requests."
        />
        {useNeonAuth && (
          <div className="flex gap-2 rounded-[3px] border border-link/30 bg-link/5 px-3 py-2.5 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-link" />
            Anyone on the web can sign up for your app. Support for restricted
            signups is coming soon.
          </div>
        )}
        <Check
          checked={grantPublic}
          onChange={setGrantPublic}
          label="Grant public schema access"
          description="Applies grants so authenticated users can read and write to tables in the public schema. Once enabled, add Row-Level Security (RLS) policies to define which rows they can access."
        />
      </div>
      <Button className="mt-5" onClick={enable} disabled={pending}>
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Enable Data API
      </Button>
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-foreground"
      />
      <span>
        <span className="block font-semibold text-sm">{label}</span>
        <span className="block text-muted-foreground text-xs">{description}</span>
      </span>
    </label>
  );
}

function HttpsIllustration() {
  return (
    <div className="grid w-full max-w-[430px] grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[6px] bg-muted p-4">
      <div>
        <div className="mb-1.5 text-[11px] text-muted-foreground">Browser</div>
        <div className="h-28 rounded-[6px] border border-panel-border bg-panel p-2">
          <div className="h-3.5 rounded-full bg-muted" />
        </div>
      </div>
      <div className="text-center text-[10px] text-muted-foreground">
        HTTPS
        <div className="mt-0.5 h-px w-12 bg-muted-foreground/50" />
      </div>
      <div>
        <div className="mb-1.5 text-[11px] text-muted-foreground">Neon database</div>
        <div className="space-y-2 rounded-[6px] border border-panel-border bg-panel p-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex gap-2 rounded px-1 py-1 ${i === 1 ? "border border-dashed border-link" : ""}`}
            >
              <div className="h-2.5 w-8 rounded bg-muted" />
              <div className="h-2.5 flex-1 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
