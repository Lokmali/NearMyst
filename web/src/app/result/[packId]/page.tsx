"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { TierBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Tooltip } from "@/components/ui/tooltip";
import { getPack, getPackResult } from "@/lib/contract/client";
import { explorerTxUrl } from "@/lib/config";
import { formatTokenAmount, formatWinHeadline, tokenSymbol } from "@/lib/format";
import { packStatusLabel } from "@/lib/ux-copy";
import { recallPackTx } from "@/lib/tx";
import type { Pack, PackResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <ResultInner />
    </Suspense>
  );
}

function Unavailable({ note }: { note?: string }) {
  return (
    <Tooltip content="Not provided by the contract">
      <span className="rounded-sm bg-subtle px-2 py-0.5 text-caption italic text-muted">
        Unavailable{note ? ` · ${note}` : ""}
      </span>
    </Tooltip>
  );
}

function ResultInner() {
  const params = useParams<{ packId: string }>();
  const search = useSearchParams();
  const packId = Number(params.packId);
  const [pack, setPack] = useState<Pack | null>(null);
  const [result, setResult] = useState<PackResult | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!Number.isInteger(packId) || packId < 0) {
        setError("Invalid pack id");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [p, r] = await Promise.all([
          getPack(packId),
          getPackResult(packId),
        ]);
        if (cancelled) return;
        if (!p) {
          setError(`Pack #${packId} not found`);
          setPack(null);
          setResult(null);
        } else {
          setPack(p);
          setResult(r);
          const fromQuery = search.get("tx");
          const remembered = recallPackTx(packId);
          setTxHash(fromQuery || remembered);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [packId, search]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <ErrorPanel
        message={error ?? "Unavailable"}
        action={
          <Link href="/inventory" className="text-small text-brand underline">
            ← Inventory
          </Link>
        }
      />
    );
  }

  const randomRef = result?.random_ref ?? pack.random_ref;

  return (
    <div className="page-wrap mx-auto max-w-xl space-y-8 py-8 md:py-10">
      <div>
        <Link
          href="/inventory"
          className="text-small text-muted transition hover:text-secondary"
        >
          ← Inventory
        </Link>
        <h1 className="mt-6 text-h1 text-primary">
          {result ? "Your reward" : "Pack details"}
        </h1>
        <p className="mt-3 text-body text-secondary">
          Pack #{pack.id} · {packStatusLabel(pack.status)}
        </p>
      </div>

      {result ? (
        <Card className="text-center">
          <p className="text-small text-muted">You won</p>
          <div className="mt-3 flex justify-center">
            <TierBadge tier={result.tier} />
          </div>
          <p className="mt-4 font-display text-display tabular leading-none text-primary">
            {formatTokenAmount(result.amount)}
            <span className="ml-2 text-[0.55em] font-semibold text-brand">
              {tokenSymbol(result.token)}
            </span>
          </p>
          <p className="mt-3 mono-id break-all text-caption text-muted">
            {result.token}
          </p>
          <p className="sr-only">
            {formatWinHeadline(result.amount, result.token)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/inventory" variant="secondary">
              View in inventory
            </ButtonLink>
            <ButtonLink href={`/machine/${pack.machine_id}`}>
              Open another
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-small text-secondary">
            This pack hasn’t been opened yet, or the reward isn’t available.
          </p>
          <div className="mt-4">
            <ButtonLink href="/inventory">Go to inventory</ButtonLink>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-h3 text-primary">Verification timeline</h2>
        <ol className="mt-4 space-y-3 text-small">
          <li className="flex gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden />
            <div>
              <div className="font-medium text-primary">Bought</div>
              <div className="text-secondary">
                Block {pack.purchased_at_block}
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span
              className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                result ? "bg-success" : "bg-border",
              )}
              aria-hidden
            />
            <div>
              <div className="font-medium text-primary">Block gap</div>
              <div className="text-secondary">
                {result
                  ? `Opened ${Number(result.opened_at_block) - Number(pack.purchased_at_block)} block(s) later`
                  : "Open on a later block than purchase"}
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span
              className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                result ? "bg-success" : "bg-border",
              )}
              aria-hidden
            />
            <div>
              <div className="font-medium text-primary">Opened</div>
              <div className="text-secondary">
                {result
                  ? `Block ${result.opened_at_block}`
                  : "Not opened yet"}
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span
              className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                pack.status === "Delivered" || pack.status === "PendingClaim"
                  ? "bg-success"
                  : "bg-border",
              )}
              aria-hidden
            />
            <div>
              <div className="font-medium text-primary">Paid / claim</div>
              <div className="text-secondary">
                {packStatusLabel(pack.status)}
                {txHash ? (
                  <>
                    {" · "}
                    <a
                      href={explorerTxUrl(txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      Explorer
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        </ol>
      </Card>

      <Card>
        <h2 className="text-h3 text-primary">How was this decided?</h2>
        <p className="mt-2 text-small leading-relaxed text-secondary">
          When you open a pack, the machine picks a rarity using the published
          odds and testnet block data. The result is stored on the blockchain —
          this page only shows what the contract already recorded. It is a
          demo, not a production-secure lottery.
        </p>
      </Card>

      <details className="rounded-lg border border-border bg-raised p-4">
        <summary className="cursor-pointer text-small font-medium text-primary">
          Technical proof (on-chain fields)
        </summary>
        <dl className="mt-4 space-y-0 text-small">
          <Row
            label="Machine id"
            value={String(pack.machine_id)}
            copy={String(pack.machine_id)}
          />
          <Row label="Pack id" value={String(pack.id)} copy={String(pack.id)} />
          <Row label="Status" value={packStatusLabel(pack.status)} />
          <Row
            label="Bought at block"
            value={String(pack.purchased_at_block)}
          />
          <Row
            label="Opened at block"
            value={
              result ? (
                String(result.opened_at_block)
              ) : (
                <Unavailable note="not opened" />
              )
            }
          />
          <Row
            label="random_ref"
            value={randomRef ?? <Unavailable note="set on open" />}
            mono
            copy={randomRef ?? undefined}
          />
          <Row
            label="Tier"
            value={result ? <TierBadge tier={result.tier} /> : <Unavailable />}
          />
          <Row
            label="Reward amount"
            value={
              result ? (
                <span className="tabular">
                  {formatTokenAmount(result.amount)}
                </span>
              ) : (
                <Unavailable />
              )
            }
          />
          <Row
            label="Reward token"
            value={result?.token ?? <Unavailable />}
            mono
            copy={result?.token}
          />
          <Row
            label="Tx hash"
            value={
              txHash ? (
                <a
                  className="break-all text-info underline"
                  href={explorerTxUrl(txHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {txHash}
                </a>
              ) : (
                <Unavailable note="open/claim in-app to capture" />
              )
            }
            mono
            copy={txHash ?? undefined}
          />
        </dl>
      </details>

      <Disclaimer>
        Testnet demo RNG (`env::random_seed`) — not VRF, not production-secure.
        Mainnet needs VRF or an oracle. No audit.
      </Disclaimer>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  copy,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copy?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="flex items-start gap-2 sm:max-w-[65%] sm:justify-end">
        <span
          className={cn(
            mono ? "break-all mono-id text-secondary" : "text-primary",
            "sm:text-right",
          )}
        >
          {value}
        </span>
        {copy && <CopyButton value={copy} iconOnly className="shrink-0" />}
      </dd>
    </div>
  );
}
