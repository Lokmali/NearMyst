import { Capsule } from "@/components/brand/capsule";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page-wrap flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full opacity-70 shadow-[inset_0_0_40px_rgba(224,184,74,0.3)]"
        />
        <Capsule size="lg" />
      </div>
      <h1 className="mt-8 text-h1 text-primary">Page not found</h1>
      <p className="mt-3 max-w-md prose-narrow text-body text-secondary">
        That link doesn’t lead anywhere on NearMyst. Head home or browse live
        machines.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/explore" variant="secondary">
          Explore machines
        </ButtonLink>
      </div>
    </div>
  );
}
