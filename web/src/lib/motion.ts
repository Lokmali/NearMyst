/** Shared motion tokens — keep durations/easings consistent. */

export const duration = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  reveal: 0.7,
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
};

export const stagger = {
  tight: 0.04,
  base: 0.06,
  loose: 0.08,
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.slow, ease: ease.out },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: duration.base, ease: ease.out },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: duration.base, ease: ease.out },
};
