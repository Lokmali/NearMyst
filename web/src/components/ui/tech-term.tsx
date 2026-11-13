"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Plain word with optional technical term in a tooltip. */
export function TechTerm({
  children,
  tip,
  className,
}: {
  children: ReactNode;
  tip: string;
  className?: string;
}) {
  return (
    <Tooltip content={tip}>
      <button
        type="button"
        className={cn(
          "cursor-help border-b border-dotted border-border-strong text-inherit",
          className,
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}
