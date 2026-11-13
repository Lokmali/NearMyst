import { NEAR_RPC, NETWORK } from "./config";

/** Extract transaction hash from wallet-selector outcomes. Never invent one. */
export function extractTxHash(outcome: unknown): string | null {
  if (!outcome) return null;
  if (Array.isArray(outcome) && outcome[0]) {
    return extractTxHash(outcome[0]);
  }
  if (typeof outcome !== "object") return null;
  const o = outcome as Record<string, unknown>;
  if (typeof o.transaction_outcome === "object" && o.transaction_outcome) {
    const to = o.transaction_outcome as { id?: string };
    if (to.id) return to.id;
  }
  if (typeof o.transaction === "object" && o.transaction) {
    const t = o.transaction as { hash?: string };
    if (t.hash) return t.hash;
  }
  if (typeof o.transactionHash === "string") return o.transactionHash;
  return null;
}

/**
 * Pull a u64 return value from a FinalExecutionOutcome (create_machine id).
 * Falls back to parsing EVENT_JSON machine_created from logs.
 */
export function extractCreateMachineId(outcome: unknown): number | null {
  const outcomes = Array.isArray(outcome) ? outcome : [outcome];
  for (const item of outcomes) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const status = o.status as Record<string, unknown> | undefined;
    if (status && typeof status.SuccessValue === "string") {
      const id = decodeSuccessValueU64(status.SuccessValue);
      if (id != null) return id;
    }

    const receipts = o.receipts_outcome as
      | Array<{ outcome?: { logs?: string[]; status?: Record<string, unknown> } }>
      | undefined;
    if (Array.isArray(receipts)) {
      for (const r of receipts) {
        const sv = r.outcome?.status?.SuccessValue;
        if (typeof sv === "string") {
          const id = decodeSuccessValueU64(sv);
          if (id != null) return id;
        }
        for (const log of r.outcome?.logs ?? []) {
          const id = parseMachineCreatedFromLog(log);
          if (id != null) return id;
        }
      }
    }

    const logs = (o.transaction_outcome as { outcome?: { logs?: string[] } })
      ?.outcome?.logs;
    if (Array.isArray(logs)) {
      for (const log of logs) {
        const id = parseMachineCreatedFromLog(log);
        if (id != null) return id;
      }
    }
  }
  return null;
}

function decodeSuccessValueU64(b64: string): number | null {
  try {
    const json = atob(b64);
    const n = JSON.parse(json) as unknown;
    if (typeof n === "number" && Number.isFinite(n)) return n;
    if (typeof n === "string" && /^\d+$/.test(n)) return Number(n);
  } catch {
    /* ignore */
  }
  return null;
}

function parseMachineCreatedFromLog(log: string): number | null {
  if (!log.includes("EVENT_JSON:") || !log.includes("machine_created")) {
    return null;
  }
  try {
    const json = log.slice(log.indexOf("EVENT_JSON:") + "EVENT_JSON:".length);
    const ev = JSON.parse(json) as {
      standard?: string;
      event?: string;
      data?: { machine_id?: number };
    };
    if (ev.standard && ev.standard !== "nearmyst") return null;
    if (ev.event === "machine_created" && typeof ev.data?.machine_id === "number") {
      return ev.data.machine_id;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export type TxVerifyResult =
  | { ok: true; hash: string }
  | { ok: false; hash: string; error: string };

/** Poll NEAR RPC until finality or timeout. Does not invent success. */
export async function verifyTxOnChain(
  txHash: string,
  signerId: string,
  opts?: { attempts?: number; delayMs?: number },
): Promise<TxVerifyResult> {
  const attempts = opts?.attempts ?? 8;
  const delayMs = opts?.delayMs ?? 400;
  let lastErr = "Transaction not found yet";

  const rpcs = [
    NEAR_RPC,
    ...(NETWORK === "mainnet"
      ? ["https://free.rpc.fastnear.com", "https://rpc.mainnet.near.org"]
      : ["https://test.rpc.fastnear.com", "https://rpc.testnet.near.org"]),
  ].filter((u, i, a) => a.indexOf(u) === i);

  for (let i = 0; i < attempts; i++) {
    const rpc = rpcs[i % rpcs.length];
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "nearmyst-tx",
          method: "tx",
          params: {
            tx_hash: txHash,
            sender_account_id: signerId,
            wait_until: "FINAL",
          },
        }),
      });
      const body = (await res.json()) as {
        result?: {
          status?: { SuccessValue?: string; Failure?: unknown };
          final_execution_status?: string;
        };
        error?: { message?: string; data?: unknown };
      };

      if (body.error) {
        lastErr =
          typeof body.error.message === "string"
            ? body.error.message
            : "RPC error looking up transaction";
      } else if (body.result?.status) {
        if ("Failure" in body.result.status && body.result.status.Failure) {
          return {
            ok: false,
            hash: txHash,
            error: JSON.stringify(body.result.status.Failure).slice(0, 280),
          };
        }
        if ("SuccessValue" in body.result.status) {
          return { ok: true, hash: txHash };
        }
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { ok: false, hash: txHash, error: lastErr };
}

const TX_KEY = "nearmyst:lastPackTx";

export function rememberPackTx(packId: number, hash: string) {
  try {
    const raw = sessionStorage.getItem(TX_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[String(packId)] = hash;
    sessionStorage.setItem(TX_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function recallPackTx(packId: number): string | null {
  try {
    const raw = sessionStorage.getItem(TX_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[String(packId)] ?? null;
  } catch {
    return null;
  }
}
