"use client";

import {
  createContext,
  useCallback,
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
  setMode: (mode: MotionMode) => void;
  toggle: () => void;
};

const MotionContext = createContext<MotionContextValue | null>(null);
const STORAGE_KEY = "nearmyst-motion";

function readStored(): MotionMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "full" || v === "reduced") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function writeStored(mode: MotionMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MotionMode>("full");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStored();
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setModeState(stored ?? (prefersReduced ? "reduced" : "full"));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("motion-reduced", mode === "reduced");
  }, [mode, ready]);

  const setMode = useCallback((next: MotionMode) => {
    setModeState(next);
    writeStored(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "full" ? "reduced" : "full");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      reduced: mode === "reduced",
      setMode,
      toggle,
    }),
    [mode, setMode, toggle],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotionPreference() {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    return {
      mode: "full" as MotionMode,
      reduced: false,
      setMode: (() => {}) as (mode: MotionMode) => void,
      toggle: () => {},
    };
  }
  return ctx;
}
