"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import { useWalletReady } from "@/components/providers/wallet-provider";
import type { MachineView, Pack, PackResult, PlatformConfig } from "@/lib/types";
import {
  buildBuyMsg,
  ftBalanceOf,
  GAS_CLAIM_PENDING,
  GAS_FT_TRANSFER_CALL,
  GAS_OPEN_PACK,
  getPack,
  getPackResult,
  getUserPacks,
  isFtRegistered,
  ONE_YOCTO,
} from "@/lib/contract/client";
import { GACHA_CONTRACT, explorerTxUrl } from "@/lib/config";
import {
  creatorAmount,
  platformFeeAmount,
  totalPrice,
  MAX_BUY_QUANTITY,
  validateQuantity,
} from "@/lib/odds";
import { formatTokenAmount, tokenSymbol } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { OpeningOverlay, RevealModal } from "@/components/gacha/reveal-modal";
import { StorageRegisterPanel } from "@/components/gacha/storage-register";
import { GetTestTokensCard } from "@/components/ux/get-test-tokens";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { PackFlowProgress, type PackFlowStep } from "@/components/ux/flow-progress";
import { SpendSummary } from "@/components/ux/spend-summary";
import { TxStatusPanel, type FriendlyTx } from "@/components/ux/tx-status";
import { markFirstPackBought } from "@/components/ux/onboarding-checklist";
import { extractTxHash, rememberPackTx } from "@/lib/tx";
import { humanError, packStatusLabel } from "@/lib/ux-copy";
import { cn } from "@/lib/utils";
import { mapPool } from "@/lib/contract/client";
import { TechTerm } from "@/components/ui/tech-term";

export function MachineActions({
  machine,
  config,
}: {
  machine: MachineView;
  config: PlatformConfig | null;
}) {
  const { signedAccountId, signIn, callFunction } = useWalletSelector();
  const walletsReady = useWalletReady();
  const [qty, setQty] = useState(1);
  const [ftBal, setFtBal] = useState<string | null>(null);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [tx, setTx] = useState<FriendlyTx>({ kind: "idle" });
  const [reveal, setReveal] = useState<PackResult | null>(null);
  const [flow, setFlow] = useState<PackFlowStep>("buy");
  const [confirmBuy, setConfirmBuy] = useState(false);

  const qtyError = validateQuantity(qty, machine.packs_remaining);
  const price = useMemo(() => {
    try {
      return totalPrice(machine.pack_price, qty);
    } catch {
      return 0n;
    }
  }, [machine.pack_price, qty]);

  const feeBps = config?.platform_fee_bps ?? 0;
  const lowBalance =
    signedAccountId && ftBal != null && BigInt(ftBal) < price;

  const refreshBalances = useCallback(
    async (quiet = false) => {
      if (!signedAccountId) {
        setFtBal(null);
        setRegistered(null);
        return;
      }
      try {
        const [bal, reg] = await Promise.all([
          ftBalanceOf(machine.payment_token, signedAccountId),
          isFtRegistered(machine.payment_token, signedAccountId),
        ]);
        setFtBal(bal);
        setRegistered(reg.mode === "legacy" ? true : reg.registered);
      } catch (e) {
        if (!quiet) {
          const friendly = humanError(
            e instanceof Error ? e.message : "Failed to load balance",
          );
          toast.error(friendly.title);
        }
      }
    },
    [signedAccountId, machine.payment_token],
  );

  const refreshPacks = useCallback(
    async (opts?: { quiet?: boolean; showSpinner?: boolean }) => {
      if (!signedAccountId) {
        setPacks([]);
        return [];
      }
      if (opts?.showSpinner !== false) setLoadingPacks(true);
      try {
        const ids = await getUserPacks(signedAccountId, 0, 40);
        const detailed = await mapPool(ids, 12, (pid) => getPack(pid));
        const forMachine = detailed
          .filter((p): p is Pack => !!p && p.machine_id === machine.id)
          .sort((a, b) => b.id - a.id);
        setPacks(forMachine);
        return forMachine;
      } catch (e) {
        if (!opts?.quiet) {
          const friendly = humanError(
            e instanceof Error ? e.message : "Failed to load packs",
          );
          toast.error(friendly.title);
        }
        return null;
      } finally {
        if (opts?.showSpinner !== false) setLoadingPacks(false);
      }
    },
    [signedAccountId, machine.id],
  );

  useEffect(() => {
    void Promise.all([
      refreshBalances(true),
      refreshPacks({ quiet: true }),
    ]).then(([, packs]) => {
      if (packs === null) {
        void refreshPacks({ quiet: false });
      }
    });
  }, [refreshBalances, refreshPacks]);

  useEffect(() => {
    const unopened = packs.some((p) => p.status === "Unopened");
    const pending = packs.some((p) => p.status === "PendingClaim");
    const delivered = packs.some(
      (p) => p.status === "Delivered" || p.status === "Opened",
    );
    if (reveal) setFlow("reward");
    else if (pending) setFlow("reward");
    else if (unopened) setFlow("open");
    else if (delivered) setFlow("reward");
    else setFlow("buy");
  }, [packs, reveal]);

  function buyDisabledReason(): string | null {
    if (tx.kind === "pending") return "Transaction in progress…";
    if (!signedAccountId) return "Connect your wallet to buy";
    if (machine.status === "Paused") return "Machine is paused";
    if (machine.status === "Draft") return "Machine is not activated yet";
    if (machine.packs_remaining === 0) return "Sold out — no packs left";
    if (qtyError) return qtyError;
    if (registered === false)
      return "Set up your account for this token first (one-time)";
    if (lowBalance)
      return `Not enough ${tokenSymbol(machine.payment_token)}`;
    return null;
  }

  async function onBuy() {
    if (!signedAccountId) {
      if (!walletsReady) {
        toast.message("Wallets still loading…", {
          description: "Wait a second, then try again.",
        });
        return;
      }
      try {
        await Promise.resolve(signIn());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("Couldn’t open wallet", { description: msg });
      }
      return;
    }
    if (machine.status !== "Active") {
      toast.error(
        machine.status === "Paused"
          ? "Machine is paused"
          : "This machine isn’t available to buy right now",
      );
      return;
    }
    if (machine.packs_remaining === 0) {
      toast.error("Sold out — no packs remaining");
      return;
    }
    if (qtyError) {
      toast.error(qtyError);
      return;
    }
    if (registered === false) {
      toast.error("Set up your account for this token first, then try again.");
      return;
    }
    if (ftBal != null && BigInt(ftBal) < price) {
      toast.error(
        `Not enough ${tokenSymbol(machine.payment_token)}. Get free ${tokenSymbol(machine.payment_token)}, then try again.`,
      );
      return;
    }
    if (!confirmBuy) {
      setConfirmBuy(true);
      return;
    }

    setFlow("buy");
    setTx({ kind: "pending", label: "Buying packs…" });
    try {
      const msg = buildBuyMsg(machine.id, qty);
      const outcome = await callFunction({
        contractId: machine.payment_token,
        method: "ft_transfer_call",
        args: {
          receiver_id: GACHA_CONTRACT,
          amount: price.toString(),
          memo: null,
          msg,
        },
        gas: GAS_FT_TRANSFER_CALL,
        deposit: ONE_YOCTO,
      });

      const hash = extractTxHash(outcome) ?? "submitted";
      setTx({ kind: "success", hash, label: "Purchase submitted" });
      setConfirmBuy(false);
      markFirstPackBought();
      toast.success("Pack purchased", {
        action:
          hash !== "submitted"
            ? {
                label: "View tx",
                onClick: () => window.open(explorerTxUrl(hash), "_blank"),
              }
            : undefined,
      });
      setFlow("wait");
      const before = packs.length;
      void refreshBalances(true);
      void (async () => {
        for (let i = 0; i < 6; i++) {
          const list = await refreshPacks({
            quiet: true,
            showSpinner: i === 0,
          });
          if (list && list.length >= before + qty) {
            setFlow("open");
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        const list = await refreshPacks({ quiet: false, showSpinner: false });
        if (!list || list.length <= before) {
          toast.message("Packs still syncing — tap Refresh in a moment.");
        } else {
          setFlow("open");
        }
      })();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTx({ kind: "error", message });
      const friendly = humanError(message);
      toast.error(friendly.title);
    }
  }

  async function waitForPackResult(packId: number): Promise<PackResult | null> {
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const result = await getPackResult(packId);
      if (result) return result;
    }
    return null;
  }

  async function onOpen(packId: number) {
    if (!signedAccountId) {
      signIn();
      return;
    }
    setFlow("open");
    setTx({ kind: "pending", label: `Opening pack #${packId}…` });
    setReveal(null);
    try {
      const outcome = await callFunction({
        contractId: GACHA_CONTRACT,
        method: "open_pack",
        args: { pack_id: packId },
        gas: GAS_OPEN_PACK,
        deposit: "0",
      });

      const hash = extractTxHash(outcome) ?? "submitted";
      setTx({ kind: "success", hash, label: "Open submitted" });
      if (hash !== "submitted") rememberPackTx(packId, hash);

      const result = await waitForPackResult(packId);
      if (!result) {
        toast.error("Pack result not ready yet — refresh in a moment");
      } else {
        setReveal(result);
        setFlow("reward");
        toast.success(`You won ${result.tier}!`);
      }
      await refreshPacks();
      await refreshBalances();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTx({ kind: "error", message });
      const friendly = humanError(message);
      toast.error(friendly.title);
    }
  }

  async function onClaim(packId: number) {
    if (!signedAccountId) {
      signIn();
      return;
    }
    setTx({ kind: "pending", label: `Claiming reward for pack #${packId}…` });
    try {
      const outcome = await callFunction({
        contractId: GACHA_CONTRACT,
        method: "claim_pending",
        args: { pack_id: packId },
        gas: GAS_CLAIM_PENDING,
        deposit: "0",
      });
      const hash = extractTxHash(outcome) ?? "submitted";
      setTx({ kind: "success", hash, label: "Claim submitted" });
      toast.success("Claim submitted");
      await refreshPacks();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTx({ kind: "error", message });
      const friendly = humanError(message);
      toast.error(friendly.title);
    }
  }

  const unopened = packs.filter((p) => p.status === "Unopened");
  const disabledReason = buyDisabledReason();
  const opening =
    tx.kind === "pending" &&
    (tx.label.startsWith("Opening") || tx.label.includes("Opening"));

  const buyLabel =
    tx.kind === "pending"
      ? tx.label
      : !signedAccountId
        ? "Connect wallet"
        : confirmBuy
          ? "Confirm purchase"
          : "Buy packs";

  return (
    <div className="space-y-6 pb-24 lg:sticky lg:top-24 lg:pb-0">
      <Card>
        <h3 className="text-h3 text-primary">Buy a pack</h3>
        <p className="mt-1 text-caption text-muted">
          Pay with{" "}
          <TechTerm tip="Fungible token (FT) on NEAR — the demo payment token for this machine.">
            {tokenSymbol(machine.payment_token)}
          </TechTerm>{" "}
          (<span className="mono-id">{machine.payment_token}</span>)
        </p>

        <PackFlowProgress current={flow} className="mt-4" />

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <span className="text-small text-secondary">Quantity</span>
            <div className="mt-1.5">
              <NumberStepper
                value={qty}
                min={1}
                max={Math.max(
                  1,
                  Math.min(machine.packs_remaining, MAX_BUY_QUANTITY),
                )}
                onChange={(v) => {
                  setQty(v);
                  setConfirmBuy(false);
                }}
                disabled={tx.kind === "pending"}
              />
            </div>
            <p className="mt-1 text-caption text-muted">
              Up to {MAX_BUY_QUANTITY} packs per purchase (contract limit).
            </p>
          </div>
          <div className="text-small text-secondary">
            <div>
              Total:{" "}
              <span className="font-semibold tabular text-primary">
                {formatTokenAmount(price.toString())}{" "}
                {tokenSymbol(machine.payment_token)}
              </span>
            </div>
            {config && (
              <details className="mt-1 text-caption text-muted">
                <summary className="cursor-pointer hover:text-secondary">
                  Fee split
                </summary>
                <div className="mt-1">
                  Platform{" "}
                  <span className="tabular">
                    {formatTokenAmount(
                      platformFeeAmount(price, feeBps).toString(),
                    )}
                  </span>{" "}
                  · Creator{" "}
                  <span className="tabular">
                    {formatTokenAmount(creatorAmount(price, feeBps).toString())}
                  </span>
                </div>
              </details>
            )}
          </div>
        </div>

        {confirmBuy && signedAccountId && (
          <div className="mt-4 space-y-2">
            <SpendSummary
              pay={price.toString()}
              symbol={tokenSymbol(machine.payment_token)}
              get={`${qty} mystery pack${qty === 1 ? "" : "s"}`}
              feeLabel={
                config
                  ? `Platform ${(feeBps / 100).toFixed(2)}% included in price`
                  : undefined
              }
            />
            <p className="text-caption text-muted">
              You’ll confirm this in your wallet. Nothing is spent until you
              approve.
            </p>
          </div>
        )}

        {qtyError && (
          <p
            className={cn("mt-2 text-small text-danger", "animate-shake")}
            role="alert"
          >
            {qtyError}
          </p>
        )}
        {machine.status === "Paused" && (
          <p className="mt-2 text-small text-warning">
            Machine is paused. New purchases are blocked.
          </p>
        )}
        {machine.status === "Draft" && (
          <p className="mt-2 text-small text-warning">
            Machine isn’t activated yet.
          </p>
        )}
        {machine.packs_remaining === 0 && (
          <p className="mt-2 text-small text-warning">Sold out.</p>
        )}
        {signedAccountId && registered === false && (
          <p className="mt-2 text-small text-danger" role="alert">
            Set up your account to receive this token (one-time), then try again.
          </p>
        )}
        {signedAccountId && ftBal != null && (
          <p className="mt-2 text-caption tabular text-muted" aria-live="polite">
            Your balance: {formatTokenAmount(ftBal)}{" "}
            {tokenSymbol(machine.payment_token)}
          </p>
        )}
        {lowBalance && <GetTestTokensCard className="mt-4" />}

        {signedAccountId && (
          <StorageRegisterPanel
            className="mt-4"
            paymentToken={machine.payment_token}
            rewardTokens={machine.rewards.map((r) => r.token)}
          />
        )}

        <Button
          className="mt-4 w-full"
          loading={tx.kind === "pending" && flow === "buy"}
          disabled={
            tx.kind === "pending" ||
            (signedAccountId ? disabledReason !== null : false)
          }
          onClick={() => void onBuy()}
          aria-describedby={
            disabledReason && signedAccountId ? "buy-disabled-why" : undefined
          }
        >
          {buyLabel}
        </Button>
        {confirmBuy && (
          <Button
            className="mt-2 w-full"
            variant="ghost"
            disabled={tx.kind === "pending"}
            onClick={() => setConfirmBuy(false)}
          >
            Cancel
          </Button>
        )}
        {signedAccountId && disabledReason && (
          <p id="buy-disabled-why" className="mt-2 text-caption text-muted">
            {disabledReason}
          </p>
        )}
        {!signedAccountId && (
          <p className="mt-2 text-caption text-muted">
            Connect your wallet to buy. A wallet is your login for NEAR — you
            approve each action.
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-h3 text-primary">Your packs</h3>
          <Button variant="ghost" size="sm" onClick={() => void refreshPacks()}>
            Refresh
          </Button>
        </div>
        {!signedAccountId && (
          <p className="mt-3 text-small text-secondary">
            Connect a wallet to see packs.
          </p>
        )}
        {loadingPacks && <Skeleton className="mt-3 h-16 w-full" />}
        {signedAccountId && !loadingPacks && packs.length === 0 && (
          <p className="mt-3 text-small text-secondary">
            No packs for this machine yet. Buy one above.
          </p>
        )}
        {flow === "wait" && (
          <p className="mt-3 text-small text-secondary" role="status">
            Your pack is ready to open in a moment…
          </p>
        )}
        <ul className="mt-3 space-y-2">
          {packs.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-subtle px-3 py-2.5 text-small"
            >
              <div>
                <span className="font-medium text-primary">#{p.id}</span>
                <span className="ml-2 text-secondary">
                  {packStatusLabel(p.status)}
                </span>
              </div>
              <div className="flex gap-2">
                {p.status === "Unopened" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={tx.kind === "pending"}
                    onClick={() => void onOpen(p.id)}
                  >
                    Open
                  </Button>
                )}
                {p.status === "PendingClaim" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={tx.kind === "pending"}
                    onClick={() => void onClaim(p.id)}
                  >
                    Claim reward
                  </Button>
                )}
                {(p.status === "Delivered" || p.status === "Opened") && (
                  <Link
                    href={`/result/${p.id}`}
                    className="inline-flex min-h-9 items-center text-caption text-brand underline"
                  >
                    View result
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
        {unopened.length > 0 && (
          <p className="mt-3 text-caption text-muted">
            Your pack is ready to open in a moment after purchase (demo
            randomness rule).
          </p>
        )}
      </Card>

      <TxStatusPanel
        tx={tx}
        onRetry={
          tx.kind === "error"
            ? () => {
                setTx({ kind: "idle" });
                setConfirmBuy(false);
              }
            : undefined
        }
      />

      {opening && (
        <OpeningOverlay
          label={tx.kind === "pending" ? tx.label : "Opening…"}
        />
      )}

      {reveal && (
        <RevealModal
          result={reveal}
          txHash={tx.kind === "success" ? tx.hash : null}
          onClose={() => setReveal(null)}
        />
      )}

      {/* Mobile sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-overlay/95 p-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-container items-center gap-3">
          <div className="min-w-0 flex-1 text-caption text-secondary">
            <div className="truncate font-medium text-primary">
              {formatTokenAmount(machine.pack_price)}{" "}
              {tokenSymbol(machine.payment_token)} / pack
            </div>
            <div className="truncate">
              <AnimatedNumber value={machine.packs_remaining} /> left
              {disabledReason ? ` · ${disabledReason}` : ""}
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            loading={tx.kind === "pending" && flow === "buy"}
            disabled={
              tx.kind === "pending" ||
              (signedAccountId ? disabledReason !== null : false)
            }
            onClick={() => void onBuy()}
          >
            {!signedAccountId
              ? "Connect"
              : confirmBuy
                ? "Confirm"
                : "Buy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
