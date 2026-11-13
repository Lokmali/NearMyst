# NearMyst UI polish — design notes

All implementations are **original**. Public pattern libraries were used only as inspiration (layout rhythm, micro-interaction *kinds*), not as copied assets or code.

## Inspiration browsed

| Source | Patterns adapted (conceptually) |
|--------|----------------------------------|
| [60fps.design](https://60fps.design) | Reward / Success / Reveal / Counter / Confetti / Stagger / Spring-feel / Progress micro-interactions for pack open |
| [bentogrids.com](https://bentogrids.com) | Asymmetric “how it works” feature tiles (1/2/3-col responsive) |
| [componentry.fun](https://componentry.fun) | Calm aurora / gradient hero feel — **in-house CSS only** (no registry install; avoid WebGL/three.js) |
| Motion (`motion/react`) | Layout + AnimatePresence, springs via duration/ease presets |
| unsection / cta.gallery | Hero + FAQ + closing CTA structure (not browsed live this session for every page; patterns applied from known section taxonomy) |

## Brand constraints

- Surfaces: `#0A0A12` base, raised `#0F0F1A`
- Accent: violet `#7C6CFF` (+ blue `#5B8CFF` in gradients)
- Type: Space Grotesk (display) + Inter (body) — existing Next font setup
- Motif: Capsule
- Feel: calm Linear/Vercel quality — premium, not noisy

## Motion presets (`src/lib/motion.ts`)

- Durations **0.2–0.4s** (reveal up to ~0.55s for rare tiers)
- Animate **transform + opacity only**
- Shared `fadeUp`, `fadeIn`, `scaleIn`, `hoverLift`, `stagger`
- Respect **Reduced Motion** toggle + `prefers-reduced-motion`
- Pause decorative loops when tab hidden; static/light on mobile & low-power
- Lazy-load confetti and heavy decorative chunks

## Accessibility

- WCAG AA contrast on text/controls
- Visible focus rings; modal focus trap + Escape
- Live regions for tx / reveal results
- Rarity never by color alone (label + icon)
- Tap targets ≥ 44px where interactive
- Skip control on reveal animation

## Honesty

- No fake stats, testimonials, activity feeds, or invented partners
- Randomness disclaimer stays: testnet seed ≠ VRF
- Real on-chain numbers only when from existing views

## Out of scope

- Contract / wallet / odds math / tx payload changes
- Heavy new dependencies (three.js, WebGL registries)
