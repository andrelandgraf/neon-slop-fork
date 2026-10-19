import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown by Next.js while `app/projects/page.tsx` runs its tenant +
 * listProjects + per-project branch-count fan-out. The skeleton keeps
 * the topbar / sidebar slots from collapsing so the layout looks
 * stable while the data lands.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-14 border-b" />
      <div className="flex flex-1">
        <aside className="w-[240px] shrink-0 border-r h-[calc(100vh-3.5rem)] sticky top-14 p-3 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
        </aside>
        <main className="flex-1 min-w-0 px-8 py-6 max-w-[1200px]">
          <div className="flex items-center justify-between mb-5">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Card className="mb-6">
            <div className="grid grid-cols-4 divide-x">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="p-5 space-y-2" key={i}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-20" />
                </div>
              ))}
            </div>
            <Skeleton className="h-9 mx-5 my-3" />
          </Card>
          <Skeleton className="h-6 w-32 mb-3" />
          <Skeleton className="h-9 w-full mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
