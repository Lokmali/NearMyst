import { cn } from "@/lib/utils";
import type { MachineStatus, Tier } from "@/lib/types";
import { rarityClass } from "@/lib/rarity";

export function StatusBadge({ status }: { status: MachineStatus }) {
  const map: Record<MachineStatus, { cls: string; dot: string }> = {
    Active: {
      cls: "bg-success-tint text-success border-success/25",
      dot: "bg-success",
    },
    Paused: {
      cls: "bg-warning-tint text-warning border-warning/25",
      dot: "bg-warning",
    },
    Draft: {
      cls: "bg-subtle text-secondary border-border",
      dot: "bg-muted",
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-medium tracking-wide",
        s.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden />
      {status}
    </span>
  );
}

const TIER_MARK: Record<Tier, string> = {
  Common: "●",
  Rare: "◆",
  Epic: "★",
  Legendary: "✦",
  Mythic: "◈",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-semibold tracking-wide",
        rarityClass(tier, "bg"),
      )}
      title={tier}
    >
      <span aria-hidden className="text-[10px] opacity-90">
        {TIER_MARK[tier]}
      </span>
      {tier}
    </span>
  );
}
