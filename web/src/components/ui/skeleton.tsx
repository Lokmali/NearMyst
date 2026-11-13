import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-md bg-subtle ring-1 ring-border",
        className,
      )}
      aria-hidden
    />
  );
}

export function MachineCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-raised shadow-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
        <Skeleton className="h-1.5 w-full" />
      </div>
    </div>
  );
}
