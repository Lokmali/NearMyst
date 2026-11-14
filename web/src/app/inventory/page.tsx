"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge, StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  GAS_CLAIM_PENDING,
  GAS_OPEN_PACK,
  getPack,
  getPackResult,
  getUserPacks,
  listMachines,
  mapPool,
} from "@/lib/contract/client";
import { GACHA_CONTRACT, explorerTxUrl } from "@/lib/config";
import { formatTokenAmount, shortenAccount } from "@/lib/format";
import { extractTxHash, rememberPackTx } from "@/lib/tx";
import type { MachineView, Pack, PackResult } from "@/lib/types";
import {
  CreatorControls,
  PlatformFeePanel,
} from "@/components/gacha/creator-controls";
import { getConfig } from "@/lib/contract/client";
import type { PlatformConfig } from "@/lib/types";
import { humanError, packStatusLabel } from "@/lib/ux-copy";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";

type PackRow = {
  pack: Pack;
  result: PackResult | null;
};

const PACK_PAGE = 40;
const MACHINE_PAGE = 50;

export default function InventoryPage() {
  const { signedAccountId, signIn, callFunction } = useWalletSelector();
  const [rows, setRows] = useState<PackRow[]>([]);
  const [created, setCreated] = useState<MachineView[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [tab, setTab] = useState("unopened");
  const [packOffset, setPackOffset] = useState(0);
  const [machineOffset, setMachineOffset] = useState(0);
  const [hasMorePacks, setHasMorePacks] = useState(false);
  const [hasMoreMachines, setHasMoreMachines] = useState(false);

  const loadPackPage = useCallback(
    async (account: string, from: number, append: boolean) => {
      const ids = await getUserPacks(account, from, PACK_PAGE);
      setHasMorePacks(ids.length === PACK_PAGE);
      const packs = await mapPool(ids, 8, (id) => getPack(id));
      const needResults = packs.filter(
        (p): p is Pack => !!p && p.status !== "Unopened",
      );
      const results = await mapPool(needResults, 8, (p) => getPackResult(p.id));
      const resultById = new Map(
        needResults.map((p, i) => [p.id, results[i]] as const),
      );
      const detailed: PackRow[] = [];
      for (const p of packs) {
        if (!p) continue;
        detailed.push({
          pack: p,
          result: resultById.get(p.id) ?? null,
        });
      }
      detailed.sort((a, b) => b.pack.id - a.pack.id);
      setRows((prev) => (append ? [...prev, ...detailed] : detailed));
      setPackOffset(from + ids.length);
    },
    [],
  );

  const loadMachinePage = useCallback(
    async (account: string, from: number, append: boolean) => {
      const machines = await listMachines(from, MACHINE_PAGE);
      setHasMoreMachines(machines.length === MACHINE_PAGE);
      const mine = machines.filter((m) => m.creator === account);
      setCreated((prev) => (append ? [...prev, ...mine] : mine));
      setMachineOffset(from + machines.length);
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!signedAccountId) {
      setRows([]);
      setCreated([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cfg = await getConfig().catch(() => null);
      setConfig(cfg);
      await Promise.all([
        loadPackPage(signedAccountId, 0, false),
        loadMachinePage(signedAccountId, 0, false),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [signedAccountId, loadPackPage, loadMachinePage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function loadMorePacks() {
    if (!signedAccountId || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadPackPage(signedAccountId, packOffset, true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadMoreMachines() {
    if (!signedAccountId || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadMachinePage(signedAccountId, machineOffset, true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }

  async function onOpen(packId: number) {
    if (!signedAccountId) {
      signIn();
      return;
    }
    setBusy(`open-${packId}`);
    try {
      const outcome = await callFunction({
        contractId: GACHA_CONTRACT,
        method: "open_pack",
        args: { pack_id: packId },
        gas: GAS_OPEN_PACK,
        deposit: "0",
      });
      const hash = extractTxHash(outcome);
      if (hash) {
        setLastTx(hash);
        rememberPackTx(packId, hash);
      }
      toast.success(`Opening pack #${packId}…`);
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const res = await getPackResult(packId);
        if (res) break;
      }
      await refresh();
    } catch (e) {
      const friendly = humanError(e instanceof Error ? e.message : String(e));
      toast.error(friendly.title);
    } finally {
      setBusy(null);
    }
  }

  async function onClaim(packId: number) {
    if (!signedAccountId) {
      signIn();
      return;
    }
    setBusy(`claim-${packId}`);
    try {
      const outcome = await callFunction({
        contractId: GACHA_CONTRACT,
        method: "claim_pending",
        args: { pack_id: packId },
        gas: GAS_CLAIM_PENDING,
        deposit: "0",
      });
      const hash = extractTxHash(outcome);
      if (hash) {
        setLastTx(hash);
        rememberPackTx(packId, hash);
      }
      toast.success("Claim submitted — reward should arrive shortly");
      await refresh();
    } catch (e) {
      const friendly = humanError(e instanceof Error ? e.message : String(e));
      toast.error(friendly.title);
    } finally {
      setBusy(null);
    }
  }

  const unopened = rows.filter((r) => r.pack.status === "Unopened");
  const pending = rows.filter((r) => r.pack.status === "PendingClaim");
  const opened = rows.filter(
    (r) =>
      r.pack.status === "Opened" ||
      r.pack.status === "Delivered" ||
      r.pack.status === "PendingClaim",
  );

  return (
    <div className="page-wrap space-y-8 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 text-primary">Your inventory</h1>
          <p className="mt-3 max-w-xl text-body text-secondary">
            Open packs, claim rewards waiting for you, and manage machines you
            created.
          </p>
        </div>
        {signedAccountId && (
          <Button variant="secondary" onClick={() => void refresh()}>
            Refresh
          </Button>
        )}
      </div>

      {!signedAccountId && (
        <EmptyState
          title="Connect your wallet"
          description="A wallet is your login for NEAR. Once connected, your packs and machines appear here."
          action={<ConnectWalletButton size="md" />}
        />
      )}

      {error && (
        <ErrorPanel message="We couldn’t load your inventory. Check your connection and refresh." />
      )}

      {lastTx && (
        <a
          className="block text-small text-info underline"
          href={explorerTxUrl(lastTx)}
          target="_blank"
          rel="noreferrer"
        >
          Last tx {lastTx.slice(0, 14)}… on explorer
        </a>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {signedAccountId && !loading && (
        <>
          <Tabs
            value={tab}
            onChange={setTab}
            layoutId="inventory-tabs"
            tabs={[
              { id: "unopened", label: "Ready", count: unopened.length },
              { id: "pending", label: "Waiting", count: pending.length },
              { id: "opened", label: "Opened", count: opened.length },
              { id: "machines", label: "Machines", count: created.length },
            ]}
          />

          {tab === "unopened" && (
            <section className="mt-6 space-y-3" role="tabpanel">
              {unopened.length === 0 && (
                <EmptyState
                  title="No packs ready to open"
                  description="Buy a pack from Explore to get started."
                  action={
                    <ButtonLink href="/explore">Explore machines</ButtonLink>
                  }
                />
              )}
              {unopened.map(({ pack }) => (
                <Card
                  key={pack.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="text-small">
                    <span className="font-medium text-primary">
                      Pack #{pack.id}
                    </span>
                    <span className="ml-2 text-muted">
                      {packStatusLabel(pack.status)} · machine{" "}
                      <Link
                        className="text-brand underline"
                        href={`/machine/${pack.machine_id}`}
                      >
                        #{pack.machine_id}
                      </Link>
                    </span>
                  </div>
                  <Button
                    loading={busy === `open-${pack.id}`}
                    disabled={!!busy}
                    onClick={() => void onOpen(pack.id)}
                  >
                    Open
                  </Button>
                </Card>
              ))}
              {hasMorePacks && (
                <Button
                  variant="secondary"
                  loading={loadingMore}
                  onClick={() => void loadMorePacks()}
                >
                  Load more packs
                </Button>
              )}
            </section>
          )}

          {tab === "pending" && (
            <section className="mt-6 space-y-3" role="tabpanel">
              {pending.length === 0 && (
                <EmptyState
                  title="No rewards waiting"
                  description="If a payout needs a retry, it will show up here."
                />
              )}
              {pending.map(({ pack, result }) => (
                <Card
                  key={pack.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-warning/25 bg-warning-tint py-4"
                >
                  <div className="text-small">
                    <span className="font-medium text-primary">
                      Pack #{pack.id}
                    </span>
                    <span className="ml-2 text-muted">
                      Reward waiting for you
                    </span>
                    {result && (
                      <span className="ml-2 inline-flex items-center gap-2">
                        <TierBadge tier={result.tier} />
                        <span className="tabular text-primary">
                          {formatTokenAmount(result.amount)} tokens
                        </span>
                      </span>
                    )}
                    <Link
                      className="ml-2 text-caption text-brand underline"
                      href={`/result/${pack.id}`}
                    >
                      Details
                    </Link>
                  </div>
                  <Button
                    loading={busy === `claim-${pack.id}`}
                    disabled={!!busy}
                    onClick={() => void onClaim(pack.id)}
                  >
                    Claim
                  </Button>
                </Card>
              ))}
            </section>
          )}

          {tab === "opened" && (
            <section className="mt-6 space-y-3" role="tabpanel">
              {opened.length === 0 && (
                <EmptyState
                  title="No opened packs yet"
                  description="Open a pack to see your rewards here."
                  action={
                    <ButtonLink href="/explore" variant="secondary">
                      Explore machines
                    </ButtonLink>
                  }
                />
              )}
              {opened.map(({ pack, result }) => (
                <Card
                  key={pack.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 text-small"
                >
                  <div>
                    <span className="font-medium text-primary">
                      Pack #{pack.id}
                    </span>
                    <span className="ml-2 text-muted">
                      {packStatusLabel(pack.status)}
                    </span>
                    {result && (
                      <span className="ml-2 inline-flex flex-wrap items-center gap-2">
                        <TierBadge tier={result.tier} />
                        <span className="tabular text-primary">
                          {formatTokenAmount(result.amount)} tokens
                        </span>
                        <span className="mono-id text-muted">
                          {shortenAccount(result.token, 8, 6)}
                        </span>
                        <CopyButton
                          value={result.token}
                          iconOnly
                          label="Copy token"
                        />
                      </span>
                    )}
                  </div>
                  <Link
                    className="text-brand underline"
                    href={`/result/${pack.id}`}
                  >
                    View
                  </Link>
                </Card>
              ))}
            </section>
          )}

          {tab === "machines" && (
            <section className="mt-6 space-y-4" role="tabpanel">
              {created.length === 0 && (
                <EmptyState
                  title="No machines yet"
                  description="Create a machine to manage pause and earnings here."
                  action={
                    <ButtonLink href="/create">Create machine</ButtonLink>
                  }
                />
              )}
              {created.map((m) => (
                <div key={m.id} className="space-y-3">
                  <Card className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <Link
                        href={`/machine/${m.id}`}
                        className="text-h3 text-primary transition hover:text-brand-hover"
                      >
                        #{m.id} {m.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-muted">
                        <StatusBadge status={m.status} />
                        <span>
                          Earnings{" "}
                          <span className="tabular text-secondary">
                            {formatTokenAmount(m.creator_earnings)} tokens
                          </span>
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/machine/${m.id}`}
                      className="text-small text-brand underline"
                    >
                      Manage
                    </Link>
                  </Card>
                  <CreatorControls
                    machine={m}
                    onUpdated={(updated) =>
                      setCreated((list) =>
                        list.map((x) => (x.id === updated.id ? updated : x)),
                      )
                    }
                  />
                  <PlatformFeePanel
                    machine={m}
                    config={config}
                    onUpdated={(updated) =>
                      setCreated((list) =>
                        list.map((x) => (x.id === updated.id ? updated : x)),
                      )
                    }
                  />
                </div>
              ))}
              {hasMoreMachines && (
                <Button
                  variant="secondary"
                  loading={loadingMore}
                  onClick={() => void loadMoreMachines()}
                >
                  Load more machines
                </Button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
