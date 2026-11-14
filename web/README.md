# NearMyst web

Next.js 15 App Router frontend for the NearMyst NEAR testnet demo. Warm lottery-night UI with Fraunces + Source Sans 3, brass `#E0B84A`, and Mystery Trunk motif.

Design tokens and component rules: [../docs/ui-design-system.md](../docs/ui-design-system.md)

## Stack

- Next.js 15 · React 19 · TypeScript
- Tailwind CSS 3 + CSS variables
- `@near-wallet-selector` v10 · `@near-js/providers`
- `motion` · `sonner` · `lucide-react` · `canvas-confetti`

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Env keys

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_NETWORK` | `testnet` (or `mainnet`) |
| `NEXT_PUBLIC_GACHA_CONTRACT` | Gacha contract account id |
| `NEXT_PUBLIC_NEAR_RPC` | JSON-RPC endpoint |
| `NEXT_PUBLIC_EXPLORER_URL` | Explorer base URL |
| `NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN` | Create-form payment FT hint |

Never commit `.env.local` or private keys.

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:clean` | Delete `.next`, then start dev (fixes white screen) |
| `npm run build` | Production build (Vercel-ready, uses `.next`) |
| `npm run build:local` | Local build into `.next-build` (safe while `dev` runs) |
| `npm start` | Serve production build |
| `npm run start:local` | Serve the `.next-build` output |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | Vitest (odds/price helpers) |

## White screen / corrupted `.next`

If the browser shows a blank page or Next returns `Cannot find module './NNN.js'`:

1. Stop all `next dev` processes.
2. Run `npm run dev:clean` (clears `.next` and restarts).
3. Hard-refresh the browser (`Ctrl+Shift+R`).

**Never run `npm run build` while `npm run dev` is running** — it overwrites `.next` and breaks CSS/JS. Use `npm run build:local` for local verification.

## Deploy (Vercel)

Point the Vercel project root at `web/`, set the env vars above, and use the default Next.js build (`npm run build`).
