import Link from "next/link";
import { GachaIllustration } from "@/components/gacha/gacha-illustration";
import { MachineCard } from "@/components/gacha/machine-card";
import { ClosingCta } from "@/components/home/closing-cta";
import { FaqAccordion } from "@/components/home/faq-accordion";
import { HowBento } from "@/components/home/how-bento";
import { RarityStrip } from "@/components/home/rarity-strip";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { OnboardingChecklist } from "@/components/ux/onboarding-checklist";
import { getConfig, listMachines } from "@/lib/contract/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let machines: Awaited<ReturnType<typeof listMachines>> = [];
  let allActive = 0;
  let loadError: string | null = null;

  try {
    const [list] = await Promise.all([listMachines(0, 50), getConfig()]);
    const active = list.filter((m) => m.status === "Active");
    allActive = active.length;
    machines = active.slice(0, 3);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const featured = machines[0] ?? null;

  return (
    <div className="space-y-16 pb-8 md:space-y-24">
      <OnboardingChecklist />

      <section className="relative grid items-center gap-10 lg:grid-cols-2">
        <HeroBackdrop />
        <FadeIn>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-subtle px-3 py-1.5 text-caption text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-info" aria-hidden />
            Testnet demo · free test tokens · not real money
          </div>
          <h1 className="mt-4 text-display text-primary">
            Mystery packs.{" "}
            <span className="text-gradient">On-chain odds.</span>
          </h1>
          <p className="mt-4 max-w-xl prose-narrow text-body text-secondary">
            Buy a pack, wait one block, open it, and receive FT rewards — with
            odds and inventory published on NEAR.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/explore">
              <Button size="lg">Explore machines</Button>
            </Link>
            <Link href="/#how">
              <Button variant="secondary" size="lg">
                How it works
              </Button>
            </Link>
          </div>
          {allActive > 0 ? (
            <p className="mt-4 text-caption text-muted">
              <span className="tabular text-secondary">{allActive}</span> active
              machine{allActive === 1 ? "" : "s"} on testnet right now.
            </p>
          ) : (
            <p className="mt-4 text-caption text-muted">
              Connect a NEAR testnet wallet, then use free demo tokens — not real
              money.
            </p>
          )}
        </FadeIn>
        <FadeIn delay={0.08} y={12}>
          <div className="relative mx-auto h-[320px] w-full max-w-md sm:h-[380px]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-6 rounded-full bg-brand/10 blur-3xl"
            />
            <GachaIllustration className="relative h-full w-full animate-floaty" />
          </div>
        </FadeIn>
      </section>

      <Disclaimer>
        <strong className="font-medium text-primary">Is this real money?</strong>{" "}
        No — testnet demo with test tokens only. Pack outcomes use testnet block
        randomness (not VRF); block producers can influence it. Mainnet would need
        VRF or an oracle. No audit.
      </Disclaimer>

      <HowBento />

      {featured ? <RarityStrip machine={featured} /> : null}

      <section>
        <FadeIn>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-h2 text-primary">Featured machines</h2>
              <p className="mt-1 text-small text-secondary">
                Live Active machines from the contract.
              </p>
            </div>
            <Link
              href="/explore"
              className="min-h-11 text-small text-brand transition hover:text-brand-hover"
            >
              View all →
            </Link>
          </div>
        </FadeIn>
        {loadError && (
          <ErrorPanel
            className="mt-4"
            message="We couldn’t load machines. Check your connection and try again."
          />
        )}
        {!loadError && machines.length === 0 && (
          <EmptyState
            className="mt-4"
            title="No active machines yet"
            description="Create one, or check back after seeding."
            action={
              <Link href="/create">
                <Button>Create a machine</Button>
              </Link>
            }
          />
        )}
        <Stagger className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((m) => (
            <StaggerItem key={m.id}>
              <MachineCard machine={m} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section id="faq" className="scroll-mt-24">
        <FadeIn>
          <h2 className="text-h2 text-primary">FAQ</h2>
          <p className="mt-1 text-small text-secondary">
            Straight answers for first-time visitors.
          </p>
        </FadeIn>
        <div className="mt-6">
          <FaqAccordion />
        </div>
      </section>

      <ClosingCta />
    </div>
  );
}
