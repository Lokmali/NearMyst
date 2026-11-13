/** Shared motion presets — transform/opacity only; durations 0.2–0.4s. */

export const duration = {
  fast: 0.2,
  base: 0.28,
  slow: 0.4,
  reveal: 0.55,
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  soft: [0.22, 1, 0.36, 1] as const,
} as const;

export const spring = {
  snappy: { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.8 },
  soft: { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.9 },
};

export const stagger = {
  tight: 0.05,
  base: 0.07,
  loose: 0.1,
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: duration.base, ease: ease.out },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.fast, ease: ease.out },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: duration.base, ease: ease.out },
};

export const hoverLift = {
  whileHover: { y: -2, transition: { duration: duration.fast, ease: ease.out } },
  whileTap: { scale: 0.98, transition: { duration: 0.12 } },
};

export const press = {
  whileTap: { scale: 0.98, transition: { duration: 0.12 } },
};
