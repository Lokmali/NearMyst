"use client";

import dynamic from "next/dynamic";

const HeroAurora = dynamic(
  () => import("@/components/motion/hero-aurora").then((m) => m.HeroAurora),
  { ssr: false, loading: () => null },
);

/** Client boundary so the aurora chunk can load with ssr:false. */
export function HeroBackdrop() {
  return <HeroAurora />;
}
