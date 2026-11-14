"use client";

import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { useMotionPreference } from "@/components/providers/motion-provider";

/**
 * Site-wide FlickeringGrid — fixed viewport layer behind all pages.
 * Tuned sparse + low FPS so clicks/nav stay snappy.
 */
export function SiteBackdrop() {
  const { reduced } = useMotionPreference();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(224,184,74,0.1), transparent 50%), linear-gradient(180deg, #14110d 0%, #0c0a08 55%, #0c0a08 100%)",
        }}
      />

      <div className="absolute inset-0 opacity-90">
        <FlickeringGrid
          className="h-full w-full"
          squareSize={5}
          gridGap={10}
          flickerChance={reduced ? 0 : 0.12}
          color="#E0B84A"
          maxOpacity={0.28}
          fps={10}
        />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(12,10,8,0.55) 78%, rgba(12,10,8,0.92) 100%)",
        }}
      />
    </div>
  );
}
