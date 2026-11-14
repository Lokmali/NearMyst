"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import { ArrowRightLeft, ExternalLink } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Disclaimer } from "@/components/ui/disclaimer";
import { FadeIn } from "@/components/motion/fade-in";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import {
  DEFAULT_MYST_PER_NEAR,
  FT_STORAGE_YOCTO,
  GAS_BUY_MYST,
  YOCTO_PER_NEAR,
  ftBalanceOf,
  getAccountNearBalance,
  getMystBuyRate,
  localMystBuyQuote,
  quoteMystBuy,
  storageBalanceOf,
} from "@/lib/contract/client";
import { explorerTxUrl } from "@/lib/config";
import { formatNear, formatTokenAmount, tokenSymbol } from "@/lib/format";
import { extractTxHash } from "@/lib/tx";
import { humanError, DEFAULT_PAYMENT_TOKEN } from "@/lib/ux-copy";
import { cn } from "@/lib/utils";

const NEAR_FAUCET_URL = "https://near-faucet.io/";
const PRESETS = ["0.01", "0.05", "0.1", "0.25"] as const;

function parseNearToYocto(nearStr: string): bigint | null {
  const raw = nearStr.trim();
  if (!raw || !/^\d+(\.\d+)?$/.test(raw)) return null;
  const [wholePart, fracPart = ""] = raw.split(".");
  const frac = (fracPart + "0".repeat(24)).slice(0, 24);
  try {
    return BigInt(wholePart || "0") * YOCTO_PER_NEAR + BigInt(frac || "0");
  } catch {
    return null;
  }
}

export default function BuyMystPage() {
  const { signedAccountId, signIn, callFunction } = useWalletSelector();
  const token = DEFAULT_PAYMENT_TOKEN;
  const symbol = tokenSymbol(token);

  const [nearAmount, setNearAmount] = useState("0.05");
  const [rate, setRate] = useState<bigint>(DEFAULT_MYST_PER_NEAR);
  const [registered, setRegistered] = useState(true);
  const [nearBal, setNearBal] = useState<string | null>(null);
  const [mystBal, setMystBal] = useState<string | null>(null);
  const [quoteTokens, setQuoteTokens] = useState<bigint>(0n);
  const [storageYocto, setStorageYocto] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [buyReady, setBuyReady] = useState<boolean | null>(null);

  const yocto = useMemo(() => parseNearToYocto(nearAmount), [nearAmount]);

  const refreshBalances = useCallback(async () => {
    if (!signedAccountId) {
      setNearBal(null);
      setMystBal(null);
      setRegistered(true);
      return;
    }
    try {
      const [near, myst, storage] = await Promise.all([
        getAccountNearBalance(signedAccountId),
        ftBalanceOf(token, signedAccountId).catch(() => "0"),
        storageBalanceOf(token, signedAccountId).catch(() => null),
      ]);
      setNearBal(near.toString());
      setMystBal(myst);
      setRegistered(storage != null);
    } catch {
      /* keep prior */
    }
  }, [signedAccountId, token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getMystBuyRate(token);
        if (!cancelled) {
          setRate(BigInt(r || "0") || DEFAULT_MYST_PER_NEAR);
          setBuyReady(true);
        }
      } catch {
        if (!cancelled) {
          setRate(DEFAULT_MYST_PER_NEAR);
          setBuyReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    void refreshBalances();
  }, [refreshBalances]);

  useEffect(() => {
    let cancelled = false;
    async function loadQuote() {
      if (yocto == null || yocto <= 0n) {
        setQuoteTokens(0n);
        setStorageYocto(0n);
        return;
      }
      if (signedAccountId && buyReady) {
        try {
          const q = await quoteMystBuy(
            token,
            signedAccountId,
            yocto.toString(),
          );
          if (!cancelled) {
            setQuoteTokens(BigInt(q.tokens || "0"));
            setStorageYocto(BigInt(q.storage_yocto || "0"));
            setRegistered(q.registered);
          }
          return;
        } catch {
          /* fall through to local */
        }
      }
      const local = localMystBuyQuote(yocto, registered, rate);
      if (!cancelled) {
        setQuoteTokens(local.tokens);
        setStorageYocto(local.storage);
      }
    }
    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [yocto, signedAccountId, token, buyReady, registered, rate]);

  const nearBalBig = nearBal != null ? BigInt(nearBal) : null;
  const insufficientNear =
    yocto != null && nearBalBig != null && yocto > nearBalBig;
  const tooSmall =
    yocto != null &&
    yocto > 0n &&
    quoteTokens <= 0n &&
    (!registered ? yocto < FT_STORAGE_YOCTO + YOCTO_PER_NEAR / rate : true);

  async function onBuy() {
    if (!signedAccountId) {
      signIn();
      return;
    }
    if (buyReady === false) {
      toast.error(
        "On-chain buy is not live yet — the demo FT needs a redeploy with buy().",
      );
      return;
    }
    if (yocto == null || yocto <= 0n) {
      toast.error("Enter a valid NEAR amount");
      return;
    }
    if (quoteTokens <= 0n) {
      toast.error(
        registered
          ? "Amount too small — try at least 0.01 NEAR"
          : "First buy needs a bit more NEAR for token registration (~0.00125 Ⓝ + purchase)",
      );
      return;
    }
    if (insufficientNear) {
      toast.error("Not enough testnet NEAR — use the faucet first");
      return;
    }

    setBusy(true);
    try {
      const outcome = await callFunction({
        contractId: token,
        method: "buy",
        args: {},
        gas: GAS_BUY_MYST,
        deposit: yocto.toString(),
      });
      const hash = extractTxHash(outcome);
      if (hash) setLastTx(hash);
      toast.success(
        `Bought ${formatTokenAmount(quoteTokens)} ${symbol}`,
      );
      await refreshBalances();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (/MethodNotFound|method not found|compilation/i.test(raw)) {
        setBuyReady(false);
        toast.error(
          "Buy method missing on ft.nearmyst.testnet — redeploy mock_ft with buy().",
        );
      } else {
        const friendly = humanError(raw);
        toast.error(friendly.title);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap space-y-8 py-8 md:py-10">
      <FadeIn>
        <div className="max-w-2xl">
          <p className="text-caption font-medium uppercase tracking-wide text-brand">
            Testnet swap
          </p>
          <h1 className="mt-2 text-h1 text-primary">
            Buy {symbol} with NEAR
          </h1>
          <p className="mt-3 max-w-xl text-body text-secondary">
            Swap testnet NEAR for demo {symbol} at a fixed rate. Not a DEX —
            tokens are minted by the demo FT for play only.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <Card className="space-y-5 border-border bg-raised/85 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-h3 text-primary">Swap</h2>
            <span className="inline-flex items-center gap-1.5 text-caption text-muted">
              <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              1 Ⓝ → {formatTokenAmount(rate)} {symbol}
            </span>
          </div>

          {buyReady === false && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-small text-warning">
              On-chain <span className="mono-id">buy()</span> is not deployed on{" "}
              <span className="mono-id">{token}</span> yet. Redeploy mock_ft,
              then refresh.
            </p>
          )}

          <label className="block text-small text-secondary">
            You pay (testnet NEAR)
            <Input
              className="mt-1.5 tabular"
              inputMode="decimal"
              value={nearAmount}
              onChange={(e) => setNearAmount(e.target.value)}
              placeholder="0.05"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={cn(
                  "rounded-md border px-3 py-1.5 text-caption tabular transition-colors",
                  nearAmount === p
                    ? "border-brand/50 bg-brand/15 text-brand"
                    : "border-border bg-subtle text-secondary hover:border-brand/40 hover:text-primary",
                )}
                onClick={() => setNearAmount(p)}
              >
                {p} Ⓝ
              </button>
            ))}
          </div>

          <div className="rounded-md border border-border bg-subtle px-3 py-2.5 text-caption text-secondary">
            <div className="flex justify-between gap-3">
              <span>You pay</span>
              <span className="tabular font-medium text-primary">
                {nearAmount || "0"} Ⓝ
              </span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span>You get</span>
              <span className="tabular font-medium text-primary">
                {formatTokenAmount(quoteTokens)} {symbol}
              </span>
            </div>
            {storageYocto > 0n ? (
              <div className="mt-1 flex justify-between gap-3 text-muted">
                <span>FT registration</span>
                <span className="tabular">
                  ~{formatNear(storageYocto, 5)} Ⓝ (one-time)
                </span>
              </div>
            ) : null}
          </div>

          {signedAccountId && (
            <div className="space-y-1 text-caption tabular text-muted">
              <p>
                NEAR balance:{" "}
                {nearBal != null ? `${formatNear(nearBal)} Ⓝ` : "…"}
              </p>
              <p>
                {symbol} balance:{" "}
                {mystBal != null ? formatTokenAmount(mystBal) : "…"}
              </p>
            </div>
          )}

          {insufficientNear && (
            <p className="text-small text-danger" role="alert">
              Not enough testnet NEAR. Grab free NEAR from the faucet.
            </p>
          )}
          {tooSmall && yocto != null && yocto > 0n && (
            <p className="text-small text-warning" role="alert">
              Amount too small to mint any {symbol}
              {!registered ? " after registration" : ""}. Try 0.01 Ⓝ or more.
            </p>
          )}

          {!signedAccountId ? (
            <ConnectWalletButton size="md" className="w-full sm:w-auto" />
          ) : (
            <Button
              className="w-full sm:w-auto"
              loading={busy}
              disabled={
                busy ||
                buyReady === false ||
                yocto == null ||
                yocto <= 0n ||
                quoteTokens <= 0n ||
                !!insufficientNear
              }
              onClick={() => void onBuy()}
            >
              Buy {symbol}
            </Button>
          )}

          {lastTx && (
            <a
              className="inline-flex items-center gap-1 text-small text-info underline"
              href={explorerTxUrl(lastTx)}
              target="_blank"
              rel="noreferrer"
            >
              View tx {lastTx.slice(0, 12)}…
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <ButtonLink
              href={NEAR_FAUCET_URL}
              target="_blank"
              rel="noreferrer"
              size="sm"
              variant="secondary"
            >
              NEAR faucet
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
            </ButtonLink>
            <ButtonLink href="/explore" size="sm" variant="secondary">
              Browse machines
            </ButtonLink>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="border-border">
            <h3 className="text-h3 text-primary">How it works</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-small text-secondary">
              <li>Get free testnet NEAR from the faucet.</li>
              <li>Connect your wallet and pick an amount.</li>
              <li>
                Approve <span className="mono-id">buy</span> — {symbol} is
                minted to your account at a fixed demo rate.
              </li>
              <li>
                Use {symbol} to{" "}
                <Link href="/explore" className="text-brand underline">
                  buy packs
                </Link>{" "}
                or fund Create deposits.
              </li>
            </ol>
          </Card>
          <Disclaimer>
            Testnet only. Attached NEAR stays in the demo FT contract. Rate is
            fixed for the hackathon demo — not market price.
          </Disclaimer>
        </aside>
      </div>
    </div>
  );
}
