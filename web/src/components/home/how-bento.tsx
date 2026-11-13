"use client";

import {
  Boxes,
  Coins,
  Eye,
  PackageOpen,
  Sparkles,
  Timer,
} from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

const TILES = [
  {
    icon: Boxes,
    title: "Pick a machine",
    body: "Browse Active machines with published odds and inventory-backed prizes.",
    span: "md:col-span-2",
  },
  {
    icon: Coins,
    title: "Buy a pack",
    body: "Pay with demo FT. Cap: 50 packs per purchase.",
    span: "",
  },
  {
    icon: Timer,
    title: "Wait one block",
    body: "Open on a later block than purchase — a simple fairness gap for testnet RNG.",
    span: "",
  },
  {
    icon: PackageOpen,
    title: "Open and reveal",
    body: "The capsule opens on-chain. You get an FT reward (or a claimable pending state).",
    span: "md:col-span-2",
  },
  {
    icon: Eye,
    title: "Verify on-chain",
    body: "Check tier, amount, random_ref, and explorer links — no fake proofs.",
    span: "",
  },
  {
    icon: Sparkles,
    title: "Creators fund prizes",
    body: "Rewards are deposited before activation so every pack can pay out.",
    span: "md:col-span-2",
  },
] as const;

export function HowBento() {
  return (
    <section id="how" className="scroll-mt-24">
      <FadeIn>
        <h2 className="text-h2 text-primary">How it works</h2>
        <p className="mt-1 max-w-2xl prose-narrow text-small text-secondary">
          Six clear steps. You approve every wallet action.
        </p>
      </FadeIn>
      <Stagger className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {TILES.map((t) => (
          <StaggerItem key={t.title} className={cn(t.span)}>
            <article
              className={cn(
                "group h-full rounded-lg border border-border bg-raised p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-border-strong",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-subtle text-brand transition group-hover:border-brand/40">
                <t.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-4 text-h3 text-primary">{t.title}</h3>
              <p className="mt-2 text-small leading-relaxed text-secondary">
                {t.body}
              </p>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
