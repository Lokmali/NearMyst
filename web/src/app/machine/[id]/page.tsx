"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import { OddsTable } from "@/components/gacha/odds-table";
import {
  CreatorControls,
  PlatformFeePanel,
} from "@/components/gacha/creator-controls";
import { StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Disclaimer } from "@/components/ui/disclaimer";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Stat } from "@/components/ui/stat";
import { CopyButton } from "@/components/ui/copy-button";
import { Capsule } from "@/components/brand/capsule";
import { FadeIn } from "@/components/motion/fade-in";
import { getConfig, getMachine } from "@/lib/contract/client";
import { formatTokenAmount, shortenAccount, tokenSymbol } from "@/lib/format";
import { highestTier } from "@/lib/odds";
import type { MachineView, PlatformConfig } from "@/lib/types";

const MachineActions = dynamic(
  () =>
    import("@/components/gacha/machine-actions").then((m) => m.MachineActions),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  },
);

export default function MachineDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [machine, setMachine] = useState<MachineView | null>(null);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!Number.isInteger(id) || id < 1) {
        setError("Invalid machine id");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [m, c] = await Promise.all([getMachine(id), getConfig()]);
        if (cancelled) return;
        if (!m) {
          setError(`Machine #${id} not found on contract`);
          setMachine(null);
        } else {
          setMachine(m);
          setConfig(c);
          const url = m.image_url ?? "";
          const badPlaceholder =
            !url ||
            url.includes("example.com") ||
            url.includes(".example/");
          setImgFailed(badPlaceholder);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setMachine(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page-wrap space-y-4 py-8 md:py-10">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="page-wrap py-8 md:py-10">
        <ErrorPanel
          message={error ?? "Machine unavailable"}
          action={
            <Link href="/explore" className="text-small text-brand underline">
              ← Back to explore
            </Link>
          }
        />
      </div>
    );
  }

  const top = highestTier(machine);

  return (
    <div className="page-wrap space-y-10 py-8 md:py-10">
      <FadeIn>
        <nav className="text-caption text-muted">
          <Link href="/explore" className="hover:text-secondary">
            Explore
          </Link>
          <span className="mx-2">/</span>
          <span className="text-secondary">{machine.name}</span>
        </nav>

        <div className="mt-6 grid items-center gap-8 lg:grid-cols-12">
          <div className="relative flex min-h-[220px] items-center justify-center lg:col-span-5">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-4 rounded-[40%] opacity-70 shadow-[inset_0_0_60px_rgba(224,184,74,0.22)]"
            />
            {!imgFailed && machine.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={machine.image_url}
                alt=""
                className="relative z-[1] max-h-64 w-auto max-w-full object-contain"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <Capsule
                size="xl"
                tier={top ?? undefined}
                className="relative z-[1] scale-[1.65]"
              />
            )}
          </div>
          <div className="min-w-0 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h1 text-primary">{machine.name}</h1>
              <StatusBadge status={machine.status} />
            </div>
            <p className="mt-3 max-w-2xl prose-narrow text-body text-secondary">
              {machine.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-caption text-muted">
              <span>Made by</span>
              <span className="mono-id text-secondary">
                {shortenAccount(machine.creator, 6, 10)}
              </span>
              <CopyButton value={machine.creator} iconOnly label="Copy creator" />
              <span className="text-border-strong">·</span>
              <span>Pays with</span>
              <span className="font-medium text-secondary">
                {tokenSymbol(machine.payment_token)}
              </span>
              <span className="mono-id text-muted">{machine.payment_token}</span>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Price"
                value={`${formatTokenAmount(machine.pack_price)} ${tokenSymbol(machine.payment_token)}`}
              />
              <Stat
                label="Packs left"
                value={`${machine.packs_remaining}/${machine.max_packs}`}
              />
              <Stat label="Sold" value={machine.packs_sold} />
              <Stat label="Total packs" value={machine.max_packs} />
            </div>
          </div>
        </div>
      </FadeIn>

      <Disclaimer>
        Testnet only — not real money. Opens use `env::random_seed` (not VRF);
        outcomes are not production-secure. Mainnet needs VRF/oracle. Reveal shows
        only what the contract returns.
      </Disclaimer>

      <div className="space-y-4">
        <CreatorControls machine={machine} onUpdated={(m) => setMachine(m)} />
        <PlatformFeePanel
          machine={machine}
          config={config}
          onUpdated={(m) => setMachine(m)}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <FadeIn delay={0.04}>
            <OddsTable machine={machine} config={config} />
          </FadeIn>
        </div>
        <FadeIn delay={0.08}>
          <MachineActions machine={machine} config={config} />
        </FadeIn>
      </div>
    </div>
  );
}
