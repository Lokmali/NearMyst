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
      className="flex flex-wrap gap-x-1 gap-y-1 border-b border-border"
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
              "relative inline-flex min-h-11 items-center gap-2 px-3.5 py-2.5 text-small font-semibold tracking-tight transition duration-fast",
              active ? "text-primary" : "text-secondary hover:text-primary",
            )}
          >
            <span>{t.label}</span>
            {typeof t.count === "number" ? (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular leading-none",
                  active
                    ? "bg-brand/20 text-brand"
                    : "bg-subtle text-muted",
                )}
              >
                {t.count}
              </span>
            ) : null}
            {active ? (
              <motion.span
                layoutId={reduced ? undefined : layoutId}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                style={reduced ? { transitionDuration: "0ms" } : undefined}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
