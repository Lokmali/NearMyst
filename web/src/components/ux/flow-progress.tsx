import { cn } from "@/lib/utils";

const STEPS = [
  { id: "buy", label: "Buy" },
  { id: "wait", label: "Wait" },
  { id: "open", label: "Open" },
  { id: "reward", label: "Reward" },
] as const;

export type PackFlowStep = (typeof STEPS)[number]["id"];

export function PackFlowProgress({
  current,
  className,
}: {
  current: PackFlowStep;
  className?: string;
}) {
  const idx = STEPS.findIndex((s) => s.id === current);

  return (
    <ol
      className={cn("flex items-center gap-1", className)}
      aria-label="Pack progress"
    >
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                "flex h-7 w-full items-center justify-center rounded-md border text-caption font-medium",
                done && "border-success/40 bg-success-tint text-success",
                active && "border-brand/40 bg-brand-tint text-primary",
                !done && !active && "border-border bg-subtle text-muted",
              )}
            >
              {step.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
