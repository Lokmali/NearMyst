import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Disclaimer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        "inline-flex w-full items-start gap-2.5 rounded-[var(--radius-btn)] border border-warning/25 bg-warning-tint px-3.5 py-2.5 text-small leading-5 text-secondary",
        className,
      )}
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-warning"
        strokeWidth={1.75}
        aria-hidden
      />
      <span>{children}</span>
    </p>
  );
}
