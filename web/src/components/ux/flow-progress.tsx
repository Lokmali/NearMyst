"use client";

import { motion } from "motion/react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { duration, ease } from "@/lib/motion";
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
  const { reduced } = useMotionPreference();

  return (
    <ol
      className={cn("flex items-center gap-1", className)}
      aria-label="Pack progress"
    >
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={step.id} className="relative flex flex-1 items-center gap-1">
            <div
              className={cn(
                "relative z-10 flex h-7 w-full items-center justify-center rounded-md border text-caption font-medium",
                done && "border-success/40 bg-success-tint text-success",
                active && "border-brand/40 bg-brand-tint text-primary",
                !done && !active && "border-border bg-subtle text-muted",
              )}
            >
              {active && !reduced ? (
                <motion.span
                  layoutId="pack-flow-active"
                  className="absolute inset-0 -z-10 rounded-md bg-brand/10"
                  transition={{ duration: duration.base, ease: ease.out }}
                />
              ) : null}
              {step.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
