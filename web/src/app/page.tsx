import Image from "next/image";
import Link from "next/link";
import { MachineCard } from "@/components/gacha/machine-card";
import { FaqAccordion } from "@/components/home/faq-accordion";
import { HowBento } from "@/components/home/how-bento";
import { RarityStrip } from "@/components/home/rarity-strip";
import { ClosingCta } from "@/components/home/closing-cta";
import { ButtonLink } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { FadeIn } from "@/components/motion/fade-in";
import { IrisSection } from "@/components/motion/iris-section";
import { CounterRolls } from "@/components/motion/counter-rolls";
import { OnboardingChecklist } from "@/components/ux/onboarding-checklist";
import { getConfig, listMachines } from "@/lib/contract/client";

export const dynamic = "force-dynamic";

/**
 * Near.com-style structure: brand → one line → CTAs → one product panel.
 * Theme stays brass lottery-night.
 */
export default async function HomePage() {
  let machines: Awaited<ReturnType<typeof listMachines>> = [];
  let allActive = 0;
  let packsLeft = 0;
  let loadError: string | null = null;

  try {
    const [list] = await Promise.all([listMachines(0, 50), getConfig()]);
    const active = list.filter((m) => m.status === "Active");
    allActive = active.length;
    packsLeft = active.reduce((sum, m) => sum + m.packs_remaining, 0);
    machines = active.slice(0, 3);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const featured = machines[0] ?? null;

  return (
    <>
      <section className="relative" data-enter>
        <div className="page-wrap flex flex-col items-center pb-4 pt-4 text-center md:pb-6 md:pt-6">
          <Image
            src="/brand/logo-v2.png"
            alt=""
            width={88}
            height={88}
            priority
            className="mb-5 h-20 w-20 rounded-2xl object-cover border border-brand/70 md:mb-6 md:h-[5.5rem] md:w-[5.5rem]"
            aria-hidden
          />
          <h1 className="max-w-[14ch] text-display text-primary">NearMyst</h1>
          <p className="mx-auto mt-4 max-w-xl text-body text-secondary md:mt-5 md:text-[1.0625rem] md:leading-7">
            Buy a pack, wait one block, shake open the mystery trunk, and take
            the FT reward — odds and inventory on-chain. Free demo tokens. Not
            real money.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/explore" size="lg">
              Explore machines
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary" size="lg">
              How it works
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="page-wrap space-y-6 pb-10 pt-4 md:space-y-8 md:pb-12 md:pt-5">
        <Disclaimer>
          <strong className="mb-1 block font-medium text-primary sm:mb-0 sm:inline">
            Is this real money?
          </strong>{" "}
          <span className="text-secondary">
            No — testnet demo with test tokens only. Pack outcomes use testnet
            block randomness (not VRF); block producers can influence it.
            Mainnet would need VRF or an oracle. No audit.
          </span>
        </Disclaimer>
        <OnboardingChecklist />
        <p className="text-body text-secondary">
          Live on testnet:{" "}
          <span className="text-primary">
            <CounterRolls value={allActive} /> active machine
            {allActive === 1 ? "" : "s"}
          </span>
          {" · "}
          <span className="text-primary">
            <CounterRolls value={packsLeft} /> packs remaining
          </span>
          .
        </p>
      </div>

      <div className="page-wrap py-16 md:py-24">
        <HowBento />
      </div>

      {featured ? (
        <div className="page-wrap py-16 md:py-20">
          <RarityStrip machine={featured} />
        </div>
      ) : null}

      <IrisSection id="featured">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-h2 text-primary">Featured machines</h2>
            <p className="mt-2 text-small text-secondary">
              Active machines from the contract.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center text-small font-medium text-brand hover:text-brand-hover"
          >
            View all
          </Link>
        </div>
        {loadError ? (
          <ErrorPanel
            className="mt-8"
            message="We couldn’t load machines. Check your connection and try again."
          />
        ) : null}
        {!loadError && machines.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="No active machines yet"
            description="Create one, or check back after seeding."
            action={
              <ButtonLink href="/create">Create a machine</ButtonLink>
            }
          />
        ) : null}
        {!loadError && machines.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {machines.map((m) => (
              <MachineCard key={m.id} machine={m} />
            ))}
          </div>
        ) : null}
      </IrisSection>

      <section id="faq" className="page-wrap scroll-mt-24 py-16 md:py-24">
        <FadeIn>
          <h2 className="text-h2 text-primary">FAQ</h2>
          <p className="mt-2 text-small text-secondary">
            Straight answers for first-time visitors.
          </p>
        </FadeIn>
        <div className="mt-8 max-w-3xl">
          <FaqAccordion />
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
