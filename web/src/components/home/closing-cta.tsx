import { ButtonLink } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";

/** Single closing CTA for home — full-bleed raised band (same as former Open. strip). */
export function ClosingCta() {
  return (
    <section className="border-y border-border bg-raised/30 backdrop-blur-sm">
      <div className="page-wrap flex flex-col items-center gap-8 py-16 text-center md:py-20">
        <FadeIn>
          <div className="max-w-xl">
            <h2 className="font-display text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.03em] text-primary">
              Open.
            </h2>
            <p className="mt-4 text-body text-secondary">
              Explore live machines on NEAR testnet. Shake open a mystery trunk
              for $myst rewards. Free demo tokens — not real money.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/explore" size="lg">
              Explore machines
            </ButtonLink>
            <ButtonLink href="/create" size="lg" variant="secondary">
              Create a machine
            </ButtonLink>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
