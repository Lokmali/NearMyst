import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ErrorPanel({
  message,
  action,
  className,
  title = "Something went wrong",
}: {
  message: string;
  action?: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-md)] border border-danger/25 bg-danger-tint p-4 text-small text-primary",
        className,
      )}
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" strokeWidth={1.75} />
        <div>
          <p className="font-medium text-primary">{title}</p>
          <p className="mt-1 text-secondary">{message}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
