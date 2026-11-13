"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { duration, ease } from "@/lib/motion";

/**
 * Calm page enter: fade + 8px translate.
 * Capsule-iris overlay is handled by RouteIris on link clicks when motion is full.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { reduced } = useMotionPreference();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: duration.base, ease: ease.out }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
