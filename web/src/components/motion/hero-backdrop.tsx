"use client";

import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { useMotionPreference } from "@/components/providers/motion-provider";

/**
 * Hero background — Magic UI FlickeringGrid (2D canvas, no WebGL).
 * Brass theme color on warm dark stage.
 */
export function HeroBackdrop() {
  const { reduced } = useMotionPreference();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Soft base wash so empty cells still feel lit */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(224,184,74,0.14), transparent 55%), linear-gradient(180deg, #16120e 0%, #0c0a08 100%)",
        }}
      />

      <div className="absolute inset-0">
        <FlickeringGrid
          className="h-full w-full"
          squareSize={4}
          gridGap={6}
          flickerChance={reduced ? 0 : 0.28}
          color="#E0B84A"
          maxOpacity={0.45}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-b from-transparent to-[var(--bg-base)]" />
    </div>
  );
}
