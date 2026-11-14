"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { Check, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useWalletReady } from "@/components/providers/wallet-provider";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { DEFAULT_PAYMENT_TOKEN } from "@/lib/ux-copy";
import { tokenSymbol } from "@/lib/format";
import { ftBalanceOf, isFtRegistered } from "@/lib/contract/client";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "nearmyst:onboarding-dismissed";
const FIRST_PACK_KEY = "nearmyst:bought-first-pack";

export function markFirstPackBought() {
  try {
    localStorage.setItem(FIRST_PACK_KEY, "1");
    window.dispatchEvent(new Event("nearmyst:onboarding"));
  } catch {
    /* ignore */
  }
}

export function OnboardingChecklist() {
  const ready = useWalletReady();
  if (!ready) return null;
  return <OnboardingChecklistReady />;
}

function OnboardingChecklistReady() {
  const { signedAccountId } = useWalletSelector();
  const [dismissed, setDismissed] = useState(true);
  const [tokenReady, setTokenReady] = useState(false);
  const [hasTokens, setHasTokens] = useState(false);
  const [bought, setBought] = useState(false);

  const load = useCallback(async () => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
      setBought(localStorage.getItem(FIRST_PACK_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    if (!signedAccountId) {
      setTokenReady(false);
      setHasTokens(false);
      return;
    }
    try {
      const [reg, bal] = await Promise.all([
        isFtRegistered(DEFAULT_PAYMENT_TOKEN, signedAccountId),
        ftBalanceOf(DEFAULT_PAYMENT_TOKEN, signedAccountId),
      ]);
      setTokenReady(reg.mode === "legacy" ? true : reg.registered);
      setHasTokens(BigInt(bal || "0") > 0n);
    } catch {
      setTokenReady(false);
      setHasTokens(false);
    }
  }, [signedAccountId]);

  useEffect(() => {
    void load();
    const on = () => void load();
    window.addEventListener("nearmyst:onboarding", on);
    window.addEventListener("nearmyst:ft-reg-updated", on);
    return () => {
      window.removeEventListener("nearmyst:onboarding", on);
      window.removeEventListener("nearmyst:ft-reg-updated", on);
    };
  }, [load]);

  const steps = useMemo(
    () => [
      {
        id: "wallet",
        done: !!signedAccountId,
        label: "Wallet connected",
        action: !signedAccountId ? (
          <ConnectWalletButton size="sm">Connect</ConnectWalletButton>
        ) : null,
      },
      {
        id: "setup",
        done: !!signedAccountId && tokenReady,
        label: "Account set up for the token",
        action:
          signedAccountId && !tokenReady ? (
            <ButtonLink href="/explore" size="sm" variant="secondary">
              Set up on a machine
            </ButtonLink>
          ) : null,
      },
      {
        id: "tokens",
        done: hasTokens,
        label: `Get free ${tokenSymbol(DEFAULT_PAYMENT_TOKEN)}`,
        action: !hasTokens ? (
          <ButtonLink href="/explore#get-tokens" size="sm" variant="secondary">
            How to get tokens
          </ButtonLink>
        ) : null,
      },
      {
        id: "buy",
        done: bought,
        label: "Buy your first pack",
        action: !bought ? (
          <ButtonLink href="/explore" size="sm">
            Explore machines
          </ButtonLink>
        ) : null,
      },
    ],
    [signedAccountId, tokenReady, hasTokens, bought],
  );

  const incomplete = steps.filter((s) => !s.done);
  const allDone = incomplete.length === 0;

  if (dismissed || allDone) return null;

  return (
    <aside
      className="mb-2 rounded-[var(--radius-md)] border border-border bg-raised p-5"
      aria-label="Getting started"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-primary">Getting started</h2>
          <p className="mt-1.5 text-small text-secondary">
            Testnet demo with test tokens — not real money.
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 min-w-11 rounded-[var(--radius-btn)] p-2 text-muted transition-colors hover:bg-subtle hover:text-primary"
          aria-label="Dismiss getting started"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <ol className="mt-5 divide-y divide-border border-t border-border">
        {steps.map((s) => (
          <li
            key={s.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 py-3",
              s.done && "opacity-55",
            )}
          >
            <div className="flex items-center gap-2.5 text-small text-primary">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-[var(--radius-btn)] border",
                  s.done
                    ? "border-success/40 bg-success-tint text-success"
                    : "border-border text-muted",
                )}
                aria-hidden
              >
                {s.done ? <Check className="h-3 w-3" strokeWidth={2} /> : null}
              </span>
              <span className={s.done ? "line-through" : undefined}>{s.label}</span>
            </div>
            {!s.done && s.action}
          </li>
        ))}
      </ol>
    </aside>
  );
}
