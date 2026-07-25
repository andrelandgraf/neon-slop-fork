import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mb-6 flex items-start justify-between gap-4", className)}
    >
      <div className="min-w-0">
        <h1 className="text-balance font-semibold text-2xl text-foreground tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-pretty text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
