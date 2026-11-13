import { JsonRpcProvider } from "@near-js/providers";
import { NEAR_RPC, NETWORK } from "../config";

/** Prefer a sticky working endpoint so we don't re-pay timeouts every call. */
let stickyUrl: string | null = null;
let provider: JsonRpcProvider | null = null;
let providerUrl: string | null = null;

const FALLBACKS =
  NETWORK === "mainnet"
    ? ["https://free.rpc.fastnear.com", "https://rpc.mainnet.near.org"]
    : ["https://test.rpc.fastnear.com", "https://rpc.testnet.near.org"];

function rpcOrder(): string[] {
  const preferred = stickyUrl ?? NEAR_RPC;
  const rest = [NEAR_RPC, ...FALLBACKS].filter(
    (u, i, a) => u !== preferred && a.indexOf(u) === i,
  );
  return [preferred, ...rest];
}

export function getProvider(url = stickyUrl ?? NEAR_RPC): JsonRpcProvider {
  if (!provider || providerUrl !== url) {
    provider = new JsonRpcProvider({ url });
    providerUrl = url;
  }
  return provider;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientFetchError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    /failed to fetch/i.test(msg) ||
    /networkerror/i.test(msg) ||
    /fetch failed/i.test(msg) ||
    /timeout/i.test(msg) ||
    /503|502|429|504/.test(msg)
  );
}

async function withRpcFailover<T>(fn: (p: JsonRpcProvider) => Promise<T>): Promise<T> {
  const urls = rpcOrder();
  // At most 2 tries: sticky/primary, then one fallback. Keep UX snappy.
  const maxTries = Math.min(2, urls.length);
  let lastError: unknown;

  for (let i = 0; i < maxTries; i++) {
    const url = urls[i];
    try {
      const result = await fn(getProvider(url));
      stickyUrl = url;
      return result;
    } catch (e) {
      lastError = e;
      if (!isTransientFetchError(e) || i === maxTries - 1) break;
      // Drop sticky if it failed transiently so next call tries the other endpoint.
      if (stickyUrl === url) stickyUrl = null;
      await sleep(120);
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `RPC failed (${detail}). Try refreshing or set NEXT_PUBLIC_NEAR_RPC.`,
  );
}

export async function viewCall<T>(
  contractId: string,
  methodName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return withRpcFailover(async (p) => {
    const result = await p.callFunction(contractId, methodName, args);
    return result as T;
  });
}

export async function getAccountNearBalance(accountId: string): Promise<bigint> {
  return withRpcFailover(async (p) => {
    const account = await p.viewAccount(accountId);
    return BigInt(account.amount);
  });
}
