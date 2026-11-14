"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
  /** Target animation FPS — lower keeps the UI responsive. Default 12. */
  fps?: number;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(0, 0, 0)",
  width,
  height,
  className,
  maxOpacity = 0.3,
  fps = 12,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const rgbaPrefix = useMemo(() => {
    if (typeof window === "undefined") return "rgba(0, 0, 0,";
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d");
    if (!ctx) return "rgba(224, 184, 74,";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
    return `rgba(${r}, ${g}, ${b},`;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let squares = new Float32Array(0);
    let dpr = 1;
    let inView = true;
    let visible = document.visibilityState !== "hidden";
    let rafId: number | null = null;
    let lastFrame = 0;
    const frameInterval = 1000 / Math.max(1, fps);

    const cell = squareSize + gridGap;

    const setup = () => {
      const w = width || container.clientWidth || window.innerWidth;
      const h = height || container.clientHeight || window.innerHeight;
      // Cap DPR — full retina redraw is the main-thread killer
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      setCanvasSize({ width: w, height: h });

      cols = Math.ceil(w / cell);
      rows = Math.ceil(h / cell);
      squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }
      paint();
    };

    const paint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const step = cell * dpr;
      const size = squareSize * dpr;
      const prefix = rgbaPrefix;

      for (let i = 0; i < cols; i++) {
        const x = i * step;
        for (let j = 0; j < rows; j++) {
          const opacity = squares[i * rows + j];
          if (opacity < 0.02) continue;
          ctx.fillStyle = `${prefix}${opacity})`;
          ctx.fillRect(x, j * step, size, size);
        }
      }
    };

    const tick = (time: number) => {
      rafId = requestAnimationFrame(tick);
      if (!inView || !visible || flickerChance <= 0) return;
      if (time - lastFrame < frameInterval) return;

      const delta = Math.min(0.1, (time - lastFrame) / 1000);
      lastFrame = time;

      const chance = flickerChance * delta;
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < chance) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
      paint();
    };

    setup();
    lastFrame = performance.now();
    rafId = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => setup());
    ro.observe(container);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVis = () => {
      visible = document.visibilityState !== "hidden";
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [
    squareSize,
    gridGap,
    flickerChance,
    maxOpacity,
    width,
    height,
    rgbaPrefix,
    fps,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          width: canvasSize.width || undefined,
          height: canvasSize.height || undefined,
        }}
      />
    </div>
  );
};
