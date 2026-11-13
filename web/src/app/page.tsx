import Link from "next/link";
import { GachaIllustration } from "@/components/gacha/gacha-illustration";
import { MachineCard } from "@/components/gacha/machine-card";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { OnboardingChecklist } from "@/components/ux/onboarding-checklist";
import { getConfig, listMachines } from "@/lib/contract/client";
import { Wallet, Package, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let machines: Awaited<ReturnType<typeof listMachines>> = [];
  let loadError: string | null = null;

  try {
    const [list] = await Promise.all([listMachines(0, 6), getConfig()]);
    machines = list.filter((m) => m.status === "Active").slice(0, 3);
    if (machines.length === 0) machines = list.slice(0, 3);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const steps = [
    {
      n: "1",
      icon: Wallet,
      t: "Connect a wallet",
      d: "A wallet is your login for NEAR. You’ll approve each action in it — nothing happens without your OK.",
    },
    {
      n: "2",
      icon: Package,
      t: "Pick a machine",
      d: "Choose a mystery pack machine, check the odds, and buy a pack with test tokens.",
    },
    {
      n: "3",
      icon: Sparkles,
      t: "Open your pack",
      d: "Wait a moment, open the pack, and see your reward. Results come from the blockchain — not a fake spin.",
    },
  ];

  return (
    <div className="space-y-16 pb-8 md:space-y-24">
      <OnboardingChecklist />

      <section className="relative grid items-center gap-10 lg:grid-cols-2">
        <HeroBackdrop />
        <FadeIn>
          <p className="text-eyebrow">NearMyst · NEAR testnet demo</p>
          <h1 className="mt-3 text-display text-primary">
            Mystery packs.{" "}
            <span className="text-gradient">On-chain odds.</span>
          </h1>
          <p className="mt-4 max-w-xl prose-narrow text-body text-secondary">
            NearMyst lets you buy mystery packs and open them for token rewards.
            Creators fund the prizes up front so every pack can pay out.
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
          <p className="mt-4 text-caption text-muted">
            New to crypto? You’ll connect a NEAR wallet (like a secure login), then
            use free test tokens — not real money.
          </p>
        </FadeIn>
        <FadeIn delay={0.08} y={12}>
          <div className="mx-auto h-[320px] w-full max-w-md sm:h-[380px]">
            <GachaIllustration className="h-full w-full" />
          </div>
        </FadeIn>
      </section>

      <Disclaimer>
        <strong className="font-medium text-primary">Is this real money?</strong>{" "}
        No — testnet demo with test tokens only. Pack outcomes use testnet block
        randomness (not VRF); block producers can influence it. Mainnet would need
        VRF or an oracle. No audit.
      </Disclaimer>

      <section id="how" className="scroll-mt-24">
        <FadeIn>
          <h2 className="text-h2 text-primary">How it works</h2>
          <p className="mt-1 max-w-2xl prose-narrow text-small text-secondary">
            Three steps. You approve each one in your wallet.
          </p>
        </FadeIn>
        <Stagger className="relative mt-8 grid gap-6 sm:grid-cols-3">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-border sm:block"
          />
          {steps.map((step) => (
            <StaggerItem key={step.n}>
              <div className="relative h-full rounded-lg border border-border bg-raised p-5 shadow-card md:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-subtle text-brand">
                  <step.icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="mt-4 text-eyebrow text-muted">Step {step.n}</div>
                <h3 className="mt-2 text-h3 text-primary">{step.t}</h3>
                <p className="mt-2 text-small leading-relaxed text-secondary">
                  {step.d}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section>
        <FadeIn>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-h2 text-primary">Try a machine</h2>
              <p className="mt-1 text-small text-secondary">
                Live machines from the contract — pick one and buy a pack.
              </p>
            </div>
            <Link
              href="/explore"
              className="text-small text-brand transition hover:text-brand-hover"
            >
              View all →
            </Link>
          </div>
        </FadeIn>
        {loadError && (
          <ErrorPanel
            className="mt-4"
            message={`We couldn’t load machines. Check your connection and try again.`}
          />
        )}
        {!loadError && machines.length === 0 && (
          <EmptyState
            className="mt-4"
            title="No machines yet"
            description="Be the first to create one, or check back soon."
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
    </div>
  );
}
