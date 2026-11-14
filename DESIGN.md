# NearMyst design system

Lottery night-fair world: warm black stage, brass metal, mystery trunk as the product. Wordmark mark: brass NEAR **N** + green mystery box (`/brand/logo-v2.png`).

## World

Dark warm stage for on-chain packs. The **Mystery Trunk** leads — shake before open, lid lift, then the win amount. Brass is the brand metal — not purple SaaS.

## Tokens

| Role | Value |
|------|-------|
| Background | `#0C0A08` |
| Raised | `#16120E` |
| Ink | `#F7F0E4` |
| Muted | `#C4B5A0` / `#8A7D6C` |
| Accent | `#E0B84A` (brass) |
| Radius | soft cards (`16–28px`), pill buttons (near.com) |
| Type | Fraunces (display), Source Sans 3 (body), DM Mono (ids) |

## Rarity

| Tier | Hex |
|------|-----|
| Common | `#A39A8C` |
| Rare | `#5BA4C9` |
| Epic | `#2DD4A8` |
| Legendary | `#E0B84A` |
| Mythic | `#E85D4C` |

## Layout

- Equal edges via `.page-wrap` (72rem), generous horizontal padding
- Home (near.com rhythm): centered brand → one line → CTA row → one `.product-panel`
- Header: text links + Connect (no bordered nav chips)
- Operate pages: one job per view
- Cards: rounded panels with quiet borders; How steps as a card grid

## Motion

- Hero entrance; trunk float on home
- Open ceremony: drop → shake → lid open → `{amount} $myst` (demo FT ticker)
- Honor `prefers-reduced-motion` + user toggle

## Bans (craft-floor)

- No eyebrow/kicker above headings
- No gradient text for emphasis
- No decorative glass as the whole look
- No purple brand accent
- No fake social proof
