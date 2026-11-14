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
        "rounded-[var(--radius-md)] border border-border bg-raised px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-5 flex justify-center opacity-90">
        {icon ?? <Capsule size="md" />}
      </div>
      <h2 className="text-h3 text-primary">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md prose-narrow text-small text-secondary">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-6 flex justify-center">{action}</div>
      ) : null}
    </div>
  );
}
