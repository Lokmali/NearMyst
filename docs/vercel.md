# Deploy frontend to Vercel

## Project setup

1. Import the GitHub repo into [Vercel](https://vercel.com).
2. **Root Directory:** `web`
3. **Framework Preset:** Next.js
4. **Node.js:** 20.x (or newer LTS)
5. **Build Command:** `npm run build` → runs `next build` (default **`distDir`: `.next`**)
6. **Install Command:** `npm ci` (preferred) or `npm install`
7. **Output:** leave Vercel Next.js defaults (do **not** set `NEXT_DIST_DIR` on Vercel)

Local tip: while `npm run dev` is running, use `npm run build:isolated` so builds write to `.next-build` instead of clobbering `.next`. Vercel never needs that.

## Environment variables (public only)

Set in Vercel → Project → Settings → Environment Variables (Production + Preview):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_NETWORK` | `testnet` |
| `NEXT_PUBLIC_GACHA_CONTRACT` | `app.nearmyst.testnet` |
| `NEXT_PUBLIC_NEAR_RPC` | `https://test.rpc.fastnear.com` |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://testnet.nearblocks.io` |
| `NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN` | `ft.nearmyst.testnet` |

Redeploy after changing env vars. Never put private keys or seed phrases in Vercel env.

## Wallet redirect URLs

MyNearWallet and similar wallets redirect back with `?transactionHashes=…`.

1. Note production URL, e.g. `https://nearmyst.vercel.app`
2. Allow that origin in the wallet when connecting
3. Test Connect → buy → open on Preview before promoting Production
4. `TxReturnHandler` verifies hashes via RPC — success toasts mean on-chain confirmation

## CLI deploy (optional — needs your `go`)

If Vercel CLI is installed and logged in:

```bash
cd web
vercel link          # select project / create
vercel env pull      # optional
vercel --prod        # only after explicit approval
```

## Checklist

- [ ] `NEXT_PUBLIC_GACHA_CONTRACT` = `app.nearmyst.testnet`
- [ ] At least one Active machine (seed script)
- [ ] Connect → buy → open works on the Vercel URL
- [ ] Network mismatch banner if a mainnet `.near` account hits a testnet build
