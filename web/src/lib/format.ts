/** Display helpers — no fake values. */

/** Shorten long NEAR account ids; leave short ones (e.g. `nearmyst.testnet`) intact. */
export function shortenAccount(id: string, head = 8, tail = 8): string {
  const s = id.trim();
  // Keep readable demo / human accounts fully visible in the header.
  if (s.length <= 22) return s;
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function formatNear(yocto: string | bigint, digits = 4): string {
  const y = typeof yocto === "bigint" ? yocto : BigInt(yocto || "0");
  const whole = y / 10n ** 24n;
  const frac = y % 10n ** 24n;
  const fracStr = frac.toString().padStart(24, "0").slice(0, digits);
  return `${whole.toString()}.${fracStr}`;
}

/** Format FT amount with optional decimals (default 0 for demo mock FT). */
export function formatTokenAmount(
  amount: string | bigint,
  decimals = 0,
  maxFrac = 4,
): string {
  const a = typeof amount === "bigint" ? amount : BigInt(amount || "0");
  if (decimals === 0) return a.toString();
  const base = 10n ** BigInt(decimals);
  const whole = a / base;
  const frac = a % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFrac)
    .replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function bpsToPercent(bps: number, denominator = 10_000): string {
  return `${((bps / denominator) * 100).toFixed(2)}%`;
}

/** Known demo FTs → branded NearMyst ticker (on-chain account id unchanged). */
const MYST_TICKER_ACCOUNTS = new Set([
  "ft.nearmyst.testnet",
  "ft.nearmyst.near",
]);

/**
 * Display ticker from a NEAR FT account id.
 * `ft.nearmyst.testnet` → `$myst` · `mooncoin.testnet` → `$mooncoin`
 */
export function tokenSymbol(tokenAccountId: string): string {
  const raw = (tokenAccountId || "").trim().toLowerCase();
  if (!raw) return "$token";
  if (MYST_TICKER_ACCOUNTS.has(raw)) return "$myst";
  const head = raw.split(".")[0] || raw;
  const name = head.replace(/^ft[_-]?/, "") || head;
  return `$${name}`;
}

/** Win headline: `500 $myst` */
export function formatWinHeadline(
  amount: string | bigint,
  tokenAccountId: string,
  decimals = 0,
): string {
  return `${formatTokenAmount(amount, decimals)} ${tokenSymbol(tokenAccountId)}`;
}
