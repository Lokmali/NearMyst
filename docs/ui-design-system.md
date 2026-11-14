# NearMyst UI design system

Calm dark gaming launchpad. Depth from layered surfaces and 1px borders — not neon glow. Spectacle is reserved for the **hero** (product Capsule stage + edge-glow) and **pack reveal** (iris open).

Taste deal lock: [taste-deal.md](./taste-deal.md) · notes: [design-notes.md](./design-notes.md).

## Fonts

| Role | Family | Weights |
|------|--------|---------|
| Display + body | Urbanist (`--font-urbanist` → `--font-display` / `--font-body`) | 400–700 (variable) |
| Mono / ids | DM Mono (`--font-mono`) | 400 / 500 |

Scale utilities: `.text-display`, `.text-h1`, `.text-h2`, `.text-h3`, `.text-body`, `.text-small`, `.text-caption`, `.text-eyebrow`. Tabular nums: `.tabular`. Ids/hashes: `.mono-id`.

Display weight/tracking from brand deal: `--display-weight: 500`, `--display-tracking-xl: -0.04em`.

## Color tokens (`web/src/app/globals.css`)

| Token | Value |
|-------|-------|
| `--bg-base` | `#0A0A12` |
| `--bg-raised` | `#0F0F1A` |
| `--bg-overlay` | `#151524` |
| `--bg-subtle` | `#1A1A2B` |
| `--border-default` | `rgba(255,255,255,0.08)` |
| `--border-strong` | `rgba(255,255,255,0.14)` |
| `--text-primary` | `#F5F5FA` |
| `--text-secondary` | `#A9A9BC` |
| `--text-muted` | `#70708A` |
| `--accent` | `#7C6CFF` |

**Primary button:** solid `--accent` on dark ink (dealt `buttons=block`), not a multi-stop gradient.

**Rarity (rarity UI only):** Common `#9CA3AF`, Rare `#38BDF8`, Epic `#D946EF`, Legendary `#FBBF24`, Mythic `#FB7185`.

Dark mode only — no light theme. Brand violet kept via `start.mjs brand` (taste “never violet” waived for client identity).

## Shape & depth

Radii: soft deal — `--radius-sm/md/lg/xl` + `--radius-btn: 6px`. Cards = `bg-raised` + 1px border + `--shadow-card`. Blur only on sticky header (after scroll) and modal backdrops.

Layout: `.page-wrap` — equal left/right edges, `max-w` 72rem, `px-4` / `md:px-6`.

## Components

| Primitive | Path |
|-----------|------|
| Button (block CVA) | `components/ui/button.tsx` |
| Card, Badge, Input, Tabs, Stat | `components/ui/*` |
| Modal (focus trap, Esc, scroll lock) | `components/ui/modal.tsx` |
| Capsule motif | `components/brand/capsule.tsx` |
| Arc mark (dealt) | `components/brand/arc-mark.tsx` |
| Counter rolls / iris / edge-glow | `components/motion/*` |
| OnboardingChecklist | `components/ux/onboarding-checklist.tsx` |

Prefer token classes (`text-primary`, `border-border`, `bg-raised`, `text-brand`, …) over raw `zinc-*`.

## UX copy patterns

- Prefer plain English; keep technical terms in `TechTerm` tooltips or collapsed “technical details”.
- Status labels: use `packStatusLabel` / `humanError` from `lib/ux-copy.ts`.
- Disabled primary actions must show **why**.
- Confirm before spend: `SpendSummary` before the wallet prompt.
- Rarity: never color alone — `TierBadge` includes a shape mark + label.

## Motion

Tokens in `lib/motion.ts`: fast 150ms, base 200ms, slow 300ms.

- **Full:** page fade, route tint, hero float, counter-rolls, iris-opens, pack reveal, confetti for Epic+.
- **Reduced:** no confetti, no loops, instant/simple fades, counters jump to final value.

User toggle: account menu + footer (`localStorage` key `nearmyst-motion`).

## Honesty rules

- No fake stats, wins, or balances. Home proof counters are live contract numbers.
- Reveal sequence starts only after `get_pack_result`.
- Testnet / randomness / no-audit disclaimers stay visible (`Disclaimer` banner).

## DX

If the app shows a white screen after builds: stop `next dev`, run `npm run dev:clean` in `web/`, hard-refresh. See `web/README.md`. Use `npm run build:local` while `next.dev` is running.
