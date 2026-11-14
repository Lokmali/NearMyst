export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK ?? "testnet") as
  | "testnet"
  | "mainnet";

export const GACHA_CONTRACT =
  process.env.NEXT_PUBLIC_GACHA_CONTRACT ?? "app.nearmyst.testnet";

/** Default to FastNear — official public RPC is often slow/rate-limited. */
export const NEAR_RPC =
  process.env.NEXT_PUBLIC_NEAR_RPC ??
  (NETWORK === "mainnet"
    ? "https://free.rpc.fastnear.com"
    : "https://test.rpc.fastnear.com");

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ??
  (NETWORK === "mainnet"
    ? "https://nearblocks.io"
    : "https://testnet.nearblocks.io");

export const PROBABILITY_DENOMINATOR = 10_000;

/** Official social / support channels */
export const SOCIAL_X_URL = "https://x.com/Near_Myst";
export const SOCIAL_TELEGRAM_URL = "https://t.me/NearMyst";
/** Support goes to Telegram */
export const SUPPORT_URL = SOCIAL_TELEGRAM_URL;

export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER_URL}/txns/${txHash}`;
}

export function explorerAccountUrl(accountId: string): string {
  return `${EXPLORER_URL}/address/${accountId}`;
}
