"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, ExternalLink, Wallet } from "lucide-react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { DEFAULT_PAYMENT_TOKEN } from "@/lib/ux-copy";
import { tokenSymbol } from "@/lib/format";
import { ftBalanceOf } from "@/lib/contract/client";
import { CopyButton } from "@/components/ui/copy-button";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { CreateMemeTokenPanel } from "@/components/ux/create-meme-token";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { useWalletReady } from "@/components/providers/wallet-provider";
import { cn } from "@/lib/utils";

const NEAR_FAUCET_URL = "https://near-faucet.io/";

/** Player-facing help when someone needs demo tokens to buy a pack. */
export function GetTestTokensCard({ className }: { className?: string }) {
  const ready = useWalletReady();
  return (
    <Card id="get-tokens" className={cn("scroll-mt-24", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 text-primary">
            Get free {tokenSymbol(DEFAULT_PAYMENT_TOKEN)}
          </h3>
          <p className="mt-2 max-w-xl text-small text-secondary">
            Demo {tokenSymbol(DEFAULT_PAYMENT_TOKEN)} on NEAR testnet —{" "}
            <strong className="font-medium text-primary">not real money</strong>.
            You need a few to buy a pack.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/35 bg-brand-tint px-2.5 py-1 text-caption font-medium text-brand">
          <Coins className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          Free · testnet
        </span>
      </div>

      {ready ? <TokenSteps /> : <TokenStepsBody signedAccountId={null} />}
    </Card>
  );
}

/**
 * Shows the help card only when a connected wallet has zero demo tokens.
 * Keeps Explore clean for visitors who already have balance (or aren’t logged in).
 */
export function GetTestTokensWhenNeeded({ className }: { className?: string }) {
  const ready = useWalletReady();
  if (!ready) return null;
  return <GetTestTokensWhenNeededReady className={className} />;
}

function GetTestTokensWhenNeededReady({ className }: { className?: string }) {
  const { signedAccountId } = useWalletSelector();
  const [needsTokens, setNeedsTokens] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);

  const check = useCallback(async () => {
    if (!signedAccountId) {
      setNeedsTokens(false);
      return;
    }
    try {
      const bal = await ftBalanceOf(DEFAULT_PAYMENT_TOKEN, signedAccountId);
      setNeedsTokens(BigInt(bal || "0") === 0n);
    } catch {
      setNeedsTokens(false);
    }
  }, [signedAccountId]);

  useEffect(() => {
    void check();
    const on = () => void check();
    window.addEventListener("nearmyst:onboarding", on);
    window.addEventListener("nearmyst:ft-reg-updated", on);
    return () => {
      window.removeEventListener("nearmyst:onboarding", on);
      window.removeEventListener("nearmyst:ft-reg-updated", on);
    };
  }, [check]);

  useEffect(() => {
    const syncHash = () => setForcedOpen(window.location.hash === "#get-tokens");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  // Show when balance is empty, or when linked here from Getting started.
  if (!forcedOpen && (!signedAccountId || !needsTokens)) return null;
  return <GetTestTokensCard className={className} />;
}

function TokenSteps() {
  const { signedAccountId } = useWalletSelector();
  return <TokenStepsBody signedAccountId={signedAccountId} />;
}

function TokenStepsBody({
  signedAccountId,
}: {
  signedAccountId: string | null;
}) {
  return (
    <>
    <ol className="mt-5 space-y-3">
      <li className="flex gap-3 rounded-[var(--radius-sm)] border border-border bg-subtle/60 p-3.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-caption font-semibold text-brand"
          aria-hidden
        >
          1
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-small font-medium text-primary">
            Connect a NEAR testnet wallet
          </p>
          <p className="mt-1 text-caption text-muted">
            That’s your login. Use testnet only — never send real funds here.
          </p>
          <div className="mt-3">
            {signedAccountId ? (
              <p className="inline-flex min-h-9 flex-wrap items-center gap-2 rounded-full border border-success/30 bg-success-tint px-3 text-caption text-success">
                <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                Connected as{" "}
                <span className="mono-id text-primary" translate="no">
                  {signedAccountId}
                </span>
              </p>
            ) : (
              <ConnectWalletButton size="sm">Connect wallet</ConnectWalletButton>
            )}
          </div>
        </div>
      </li>

      <li className="flex gap-3 rounded-[var(--radius-sm)] border border-border bg-subtle/60 p-3.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-caption font-semibold text-brand"
          aria-hidden
        >
          2
        </span>
        <div className="min-w-0 flex-1">
            <p className="text-small font-medium text-primary">
              Buy {tokenSymbol(DEFAULT_PAYMENT_TOKEN)} with testnet NEAR
            </p>
            <p className="mt-1 text-caption text-muted">
              Swap faucet NEAR for demo {tokenSymbol(DEFAULT_PAYMENT_TOKEN)} on
              the Buy page (fixed testnet rate).
            </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ButtonLink href="/buy" size="sm">
              Buy {tokenSymbol(DEFAULT_PAYMENT_TOKEN)}
            </ButtonLink>
            {signedAccountId ? (
              <>
                <code
                  className="mono-id max-w-full truncate rounded-md border border-border bg-base px-2.5 py-1.5 text-caption text-primary"
                  translate="no"
                >
                  {signedAccountId}
                </code>
                <CopyButton value={signedAccountId} label="Copy account" />
              </>
            ) : null}
          </div>
        </div>
      </li>

      <li className="flex gap-3 rounded-[var(--radius-sm)] border border-border bg-subtle/60 p-3.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-caption font-semibold text-brand"
          aria-hidden
        >
          3
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-small font-medium text-primary">
            Need a little NEAR for fees?
          </p>
          <p className="mt-1 text-caption text-muted">
            Testnet NEAR is free from the public faucet. Play tokens still come
            from the demo host (step 2).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink
              href={NEAR_FAUCET_URL}
              target="_blank"
              rel="noreferrer"
              size="sm"
              variant="secondary"
            >
              Open NEAR faucet
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </ButtonLink>
            <ButtonLink href="/explore" size="sm">
              Browse machines
            </ButtonLink>
          </div>
        </div>
      </li>
    </ol>

    <CreateMemeTokenPanel compact className="mt-4" />
    </>
  );
}
