"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
      <p className="text-eyebrow text-muted">Something went wrong</p>
      <h1 className="mt-3 text-h1 text-primary">We hit a snag</h1>
      <p className="mt-3 text-small text-secondary">
        Refresh or go home. If it keeps happening, check your connection.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Link href="/">
          <Button variant="secondary">Go home</Button>
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 text-caption text-muted">Ref: {error.digest}</p>
      )}
    </div>
  );
}
