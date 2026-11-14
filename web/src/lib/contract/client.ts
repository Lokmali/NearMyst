import { GACHA_CONTRACT } from "../config";
import type {
  MachineView,
  Pack,
  PackResult,
  PlatformConfig,
  StorageBalance,
  StorageBalanceBounds,
  Tier,
  TierConfig,
} from "../types";
import { getAccountNearBalance, viewCall } from "./rpc";

/** Fallback when contract predates storage fields (should not happen on new deploy). */
const DEFAULT_STORAGE_BASE = "50000000000000000000000"; // 0.05 Ⓝ
const DEFAULT_STORAGE_PER_PACK = "1000000000000000"; // 0.001 Ⓝ

export async function getConfig(): Promise<PlatformConfig> {
  return viewCall<PlatformConfig>(GACHA_CONTRACT, "get_config", {});
}

export async function listMachines(
  from = 0,
  limit = 50,
): Promise<MachineView[]> {
  return viewCall<MachineView[]>(GACHA_CONTRACT, "list_machines", {
    from,
    limit,
  });
}

export async function getMachine(machineId: number): Promise<MachineView | null> {
  return viewCall<MachineView | null>(GACHA_CONTRACT, "get_machine", {
    machine_id: machineId,
  });
}

export async function getUserPacks(
  accountId: string,
  from = 0,
  limit = 100,
): Promise<number[]> {
  return viewCall<number[]>(GACHA_CONTRACT, "get_user_packs", {
    account_id: accountId,
    from,
    limit,
  });
}

export async function getPack(packId: number): Promise<Pack | null> {
  return viewCall<Pack | null>(GACHA_CONTRACT, "get_pack", {
    pack_id: packId,
  });
}

export async function getPackResult(
  packId: number,
): Promise<PackResult | null> {
  return viewCall<PackResult | null>(GACHA_CONTRACT, "get_pack_result", {
    pack_id: packId,
  });
}

export async function ftBalanceOf(
  tokenId: string,
  accountId: string,
): Promise<string> {
  const bal = await viewCall<string>(tokenId, "ft_balance_of", {
    account_id: accountId,
  });
  return typeof bal === "string" ? bal : String(bal);
}

/** Demo FT buy rate: $myst minted per 1 NEAR (0 decimals). */
export async function getMystBuyRate(tokenId: string): Promise<string> {
  const rate = await viewCall<string | { toString(): string }>(
    tokenId,
    "get_buy_rate",
    {},
  );
  return typeof rate === "string" ? rate : String(rate);
}

export interface MystBuyQuote {
  tokens: string;
  spendable_yocto: string;
  storage_yocto: string;
  rate_myst_per_near: string;
  registered: boolean;
}

/** Preview $myst for an attached NEAR amount (yocto). */
export async function quoteMystBuy(
  tokenId: string,
  accountId: string,
  attachedYocto: string,
): Promise<MystBuyQuote> {
  const q = await viewCall<MystBuyQuote>(tokenId, "quote_buy", {
    account_id: accountId,
    attached_yocto: attachedYocto,
  });
  return {
    tokens: String(q.tokens),
    spendable_yocto: String(q.spendable_yocto),
    storage_yocto: String(q.storage_yocto),
    rate_myst_per_near: String(q.rate_myst_per_near),
    registered: !!q.registered,
  };
}

/** Fallback rate if FT wasm predates `get_buy_rate` (must match mock_ft). */
export const DEFAULT_MYST_PER_NEAR = 100_000n;
export const YOCTO_PER_NEAR = 10n ** 24n;
/** One-time NEP-141 registration on the demo FT. */
export const FT_STORAGE_YOCTO = 1_250_000_000_000_000_000n;

/** Local quote when on-chain `quote_buy` is unavailable. */
export function localMystBuyQuote(
  attachedYocto: bigint,
  registered: boolean,
  rate: bigint = DEFAULT_MYST_PER_NEAR,
): { tokens: bigint; spendable: bigint; storage: bigint } {
  let spendable = attachedYocto;
  let storage = 0n;
  if (!registered) {
    if (attachedYocto < FT_STORAGE_YOCTO) {
      return { tokens: 0n, spendable: 0n, storage: 0n };
    }
    storage = FT_STORAGE_YOCTO;
    spendable = attachedYocto - FT_STORAGE_YOCTO;
  }
  return {
    tokens: (spendable * rate) / YOCTO_PER_NEAR,
    spendable,
    storage,
  };
}

export const GAS_BUY_MYST = "50000000000000"; // 50 Tgas

export async function storageBalanceOf(
  tokenId: string,
  accountId: string,
): Promise<StorageBalance | null> {
  return viewCall<StorageBalance | null>(tokenId, "storage_balance_of", {
    account_id: accountId,
  });
}

export type FtStorageMode = "nep141" | "legacy";

const storageModeCache = new Map<string, FtStorageMode>();

/** Known testnet demo FTs without storage_balance_of (empty after NearMyst FT redeploy). */
const KNOWN_LEGACY_FTS = new Set<string>([]);

function isMethodNotFound(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /method is not found|MethodNotFound|method not found/i.test(msg);
}

/** Detect whether the FT exposes NEP-141 storage views (demo FT often does not). */
export async function getFtStorageMode(tokenId: string): Promise<FtStorageMode> {
  if (KNOWN_LEGACY_FTS.has(tokenId)) {
    storageModeCache.set(tokenId, "legacy");
    return "legacy";
  }
  const cached = storageModeCache.get(tokenId);
  if (cached) return cached;
  try {
    await storageBalanceOf(tokenId, tokenId);
    storageModeCache.set(tokenId, "nep141");
    return "nep141";
  } catch (e) {
    if (isMethodNotFound(e)) {
      storageModeCache.set(tokenId, "legacy");
      return "legacy";
    }
    // Ambiguous RPC error — try bounds; missing → legacy.
    try {
      await viewCall(tokenId, "storage_balance_bounds", {});
      storageModeCache.set(tokenId, "nep141");
      return "nep141";
    } catch (e2) {
      if (isMethodNotFound(e2)) {
        storageModeCache.set(tokenId, "legacy");
        return "legacy";
      }
      return "nep141";
    }
  }
}

const LEGACY_REG_KEY = "nearmyst:ft-reg";
const PENDING_REG_KEY = "nearmyst:ft-reg-pending";

function legacyRegKey(tokenId: string, accountId: string) {
  return `${tokenId}::${accountId}`;
}

export function rememberLegacyRegistration(tokenId: string, accountId: string) {
  try {
    const raw = sessionStorage.getItem(LEGACY_REG_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[legacyRegKey(tokenId, accountId)] = true;
    sessionStorage.setItem(LEGACY_REG_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function recallLegacyRegistration(
  tokenId: string,
  accountId: string,
): boolean {
  try {
    const raw = sessionStorage.getItem(LEGACY_REG_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return !!map[legacyRegKey(tokenId, accountId)];
  } catch {
    return false;
  }
}

export type PendingFtRegistration = {
  tokenId: string;
  accountId: string;
  label: string;
  mode: FtStorageMode;
  at: number;
};

/** Save intent before wallet redirect so status survives remount. */
export function rememberPendingFtRegistration(pending: PendingFtRegistration) {
  try {
    sessionStorage.setItem(PENDING_REG_KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

export function takePendingFtRegistration(): PendingFtRegistration | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REG_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_REG_KEY);
    return JSON.parse(raw) as PendingFtRegistration;
  } catch {
    return null;
  }
}

export function peekPendingFtRegistration(): PendingFtRegistration | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingFtRegistration;
  } catch {
    return null;
  }
}

/** Call after a confirmed storage_deposit tx (redirect or in-page). */
export function finalizeFtRegistrationFromPending(ok: boolean) {
  const pending = takePendingFtRegistration();
  if (!pending || !ok) return pending;
  rememberLegacyRegistration(pending.tokenId, pending.accountId);
  return pending;
}

/**
 * True if account is registered for FT transfers.
 * - NEP-141: `storage_balance_of` is non-null
 * - Legacy demo FT (no storage views): session marker after a successful deposit,
 *   or treat as registered when we cannot verify on-chain (caller may still deposit)
 */
export async function isFtRegistered(
  tokenId: string,
  accountId: string,
): Promise<{ registered: boolean; mode: FtStorageMode }> {
  const mode = await getFtStorageMode(tokenId);
  if (mode === "legacy") {
    return {
      registered: recallLegacyRegistration(tokenId, accountId),
      mode,
    };
  }
  try {
    const bal = await storageBalanceOf(tokenId, accountId);
    return { registered: bal != null, mode };
  } catch (e) {
    if (isMethodNotFound(e)) {
      storageModeCache.set(tokenId, "legacy");
      return {
        registered: recallLegacyRegistration(tokenId, accountId),
        mode: "legacy",
      };
    }
    throw e;
  }
}

/** Deposit + args for storage_deposit matching FT capability. */
export async function getStorageDepositPlan(
  tokenId: string,
): Promise<{ deposit: string; args: Record<string, unknown>; mode: FtStorageMode }> {
  const mode = await getFtStorageMode(tokenId);
  if (mode === "legacy") {
    // Old mock_ft: non-payable storage_deposit(account_id) — attach 0 NEAR.
    return {
      mode,
      deposit: "0",
      args: {}, // account_id filled by caller
    };
  }
  const bounds = await storageBalanceBounds(tokenId);
  return {
    mode,
    deposit: String(bounds.min),
    args: { registration_only: true },
  };
}

/** NEP-141 storage bounds. Falls back to ~0.00125 Ⓝ if the token omits the view. */
export async function storageBalanceBounds(
  tokenId: string,
): Promise<StorageBalanceBounds> {
  try {
    const bounds = await viewCall<StorageBalanceBounds>(
      tokenId,
      "storage_balance_bounds",
      {},
    );
    if (bounds?.min != null) {
      storageModeCache.set(tokenId, "nep141");
      return bounds;
    }
  } catch (e) {
    if (isMethodNotFound(e)) {
      storageModeCache.set(tokenId, "legacy");
    }
  }
  return { min: "1250000000000000000000", max: null };
}

export async function getRequiredCreateDeposit(
  maxPacks: number,
): Promise<string> {
  try {
    const v = await viewCall<string | { toString(): string }>(
      GACHA_CONTRACT,
      "get_required_create_deposit",
      { max_packs: maxPacks },
    );
    return typeof v === "string" ? v : String(v);
  } catch {
    const base = BigInt(DEFAULT_STORAGE_BASE);
    const per = BigInt(DEFAULT_STORAGE_PER_PACK);
    return (base + per * BigInt(maxPacks)).toString();
  }
}

export async function getMaxWithdrawableInventory(
  machineId: number,
  rewardId: number,
): Promise<number> {
  return viewCall<number>(GACHA_CONTRACT, "get_max_withdrawable_inventory", {
    machine_id: machineId,
    reward_id: rewardId,
  });
}

/** Run async work over items with a concurrency limit (avoids RPC stampedes). */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export { getAccountNearBalance };

export interface CreateRewardInput {
  token: string;
  amount_per_win: string;
  tier: Tier;
  quantity: number;
}

export interface CreateMachineArgs {
  name: string;
  description: string;
  image_url: string;
  payment_token: string;
  pack_price: string;
  max_packs: number;
  tiers: TierConfig[];
  rewards: CreateRewardInput[];
}

export function buildBuyMsg(machineId: number, quantity: number): string {
  return JSON.stringify({
    action: "buy",
    machine_id: machineId,
    quantity,
  });
}

export function buildDepositRewardMsg(
  machineId: number,
  rewardId: number,
): string {
  return JSON.stringify({
    action: "deposit_reward",
    machine_id: machineId,
    reward_id: rewardId,
  });
}

/** Gas / deposit budgets (yocto strings). */
/** Prepaid gas strings (yocto-gas). Keep under 300 Tgas tx limit. */
export const GAS_FT_TRANSFER_CALL = "150000000000000"; // 150 Tgas
/** open_pack + FT transfer (50) + resolve (40) + headroom */
export const GAS_OPEN_PACK = "200000000000000"; // 200 Tgas
export const GAS_CLAIM_PENDING = "200000000000000"; // 200 Tgas
export const GAS_CREATE_MACHINE = "100000000000000";
export const GAS_ACTIVATE = "50000000000000";
export const GAS_PAUSE = "30000000000000";
/** withdraw_* + FT transfer (50) + resolve (40) + headroom */
export const GAS_WITHDRAW = "200000000000000"; // 200 Tgas
export const ONE_YOCTO = "1";
/** @deprecated Prefer getRequiredCreateDeposit(maxPacks) — kept as base-only fallback. */
export const CREATE_MACHINE_DEPOSIT = DEFAULT_STORAGE_BASE;
export const GAS_STORAGE_DEPOSIT = "30000000000000";
