import type { ReactNode } from "react";
import { Capsule } from "@/components/brand/capsule";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-raised px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-4 flex justify-center opacity-80">
        {icon ?? <Capsule size="md" />}
      </div>
      <p className="text-h3 text-primary">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md prose-narrow text-small text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
