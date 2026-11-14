"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import type { MachineView, PlatformConfig, RewardView } from "@/lib/types";
import {
  GAS_ACTIVATE,
  GAS_FT_TRANSFER_CALL,
  GAS_PAUSE,
  GAS_WITHDRAW,
  ONE_YOCTO,
  buildDepositRewardMsg,
  ftBalanceOf,
  getMachine,
  getMaxWithdrawableInventory,
} from "@/lib/contract/client";
import { GACHA_CONTRACT, explorerTxUrl } from "@/lib/config";
import { formatTokenAmount, tokenSymbol } from "@/lib/format";
import { requiredDepositAmount } from "@/lib/odds";
import { extractTxHash } from "@/lib/tx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberStepper } from "@/components/ui/number-stepper";
import { TierBadge } from "@/components/ui/badge";
import { GetTestTokensCard } from "@/components/ux/get-test-tokens";

function depositedSlots(machine: MachineView): number {
  return (
    machine.total_deposited_slots ??
    machine.rewards.reduce((s, r) => s + r.quantity_deposited, 0)
  );
}

function remainingUnits(r: RewardView): number {
  return Math.max(0, r.quantity_total - r.quantity_deposited);
}

function depositAmountFor(r: RewardView): bigint {
  const units = remainingUnits(r);
  if (units <= 0) return 0n;
  return requiredDepositAmount(r.amount_per_win, units);
}

function friendlyActivateError(raw: string, machine: MachineView): string {
  if (/insufficient inventory/i.test(raw)) {
    const have = depositedSlots(machine);
    return `Deposits incomplete: ${have}/${machine.max_packs} reward slots funded. Deposit rewards first, then Activate.`;
  }
  if (/user reject|User rejected|cancelled|Canceled/i.test(raw)) {
    return "Wallet request was cancelled.";
  }
  return raw;
}

export function CreatorControls({
  machine,
  onUpdated,
}: {
  machine: MachineView;
  onUpdated: (m: MachineView) => void;
}) {
  const { signedAccountId, signIn, callFunction } = useWalletSelector();
  const [busy, setBusy] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [maxByReward, setMaxByReward] = useState<Record<number, number>>({});
  const [unitsByReward, setUnitsByReward] = useState<Record<number, number>>({});
  const [ftBal, setFtBal] = useState<string | null>(null);

  const isCreator =
    !!signedAccountId && signedAccountId === machine.creator;
  const canWithdrawInventory = machine.status !== "Active";

  const haveSlots = depositedSlots(machine);
  const needSlots = machine.max_packs;
  const depositsReady = haveSlots >= needSlots;
  const pendingRewards = useMemo(
    () => machine.rewards.filter((r) => remainingUnits(r) > 0),
    [machine.rewards],
  );
  const totalDepositNeed = useMemo(() => {
    try {
      return pendingRewards.reduce((s, r) => s + depositAmountFor(r), 0n);
    } catch {
      return 0n;
    }
  }, [pendingRewards]);

  const refreshMax = useCallback(async () => {
    if (!canWithdrawInventory) {
      setMaxByReward({});
      return;
    }
    const entries = await Promise.all(
      machine.rewards.map(async (r) => {
        try {
          const max = await getMaxWithdrawableInventory(machine.id, r.id);
          return [r.id, max] as const;
        } catch {
          return [r.id, 0] as const;
        }
      }),
    );
    const map: Record<number, number> = {};
    const units: Record<number, number> = {};
    for (const [id, max] of entries) {
      map[id] = max;
      units[id] = Math.min(1, max);
    }
    setMaxByReward(map);
    setUnitsByReward((prev) => {
      const next = { ...units };
      for (const id of Object.keys(prev)) {
        const n = Number(id);
        if (next[n] != null && prev[n] != null) {
          next[n] = Math.min(prev[n], map[n] ?? 0);
        }
      }
      return next;
    });
  }, [canWithdrawInventory, machine.id, machine.rewards]);

  useEffect(() => {
    void refreshMax();
  }, [refreshMax, machine.status, machine.creator_earnings]);

  useEffect(() => {
    if (!signedAccountId || machine.status !== "Draft") {
      setFtBal(null);
      return;
    }
    const token = machine.payment_token;
    let cancelled = false;
    void (async () => {
      try {
        const bal = await ftBalanceOf(token, signedAccountId);
        if (!cancelled) setFtBal(bal);
      } catch {
        if (!cancelled) setFtBal(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedAccountId, machine.status, machine.payment_token, haveSlots]);

  if (!isCreator) return null;

  async function refresh() {
    const m = await getMachine(machine.id);
    if (m) onUpdated(m);
    await refreshMax();
  }

  async function run(
    label: string,
    method: string,
    args: Record<string, unknown>,
    gas = GAS_PAUSE,
  ) {
    if (!signedAccountId) {
      signIn();
      return;
    }
    setBusy(label);
    try {
      const outcome = await callFunction({
        contractId: GACHA_CONTRACT,
        method,
        args,
        gas,
        deposit: "0",
      });
      const hash = extractTxHash(outcome);
      if (hash) setLastTx(hash);
      toast.success(`${label} submitted`);
      await refresh();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      toast.error(friendlyActivateError(raw, machine));
    } finally {
      setBusy(null);
    }
  }

  async function depositReward(r: RewardView) {
    if (!signedAccountId) {
      signIn();
      return;
    }
    const units = remainingUnits(r);
    if (units <= 0) {
      toast.message("This reward is already fully deposited");
      return;
    }
    let amount: bigint;
    try {
      amount = depositAmountFor(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      return;
    }
    if (amount <= 0n) return;

    if (ftBal != null && BigInt(ftBal || "0") < amount) {
      toast.error(
        `Not enough ${tokenSymbol(r.token)}. Need ${formatTokenAmount(amount)}, have ${formatTokenAmount(ftBal)}.`,
      );
      return;
    }

    setBusy(`Deposit #${r.id}`);
    try {
      const outcome = await callFunction({
        contractId: r.token,
        method: "ft_transfer_call",
        args: {
          receiver_id: GACHA_CONTRACT,
          amount: amount.toString(),
          memo: null,
          msg: buildDepositRewardMsg(machine.id, r.id),
        },
        gas: GAS_FT_TRANSFER_CALL,
        deposit: ONE_YOCTO,
      });
      const hash = extractTxHash(outcome);
      if (hash) setLastTx(hash);
      toast.success(`Deposited ${r.tier} reward (#${r.id})`);
      // FT callback can lag — poll briefly then refresh.
      for (let i = 0; i < 8; i++) {
        await new Promise((res) => setTimeout(res, 1200));
        const m = await getMachine(machine.id);
        if (!m) continue;
        const reward = m.rewards.find((x) => x.id === r.id);
        if (reward && reward.quantity_deposited >= r.quantity_total) {
          onUpdated(m);
          break;
        }
        if (i === 7) onUpdated(m);
      }
      await refreshMax();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function depositAllPending() {
    for (const r of pendingRewards) {
      await depositReward(r);
      // Stop if a deposit failed (busy cleared without progress).
      const m = await getMachine(machine.id);
      if (m) onUpdated(m);
      const still = m?.rewards.find((x) => x.id === r.id);
      if (still && remainingUnits(still) > 0) break;
    }
  }

  async function activateWhenReady() {
    if (!depositsReady) {
      toast.error(
        `Fund inventory first (${haveSlots}/${needSlots} slots). Deposit rewards below, then Activate.`,
      );
      return;
    }
    await run(
      "Activate",
      "activate_machine",
      { machine_id: machine.id },
      GAS_ACTIVATE,
    );
  }

  const lowBalance =
    machine.status === "Draft" &&
    !depositsReady &&
    ftBal != null &&
    totalDepositNeed > 0n &&
    BigInt(ftBal || "0") < totalDepositNeed;

  return (
    <Card className="border-border bg-raised/85 backdrop-blur-sm">
      <h3 className="text-h3 text-primary">Creator controls</h3>
      <p className="mt-1 text-caption text-secondary">
        On-chain actions for your machine. Earnings:{" "}
        <span className="mono-id tabular text-primary">
          {formatTokenAmount(machine.creator_earnings)} FT
        </span>
      </p>

      {machine.status === "Draft" && (
        <div className="mt-4 rounded-md border border-border bg-subtle/70 px-3 py-3">
          <p className="text-small font-medium text-primary">
            Inventory:{" "}
            <span className="tabular">
              {haveSlots}/{needSlots}
            </span>{" "}
            slots deposited
          </p>
          {!depositsReady ? (
            <p className="mt-1 text-caption text-warning">
              Activate needs full deposits. Approve each reward transfer in your
              wallet, then Activate.
            </p>
          ) : (
            <p className="mt-1 text-caption text-success">
              Deposits look complete — you can Activate.
            </p>
          )}
          {ftBal != null && (
            <p className="mt-1 text-caption tabular text-muted">
              Your balance: {formatTokenAmount(ftBal)}{" "}
              {tokenSymbol(machine.payment_token)}
              {!depositsReady && totalDepositNeed > 0n
                ? ` · need ${formatTokenAmount(totalDepositNeed)} more`
                : null}
            </p>
          )}
          {pendingRewards.length > 0 && (
            <ul className="mt-3 space-y-2">
              {pendingRewards.map((r) => {
                const units = remainingUnits(r);
                let amt = "0";
                try {
                  amt = depositAmountFor(r).toString();
                } catch {
                  amt = "?";
                }
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TierBadge tier={r.tier} />
                        <span className="text-caption mono-id text-muted">
                          #{r.id}
                        </span>
                      </div>
                      <p className="mt-1 text-caption text-secondary">
                        {units} units ·{" "}
                        {formatTokenAmount(amt)} {tokenSymbol(r.token)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy === `Deposit #${r.id}`}
                      disabled={!!busy}
                      onClick={() => void depositReward(r)}
                    >
                      Deposit
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {pendingRewards.length > 1 && (
            <Button
              className="mt-3"
              variant="secondary"
              loading={busy?.startsWith("Deposit") ?? false}
              disabled={!!busy}
              onClick={() => void depositAllPending()}
            >
              Deposit all pending
            </Button>
          )}
          {lowBalance && <GetTestTokensCard className="mt-4" />}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {machine.status === "Draft" && (
          <Button
            loading={busy === "Activate"}
            disabled={!!busy || !depositsReady}
            onClick={() => void activateWhenReady()}
          >
            Activate machine
          </Button>
        )}
        {machine.status === "Active" && (
          <Button
            variant="secondary"
            loading={busy === "Pause"}
            disabled={!!busy}
            onClick={() =>
              void run("Pause", "pause_machine", { machine_id: machine.id })
            }
          >
            Pause
          </Button>
        )}
        {machine.status === "Paused" && (
          <Button
            variant="secondary"
            loading={busy === "Unpause"}
            disabled={!!busy}
            onClick={() =>
              void run("Unpause", "unpause_machine", {
                machine_id: machine.id,
              })
            }
          >
            Unpause
          </Button>
        )}
        <Button
          loading={busy === "Withdraw earnings"}
          disabled={
            !!busy || BigInt(machine.creator_earnings || "0") === 0n
          }
          onClick={() =>
            void run(
              "Withdraw earnings",
              "withdraw_creator_earnings",
              { machine_id: machine.id },
              GAS_WITHDRAW,
            )
          }
        >
          Withdraw creator earnings
        </Button>
      </div>

      <div className="mt-6 border-t border-border/60 pt-4">
        <h4 className="text-small font-medium text-primary">
          Withdraw unreserved inventory
        </h4>
        <p className="mt-1 text-caption text-secondary">
          Only when Draft or Paused. Reserved / needed units for unopened packs
          cannot be withdrawn. Failed FT transfers restore inventory on-chain.
        </p>
        {!canWithdrawInventory && (
          <p className="mt-2 text-caption text-warning">
            Pause the machine before withdrawing inventory.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {machine.rewards.map((r) => {
            const max = maxByReward[r.id] ?? 0;
            const units = unitsByReward[r.id] ?? 0;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <TierBadge tier={r.tier} />
                    <span className="text-caption mono-id text-muted">
                      #{r.id}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-secondary">
                    {formatTokenAmount(r.amount_per_win)} / win · max{" "}
                    <span className="tabular">{max}</span> units
                    {machine.status === "Draft" ? (
                      <>
                        {" "}
                        · deposited{" "}
                        <span className="tabular">
                          {r.quantity_deposited}/{r.quantity_total}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <NumberStepper
                    value={Math.min(units, Math.max(max, 0))}
                    min={max > 0 ? 1 : 0}
                    max={Math.max(max, 0)}
                    onChange={(v) =>
                      setUnitsByReward((prev) => ({ ...prev, [r.id]: v }))
                    }
                    disabled={!canWithdrawInventory || max === 0 || !!busy}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === `Withdraw inv #${r.id}`}
                    disabled={
                      !canWithdrawInventory || max === 0 || units < 1 || !!busy
                    }
                    onClick={() =>
                      void run(
                        `Withdraw inv #${r.id}`,
                        "withdraw_unreserved_inventory",
                        {
                          machine_id: machine.id,
                          reward_id: r.id,
                          units,
                        },
                        GAS_WITHDRAW,
                      )
                    }
                  >
                    Withdraw
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {lastTx && (
        <a
          className="mt-3 block text-small text-info underline"
          href={explorerTxUrl(lastTx)}
          target="_blank"
          rel="noreferrer"
        >
          View tx {lastTx.slice(0, 12)}…
        </a>
      )}
    </Card>
  );
}

/** Visible only to platform owner / fee_receiver. */
export function PlatformFeePanel({
  machine,
  config,
  onUpdated,
}: {
  machine: MachineView;
  config: PlatformConfig | null;
  onUpdated: (m: MachineView) => void;
}) {
  const { signedAccountId, signIn, callFunction } = useWalletSelector();
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const allowed =
    !!signedAccountId &&
    !!config &&
    (signedAccountId === config.owner ||
      signedAccountId === config.fee_receiver);

  if (!allowed) return null;

  async function withdraw() {
    if (!signedAccountId) {
      signIn();
      return;
    }
    setBusy(true);
    try {
      const outcome = await callFunction({
        contractId: GACHA_CONTRACT,
        method: "withdraw_platform_earnings",
        args: { machine_id: machine.id },
        gas: GAS_WITHDRAW,
        deposit: "0",
      });
      const hash = extractTxHash(outcome);
      if (hash) setLastTx(hash);
      toast.success("Platform fee withdraw submitted");
      const m = await getMachine(machine.id);
      if (m) onUpdated(m);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border">
      <h3 className="text-h3 text-primary">Platform fees</h3>
      <p className="mt-1 text-caption text-secondary">
        Accrued for this machine:{" "}
        <span className="mono-id tabular text-primary">
          {formatTokenAmount(machine.platform_earnings)} FT
        </span>
        . Paid to <span className="mono-id">{config?.fee_receiver}</span>.
      </p>
      <Button
        className="mt-4"
        loading={busy}
        disabled={busy || BigInt(machine.platform_earnings || "0") === 0n}
        onClick={() => void withdraw()}
      >
        Withdraw platform earnings
      </Button>
      {lastTx && (
        <a
          className="mt-3 block text-small text-info underline"
          href={explorerTxUrl(lastTx)}
          target="_blank"
          rel="noreferrer"
        >
          View tx {lastTx.slice(0, 12)}…
        </a>
      )}
    </Card>
  );
}
