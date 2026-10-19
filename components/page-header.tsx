import Link from "next/link";
import { CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The Console page header: H1, then "All projects / <project> ⤷ <branch>"
 * breadcrumb, actions on the right.
 */
export function PageHeader({
  title,
  description,
  actions,
  project,
  branch,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  project?: { id: string; name: string };
  branch?: { name: string; default: boolean };
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 font-semibold text-2xl text-foreground">
          {title}
        </h1>
        {project && (
          <nav className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
            <Link href="/projects" className="text-link hover:underline">
              All projects
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-nav-foreground">{project.name}</span>
            {branch && (
              <>
                <CornerDownRight className="size-3.5 text-muted-foreground" />
                <span>{branch.name}</span>
                {branch.default && <Badge variant="secondary">Default</Badge>}
              </>
            )}
          </nav>
        )}
        {description && (
          <p className="mt-2 max-w-3xl text-pretty text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Standard padding for a page inside the content panel. */
export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}
