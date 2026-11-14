# NearMyst UI polish — design notes

All implementations are **original**. Public pattern libraries and tasteskill 2.5 were used as process/inspiration, not as copied assets.

## Taste deal (2026-11-13 full restyle)

See [taste-deal.md](./taste-deal.md). Locked deal:

| Slot | Choice |
|------|--------|
| kind | software page-type · site-kind **gaming** |
| hero | **product** (Capsule / gacha stage) |
| brand | client violet `#7C6CFF` on `#0A0A12` (`start.mjs brand`, waives never-violet) |
| type | **Urbanist** + DM Mono |
| radius | soft · buttons **block** · mark **arc** |
| nav / footer / close | nav-cards · footer-statement · close-word |
| rhythm | space |
| moments | **counter-rolls** (home proof) · **iris-opens** (featured + reveal) |
| effect | **edge-glow** (CSS) · css-ground **topglow** · ground **sky** |

Stack: adapted into existing Next 15 / Tailwind / Capsule — not a starter.html rebuild. No wallet / odds / contract changes.

## Inspiration browsed

| Source | Patterns adapted (conceptually) |
|--------|----------------------------------|
| tasteskill 2.5 (`design-taste-frontend`) | Deal system, one section/screen, equal edges, product hero, moments, block buttons |
| [60fps.design](https://60fps.design) | Reveal / Counter / Confetti / Stagger for pack open |
| [bentogrids.com](https://bentogrids.com) | How-it-works feature tiles |
| Motion (`motion/react`) | Layout + AnimatePresence, iris clipPath on reveal |

## Brand constraints

- Surfaces: `#0A0A12` base, raised `#0F0F1A`
- Accent: violet `#7C6CFF` (solid block primary; gradient reserved for accents)
- Type: Urbanist (display + body) + DM Mono (ids)
- Motif: Capsule + arc mark
- Feel: dark gaming launchpad — product-led, not neon dashboard

## Motion presets (`src/lib/motion.ts`)

- Durations **0.2–0.4s** (reveal up to ~0.55s for rare tiers)
- Animate **transform + opacity** (+ clip-path for iris moment)
- Respect **Reduced Motion** toggle + `prefers-reduced-motion`
- Pause decorative loops when tab hidden; CSS edge-glow only (no WebGL)
- Lazy-load confetti and effect chunks

## Accessibility

- WCAG AA contrast on text/controls
- Visible focus rings; modal focus trap + Escape
- Live regions for tx / reveal results
- Rarity never by color alone (label + icon)
- Tap targets ≥ 44px where interactive
- Skip control on reveal animation

## Honesty

- No fake stats, testimonials, activity feeds, or invented partners
- Counter-rolls use live contract figures only
- Randomness disclaimer stays: testnet seed ≠ VRF
- Reveal sequence only after `get_pack_result`

## First Load (build:local after restyle)

| Route | First Load JS |
|-------|----------------|
| `/` | **378 kB** (within +40 of ~372–378 baseline) |
| `/explore` | 206 kB |
| `/machine/[id]` | 383 kB |
| Shared | 106 kB |

## Taste gate notes

Ran `gate.mjs` against `http://localhost:3000/` (gaming). Actionable fixes applied: Capsule fallback for `example.com` seed image URLs; edge-glow contained; section bottom padding (flush). Remaining FAIL noise from Next webpack chunks mis-read as GLSL by `shader-lint`, and framework DOM the kit expects from `starter.html` — documented as stack mismatch; not a wallet/odds regression.

## Out of scope

- Contract / wallet / odds math / tx payload changes
- Heavy new dependencies (three.js, WebGL registries)
- Merge to `main` / Vercel deploy until explicit **go merge**
