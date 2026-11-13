"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAYMENT_TOKEN } from "@/lib/ux-copy";
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
  const { signedAccountId, signIn } = useWalletSelector();
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
          <Button size="sm" onClick={() => signIn()}>
            Connect
          </Button>
        ) : null,
      },
      {
        id: "setup",
        done: !!signedAccountId && tokenReady,
        label: "Account set up for the token",
        action:
          signedAccountId && !tokenReady ? (
            <Link href="/explore">
              <Button size="sm" variant="secondary">
                Set up on a machine
              </Button>
            </Link>
          ) : null,
      },
      {
        id: "tokens",
        done: hasTokens,
        label: "Get test tokens",
        action: !hasTokens ? (
          <Link href="/explore#get-tokens">
            <Button size="sm" variant="secondary">
              How to get tokens
            </Button>
          </Link>
        ) : null,
      },
      {
        id: "buy",
        done: bought,
        label: "Buy your first pack",
        action: !bought ? (
          <Link href="/explore">
            <Button size="sm">Explore machines</Button>
          </Link>
        ) : null,
      },
    ],
    [signedAccountId, tokenReady, hasTokens, bought, signIn],
  );

  const incomplete = steps.filter((s) => !s.done);
  const allDone = incomplete.length === 0;

  if (dismissed || allDone) return null;

  return (
    <aside
      className="mb-6 rounded-lg border border-brand/25 bg-brand-tint p-4"
      aria-label="Getting started"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-primary">Getting started</h2>
          <p className="mt-1 text-caption text-secondary">
            A few quick steps — this is a testnet demo with test tokens, not real money.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md p-2 text-muted transition hover:bg-subtle hover:text-primary"
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
      <ol className="mt-4 space-y-2">
        {steps.map((s) => (
          <li
            key={s.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-raised/60 px-3 py-2.5",
              s.done && "opacity-60",
            )}
          >
            <div className="flex items-center gap-2 text-small text-primary">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
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
