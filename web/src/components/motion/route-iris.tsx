"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { duration } from "@/lib/motion";

/**
 * Subtle route flash — calm fade, no full-screen iris expansion.
 */
export function RouteIris() {
  const pathname = usePathname();
  const { reduced } = useMotionPreference();
  const [flash, setFlash] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || reduced) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 220);
    return () => window.clearTimeout(t);
  }, [pathname, mounted, reduced]);

  if (reduced) return null;

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[90] bg-brand/[0.04]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.fast }}
        />
      )}
    </AnimatePresence>
  );
}
