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
    <div
      role="note"
      className={cn(
        // Multi-line note: soft card radius (not pill) so mobile wrap stays readable
        "flex w-full max-w-full items-start gap-2.5 rounded-[var(--radius-md)] border border-warning/25 bg-warning-tint px-3.5 py-3 text-[0.9375rem] leading-6 text-secondary sm:gap-3 sm:px-4 sm:py-3.5 sm:text-small sm:leading-5",
        className,
      )}
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-warning"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="min-w-0 flex-1 text-pretty break-words">{children}</div>
    </div>
  );
}
