"use client";

import {
  Boxes,
  Coins,
  Eye,
  PackageOpen,
  Sparkles,
  Timer,
} from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";

/** Ordered buy→open flow — numbers stay because the sequence is the product. */
const STEPS = [
  {
    icon: Boxes,
    title: "Pick a machine",
    body: "Browse Active machines with published odds and inventory-backed prizes.",
  },
  {
    icon: Coins,
    title: "Buy a pack",
    body: "Pay with demo FT. Cap: 50 packs per purchase.",
  },
  {
    icon: Timer,
    title: "Wait one block",
    body: "Open on a later block than purchase — a fairness gap for testnet RNG.",
  },
  {
    icon: PackageOpen,
    title: "Open and reveal",
    body: "The mystery trunk shakes, opens on-chain, and shows your FT reward — or a claimable pending state.",
  },
  {
    icon: Eye,
    title: "Verify on-chain",
    body: "Check tier, amount, random_ref, and explorer links — no fake proofs.",
  },
  {
    icon: Sparkles,
    title: "Creators fund prizes",
    body: "Rewards are deposited before activation so every pack can pay out.",
  },
] as const;

export function HowBento() {
  return (
    <section id="how" className="scroll-mt-24">
      <FadeIn>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2 text-primary">How it works</h2>
          <p className="mt-3 text-body text-secondary">
            Six steps. You approve every wallet action.
          </p>
        </div>
      </FadeIn>
      <ol className="mt-12 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {STEPS.map((t, i) => (
          <li
            key={t.title}
            className="rounded-[var(--radius-md)] border border-border bg-raised p-6 text-left shadow-card transition duration-fast hover:border-border-strong"
          >
            <div className="flex items-center gap-3 text-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-subtle font-display text-small tabular text-brand">
                {String(i + 1).padStart(2, "0")}
              </span>
              <t.icon className="h-4 w-4 text-brand" strokeWidth={1.75} aria-hidden />
            </div>
            <h3 className="mt-5 text-h3 text-primary">{t.title}</h3>
            <p className="mt-2 text-small leading-relaxed text-secondary">{t.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
