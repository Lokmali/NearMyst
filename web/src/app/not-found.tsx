import Link from "next/link";
import { Capsule } from "@/components/brand/capsule";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
      <Capsule size="md" />
      <p className="mt-6 text-eyebrow text-muted">404</p>
      <h1 className="mt-3 text-h1 text-primary">Page not found</h1>
      <p className="mt-3 prose-narrow text-small text-secondary">
        That link doesn’t lead anywhere on NearMyst. Head home or browse live
        machines.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button>Go home</Button>
        </Link>
        <Link href="/explore">
          <Button variant="secondary">Explore machines</Button>
        </Link>
      </div>
    </div>
  );
}
