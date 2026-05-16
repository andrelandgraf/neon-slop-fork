import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Default loading shell for `/projects/[id]/*`. Mirrors the chrome
 * the project layout will render so the user sees the topbar + sidebar
 * shape immediately — much better than a blank screen while the
 * parallel `getProject` / `listProjectBranches` / `listEndpoints`
 * round-trips land.
 *
 * Page-specific routes override this with their own `loading.tsx` when
 * the content shape differs enough that this generic skeleton looks
 * wrong (e.g. dashboard, monitoring).
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-14 border-b" />
      <div className="flex flex-1">
        <aside className="w-[240px] shrink-0 border-r h-[calc(100vh-3.5rem)] sticky top-14 p-3 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-full" />
          <div className="space-y-1.5 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-24 mt-4" />
          <div className="space-y-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </aside>
        <main className="flex-1 min-w-0 px-8 py-6 space-y-5">
          <Skeleton className="h-7 w-48" />
          <Card className="p-5">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
          <Card className="p-5">
            <Skeleton className="h-32 w-full" />
          </Card>
        </main>
      </div>
    </div>
  );
}
