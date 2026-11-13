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
      className={cn(
        "inline-flex w-full items-start gap-2 rounded-md border border-warning/20 bg-warning-tint px-3 py-2 text-caption leading-5 text-secondary",
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
