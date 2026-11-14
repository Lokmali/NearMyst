"use client";

import { useEffect } from "react";
import { Capsule } from "@/components/brand/capsule";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-wrap flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Capsule size="md" tint="#fb7185" />
      <h1 className="mt-6 text-h1 text-primary">We hit a snag</h1>
      <p className="mt-3 max-w-md text-body text-secondary">
        Refresh or go home. If it keeps happening, check your connection.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
      {error.digest && (
        <p className="mt-6 text-caption text-muted">Ref: {error.digest}</p>
      )}
    </div>
  );
}
