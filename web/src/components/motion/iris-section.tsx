"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { cn } from "@/lib/utils";

/**
 * Taste moment: iris-opens — inset panel; disc widens; content fades in once held.
 */
export function IrisSection({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const { reduced } = useMotionPreference();
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setOpen(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setOpen(true);
          io.disconnect();
        }
      },
      { threshold: 0.28 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section
      id={id}
      ref={ref}
      className={cn("relative scroll-mt-24 bg-subtle py-16 md:py-24", className)}
    >
      <div
        className={cn(
          "page-wrap relative rounded-[var(--radius-xl)] border border-border bg-raised/30 p-6 backdrop-blur-sm md:p-10",
          "transition-[clip-path,opacity] duration-1000 ease-out",
          open
            ? "opacity-100 [clip-path:circle(150%_at_50%_50%)]"
            : "opacity-95 [clip-path:circle(0%_at_50%_50%)]",
        )}
      >
        <div
          className={cn(
            "relative transition-opacity duration-500 delay-200",
            open ? "opacity-100" : "opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
