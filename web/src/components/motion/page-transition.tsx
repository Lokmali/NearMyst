"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { duration, ease } from "@/lib/motion";

/**
 * Fast page enter — no exit wait (mode="wait" made nav feel stuck).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { reduced } = useMotionPreference();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.fast, ease: ease.out }}
    >
      {children}
    </motion.div>
  );
}
