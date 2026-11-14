"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { MachineView, PlatformConfig } from "@/lib/types";
import { formatTokenAmount, tokenSymbol } from "@/lib/format";
import { oddsRows } from "@/lib/odds";
import { TierBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { rarityClass } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion";

export function OddsTable({
  machine,
  config,
}: {
  machine: MachineView;
  config: PlatformConfig | null;
}) {
  const { reduced } = useMotionPreference();
  const [tab, setTab] = useState("odds");
  const denom = config?.probability_denominator ?? 10_000;
  const rows = oddsRows(machine.tiers, denom);

  return (
    <div className="space-y-4">
      <Tabs
        layoutId="machine-detail-tabs"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "odds", label: "Odds" },
          { id: "rewards", label: "Rewards", count: machine.rewards.length },
          { id: "fees", label: "Fees" },
        ]}
      />

      {tab === "odds" && (
        <Card>
          <h3 className="text-h3 text-primary">What can I win?</h3>
          <p className="mt-1 text-small text-secondary">
            Each pack rolls one rarity. Bars show the chance — higher bar means
            more common. Figures come from the machine on-chain.
          </p>
          <div className="mt-5 space-y-4">
            {rows.map((r) => (
              <div key={r.tier} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <TierBadge tier={r.tier} />
                  <div className="text-right text-small">
                    <div className={cn("font-semibold tabular", rarityClass(r.tier))}>
                      {r.label}
                    </div>
                    <div className="text-caption tabular text-muted">
                      {r.label} chance
                    </div>
                  </div>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-subtle"
                  role="progressbar"
                  aria-valuenow={Number(r.percent.toFixed(2))}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${r.tier} odds`}
                >
                  <motion.div
                    className={cn("h-full rounded-full", rarityClass(r.tier, "bar"))}
                    initial={reduced ? false : { width: 0 }}
                    whileInView={{ width: `${r.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: duration.slow, ease: ease.out }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "rewards" && (
        <Card>
          <h3 className="text-h3 text-primary">Reward inventory</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-small">
              <thead className="text-caption uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Tier</th>
                  <th className="pb-2 pr-3 font-medium">Amount</th>
                  <th className="pb-2 pr-3 font-medium">Remaining</th>
                  <th className="pb-2 font-medium">Token</th>
                </tr>
              </thead>
              <tbody>
                {machine.rewards.map((r) => (
                  <tr key={r.id} className="border-t border-border text-secondary">
                    <td className="py-3 pr-3">
                      <TierBadge tier={r.tier} />
                    </td>
                    <td className="py-3 pr-3 tabular text-primary">
                      {formatTokenAmount(r.amount_per_win)}{" "}
                      {tokenSymbol(r.token)}
                    </td>
                    <td className="py-3 pr-3 tabular">
                      {r.quantity_remaining}/{r.quantity_deposited}
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-secondary">
                        {tokenSymbol(r.token)}
                      </span>
                      <span className="ml-1.5 mono-id text-muted">{r.token}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "fees" && (
        <Card className="text-small">
          <h3 className="text-h3 text-primary">Fee breakdown</h3>
          {config ? (
            <>
              <p className="mt-3 text-secondary">
                Platform fee:{" "}
                <span className="font-semibold tabular text-primary">
                  {(config.platform_fee_bps / 100).toFixed(2)}%
                </span>{" "}
                ({config.platform_fee_bps} bps) from{" "}
                <code className="mono-id text-muted">get_config</code>.
              </p>
              <p className="mt-1 text-caption text-muted">
                Fee receiver: {config.fee_receiver}
              </p>
              <p className="mt-3 text-secondary">
                Creator receives the remainder after the platform fee on each purchase.
              </p>
            </>
          ) : (
            <p className="mt-3 text-muted">Config unavailable.</p>
          )}
        </Card>
      )}
    </div>
  );
}
