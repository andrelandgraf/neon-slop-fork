"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { path: "general", label: "General" },
  { path: "postgres", label: "Postgres" },
  { path: "networking", label: "Networking" },
  { path: "credentials", label: "Credentials", capability: "credentials" },
  { path: "auth", label: "Better Auth" },
  { path: "functions", label: "Functions", capability: "functions" },
  { path: "hipaa", label: "HIPAA compliance" },
  { path: "permissions", label: "Project permissions" },
] as const;

export function SettingsNav({
  projectId,
  capabilities,
}: {
  projectId: string;
  capabilities: { credentials: boolean; functions: boolean };
}) {
  const pathname = usePathname();
  const branch = useSearchParams().get("branch");
  const query = branch ? `?branch=${branch}` : "";
  return (
    <nav className="-mx-1 flex shrink-0 gap-0.5 overflow-x-auto px-1 md:mx-0 md:block md:w-[180px] md:space-y-0.5 md:px-0">
      {SECTIONS.filter((s) => !("capability" in s) || capabilities[s.capability]).map((s) => {
        const href = `/projects/${projectId}/settings/${s.path}`;
        const active = pathname === href;
        return (
          <Link
            key={s.path}
            href={`${href}${query}`}
            className={cn(
              "block shrink-0 whitespace-nowrap rounded-[3px] px-2.5 py-1.5 text-sm",
              active ? "bg-nav-active font-semibold" : "text-nav-foreground hover:bg-nav-active/60"
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
