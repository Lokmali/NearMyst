import type { MachineView } from "@/lib/types";
import { oddsRows } from "@/lib/odds";
import { TierBadge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/fade-in";

export function RarityStrip({ machine }: { machine: MachineView }) {
  const rows = oddsRows(machine.tiers).filter((r) => r.probability_bps > 0);

  return (
    <section aria-labelledby="what-win-heading">
      <FadeIn>
        <h2 id="what-win-heading" className="text-h2 text-primary">
          What can I win?
        </h2>
        <p className="mt-1 text-small text-secondary">
          Real odds from featured machine #{machine.id} — label + percentage, not
          color alone.
        </p>
      </FadeIn>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li
            key={r.tier}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-raised px-4 py-3 shadow-card"
          >
            <div className="flex min-w-0 items-center gap-2">
              <TierBadge tier={r.tier} />
              <span className="truncate text-small text-primary">{r.tier}</span>
            </div>
            <span className="tabular text-small font-medium text-secondary">
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
