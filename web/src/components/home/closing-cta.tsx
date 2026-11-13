import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-raised px-6 py-12 text-center shadow-card md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,108,255,0.18),transparent_60%)]"
      />
      <FadeIn>
        <h2 className="relative text-h2 text-primary">Ready to open a pack?</h2>
        <p className="relative mx-auto mt-2 max-w-lg prose-narrow text-small text-secondary">
          Explore live machines on NEAR testnet. Free demo tokens — not real money.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/explore">
            <Button size="lg">Explore machines</Button>
          </Link>
          <Link href="/create">
            <Button size="lg" variant="secondary">
              Create a machine
            </Button>
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
