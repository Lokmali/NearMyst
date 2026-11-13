import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-raised px-4 py-3", className)}>
      <div className="text-caption text-muted">{label}</div>
      <div className="mt-1 text-h3 tabular text-primary">{value}</div>
    </div>
  );
}
