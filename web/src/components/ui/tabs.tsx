"use client";

import { useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/components/providers/motion-provider";

export function Tabs({
  tabs,
  value,
  onChange,
  layoutId = "tab-underline",
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  layoutId?: string;
}) {
  const { reduced } = useMotionPreference();

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = tabs.findIndex((t) => t.id === value);
      if (idx < 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(tabs[(idx + 1) % tabs.length].id);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange(tabs[(idx - 1 + tabs.length) % tabs.length].id);
      }
    },
    [onChange, tabs, value],
  );

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-1 border-b border-border"
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative min-h-11 px-3 py-2.5 text-small font-medium transition duration-fast",
              active ? "text-primary" : "text-muted hover:text-secondary",
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="ml-1.5 tabular text-caption text-muted">{t.count}</span>
            )}
            {active && (
              <motion.span
                layoutId={reduced ? undefined : layoutId}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                style={reduced ? { transitionDuration: "0ms" } : undefined}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
