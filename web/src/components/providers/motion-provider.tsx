"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MotionMode = "full" | "reduced";

type MotionContextValue = {
  mode: MotionMode;
  reduced: boolean;
};

const MotionContext = createContext<MotionContextValue | null>(null);

/** Legacy key from the removed Motion Full/Reduced UI toggle. */
const LEGACY_STORAGE_KEY = "nearmyst-motion";

/**
 * Motion is always on unless the OS asks for reduced motion.
 * No in-app toggle — animations stay enabled for everyone else.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<MotionMode>("full");

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMode(mq.matches ? "reduced" : "full");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("motion-reduced", mode === "reduced");
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      reduced: mode === "reduced",
    }),
    [mode],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotionPreference() {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    return {
      mode: "full" as MotionMode,
      reduced: false,
    };
  }
  return ctx;
}
