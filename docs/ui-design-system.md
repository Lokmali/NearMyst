# NearMyst UI design system

Calm, dark, premium Web3 UI (Linear / Vercel quality). Depth from layered surfaces and 1px borders — not neon glow. Spectacle is reserved for the **hero** and **pack reveal**.

## Fonts

| Role | Family | Weights |
|------|--------|---------|
| Display | Space Grotesk (`--font-display`) | 500 / 600 / 700 |
| Body | Inter (`--font-body`) | 400 / 500 / 600 |

Scale utilities: `.text-display`, `.text-h1`, `.text-h2`, `.text-h3`, `.text-body`, `.text-small`, `.text-caption`, `.text-eyebrow`. Tabular nums: `.tabular`. Ids/hashes: `.mono-id`.

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
| Brand gradient | `#7C6CFF → #5B8CFF` (primary button + hero “Mystery.” only) |

**Rarity (rarity UI only):** Common `#9CA3AF`, Rare `#38BDF8`, Epic `#D946EF`, Legendary `#FBBF24`, Mythic `#FB7185`.

Dark mode only — no light theme.

## Shape & depth

Radii: 8 / 12 / 16 / 24. Cards are solid `bg-raised` + 1px border + `--shadow-card`. Blur only on sticky header (after scroll) and modal backdrops.

## Components

| Primitive | Path |
|-----------|------|
| Button (CVA variants) | `components/ui/button.tsx` |
| Card, Badge, Input, Tabs, Stat | `components/ui/*` |
| Modal (focus trap, Esc, scroll lock) | `components/ui/modal.tsx` |
| Tooltip | `components/ui/tooltip.tsx` |
| Capsule motif | `components/brand/capsule.tsx` |
| TechTerm (plain word + jargon tip) | `components/ui/tech-term.tsx` |
| OnboardingChecklist | `components/ux/onboarding-checklist.tsx` |
| GetTestTokensCard | `components/ux/get-test-tokens.tsx` |
| PackFlowProgress (Buy → Wait → Open → Reward) | `components/ux/flow-progress.tsx` |
| TxStatusPanel (pending / success / error + tech details) | `components/ux/tx-status.tsx` |
| SpendSummary (confirm-before-spend) | `components/ux/spend-summary.tsx` |

Prefer token classes (`text-primary`, `border-border`, `bg-raised`, `text-brand`, `text-danger`, …) over raw `zinc-*` / `white/10`.

## UX copy patterns

- Prefer plain English; keep technical terms in `TechTerm` tooltips or collapsed “technical details”.
- Status labels: use `packStatusLabel` / `humanError` from `lib/ux-copy.ts` (e.g. PendingClaim → “Reward waiting for you”).
- Disabled primary actions must show **why** (helper text under the button).
- Confirm before spend: show `SpendSummary` (pay / get / fee) before the wallet prompt.
- Onboarding checklist dismiss + first-pack flags live in `localStorage` (`nearmyst:onboarding-dismissed`, `nearmyst:bought-first-pack`).
- Rarity: never color alone — `TierBadge` includes a shape mark + label.

## Error & empty states

- Friendly 404: `app/not-found.tsx` · Global error boundary: `app/error.tsx` (both offer Go home).
- Explore empty: “No machines match” + Clear filters.
- Inventory empty tabs include a clear CTA (Explore / Create).

## Motion

Tokens in `lib/motion.ts`: fast 150ms, base 200ms, slow 300ms.

- **Full:** page fade, subtle route tint, hero float/crank, pack reveal, confetti for Epic+.
- **Reduced:** (toggle + `prefers-reduced-motion`) — no confetti, no hero parallax loops, instant/simple fades.

User toggle: account menu + footer (`localStorage` key `nearmyst-motion`).

Calmed (not spectacle): route transition is a soft brand tint flash (not a full iris), card hover is a 2px lift only (no tilt), buttons are not magnetic.

## Layout

- Container: `max-w-container` (1152px), `px-4` / `md:px-6`
- Header height 64px; sticky filters under header use `top-16`
- Section gaps ~64–96px on marketing pages

## Honesty rules

- No fake stats, wins, or balances.
- Reveal sequence starts only after `get_pack_result`.
- Testnet / randomness / no-audit disclaimers stay visible (`Disclaimer` banner).

## DX

If the app shows a white screen after builds: stop `next dev`, run `npm run dev:clean` in `web/`, hard-refresh. See `web/README.md`.
