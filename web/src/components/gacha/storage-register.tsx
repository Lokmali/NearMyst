"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import {
  GAS_STORAGE_DEPOSIT,
  finalizeFtRegistrationFromPending,
  getFtStorageMode,
  getStorageDepositPlan,
  isFtRegistered,
  rememberLegacyRegistration,
  rememberPendingFtRegistration,
  type FtStorageMode,
} from "@/lib/contract/client";
import { GACHA_CONTRACT } from "@/lib/config";
import { extractTxHash, verifyTxOnChain } from "@/lib/tx";
import { humanError } from "@/lib/ux-copy";
import { Button } from "@/components/ui/button";
import { TechTerm } from "@/components/ui/tech-term";
import { cn } from "@/lib/utils";

type RegState = "unknown" | "registered" | "missing" | "checking";

/**
 * One-click storage_deposit for buyer + gacha on payment/reward FTs.
 * Supports real NEP-141 and legacy demo FTs without storage views.
 * UI copy only — registration logic unchanged.
 */
export function StorageRegisterPanel({
  paymentToken,
  rewardTokens,
  className,
}: {
  paymentToken: string;
  rewardTokens?: string[];
  className?: string;
}) {
  const { signedAccountId, signIn, callFunction } = useWalletSelector();
  const [mode, setMode] = useState<FtStorageMode | null>(null);
  const [buyerOnPayment, setBuyerOnPayment] = useState<RegState>("unknown");
  const [gachaOnTokens, setGachaOnTokens] = useState<
    Record<string, RegState>
  >({});
  const [busy, setBusy] = useState<string | null>(null);

  const rewardKey = (rewardTokens ?? []).join("|");
  const tokens = useMemo(
    () =>
      Array.from(
        new Set(
          [paymentToken, ...(rewardKey ? rewardKey.split("|") : [])].filter(
            Boolean,
          ),
        ),
      ),
    [paymentToken, rewardKey],
  );

  const refresh = useCallback(async () => {
    if (!signedAccountId) {
      setBuyerOnPayment("unknown");
      setGachaOnTokens({});
      setMode(null);
      return;
    }
    setBuyerOnPayment("checking");
    try {
      const ftMode = await getFtStorageMode(paymentToken);
      setMode(ftMode);

      const buyer = await isFtRegistered(paymentToken, signedAccountId);
      setBuyerOnPayment(buyer.registered ? "registered" : "missing");

      const gachaEntries = await Promise.all(
        tokens.map(async (token) => {
          const r = await isFtRegistered(token, GACHA_CONTRACT);
          return [token, r.registered ? "registered" : "missing"] as const;
        }),
      );
      setGachaOnTokens(Object.fromEntries(gachaEntries));
    } catch (e) {
      setBuyerOnPayment("unknown");
      const friendly = humanError(
        e instanceof Error ? e.message : "Could not check account setup",
      );
      toast.error(friendly.title);
    }
  }, [signedAccountId, paymentToken, tokens]);

  useEffect(() => {
    void refresh();
    const onReg = () => void refresh();
    window.addEventListener("nearmyst:ft-reg-updated", onReg);
    return () => window.removeEventListener("nearmyst:ft-reg-updated", onReg);
  }, [refresh]);

  async function register(tokenId: string, accountId: string, label: string) {
    if (!signedAccountId) {
      signIn();
      return;
    }
    setBusy(label);
    try {
      const plan = await getStorageDepositPlan(tokenId);

      rememberPendingFtRegistration({
        tokenId,
        accountId,
        label,
        mode: plan.mode,
        at: Date.now(),
      });

      const outcome = await callFunction({
        contractId: tokenId,
        method: "storage_deposit",
        args: {
          account_id: accountId,
          ...plan.args,
        },
        gas: GAS_STORAGE_DEPOSIT,
        deposit: plan.deposit,
      });

      const hash = extractTxHash(outcome);
      let ok = true;
      if (hash) {
        const verified = await verifyTxOnChain(hash, signedAccountId, {
          attempts: 8,
          delayMs: 400,
        });
        ok = verified.ok;
        if (!verified.ok) {
          throw new Error(
            verified.error ||
              "Account setup failed on-chain — open the explorer link from your wallet history",
          );
        }
      }

      rememberLegacyRegistration(tokenId, accountId);
      finalizeFtRegistrationFromPending(ok);

      if (plan.mode === "nep141") {
        for (let i = 0; i < 8; i++) {
          const r = await isFtRegistered(tokenId, accountId);
          if (r.registered) break;
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      await refresh();
      toast.success(
        plan.mode === "legacy"
          ? `${label} — account ready (demo token)`
          : `${label} — account ready`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/reject|cancel|user/i.test(msg)) {
        finalizeFtRegistrationFromPending(false);
      }
      const friendly = humanError(msg);
      toast.error(friendly.title);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!signedAccountId) return null;

  const allReady =
    buyerOnPayment === "registered" &&
    tokens.every((t) => gachaOnTokens[t] === "registered");

  if (allReady) {
    return (
      <div
        className={cn(
          "rounded-md border border-success/25 bg-success-tint px-3 py-2.5 text-caption text-success",
          className,
        )}
      >
        Account ready for this token
      </div>
    );
  }

  const Status = ({ state }: { state: RegState }) => (
    <span
      className={cn(
        "text-caption font-medium",
        state === "registered" && "text-success",
        state === "missing" && "text-danger",
        (state === "unknown" || state === "checking") && "text-muted",
      )}
    >
      {state === "registered"
        ? "Ready"
        : state === "missing"
          ? "Needs setup"
          : state === "checking"
            ? "Checking…"
            : "Status unknown"}
    </span>
  );

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-subtle px-3 py-3 text-small",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-primary">
            Set up your account to receive this{" "}
            <TechTerm tip="Fungible token (FT) — the payment or reward token for this machine.">
              token
            </TechTerm>{" "}
            (one-time)
          </p>
          <p className="mt-1 text-caption text-secondary">
            {mode === "legacy"
              ? "Demo token: tap Set up, approve in your wallet, then status updates."
              : "A small one-time deposit reserves space for this token in your wallet."}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          onClick={() => void refresh()}
        >
          Refresh
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-caption text-secondary">
            You · payment token{" "}
            <span className="mono-id">{paymentToken}</span>
          </p>
          <Status state={buyerOnPayment} />
        </div>
        {buyerOnPayment !== "registered" && buyerOnPayment !== "checking" && (
          <Button
            size="sm"
            variant="secondary"
            loading={busy === "Set up my account"}
            disabled={!!busy}
            onClick={() =>
              void register(paymentToken, signedAccountId, "Set up my account")
            }
          >
            Set up my account
          </Button>
        )}
      </div>

      {tokens.map((token) => (
        <div
          key={token}
          className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3"
        >
          <div>
            <p className="text-caption text-secondary">
              Machine contract · <span className="mono-id">{token}</span>
            </p>
            <Status state={gachaOnTokens[token] ?? "unknown"} />
          </div>
          {gachaOnTokens[token] !== "registered" &&
            gachaOnTokens[token] !== "checking" && (
              <Button
                size="sm"
                variant="secondary"
                loading={busy === `Set up machine (${token})`}
                disabled={!!busy}
                onClick={() =>
                  void register(
                    token,
                    GACHA_CONTRACT,
                    `Set up machine (${token})`,
                  )
                }
              >
                Set up machine
              </Button>
            )}
        </div>
      ))}
    </div>
  );
}
