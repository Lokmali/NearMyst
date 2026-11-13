"use client";

import { useState } from "react";
import { explorerTxUrl } from "@/lib/config";
import { humanError } from "@/lib/ux-copy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FriendlyTx =
  | { kind: "idle" }
  | { kind: "pending"; label: string }
  | { kind: "success"; hash: string; label: string }
  | { kind: "error"; message: string };

export function TxStatusPanel({
  tx,
  onRetry,
  className,
}: {
  tx: FriendlyTx;
  onRetry?: () => void;
  className?: string;
}) {
  const [showTech, setShowTech] = useState(false);

  if (tx.kind === "idle") return null;

  if (tx.kind === "pending") {
    return (
      <div
        className={cn(
          "rounded-md border border-border bg-subtle px-3 py-3 text-small",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <p className="font-medium text-primary">{tx.label}</p>
        <p className="mt-1 text-caption text-secondary">
          Approve in your wallet if asked. This can take a few seconds.
        </p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
          aria-hidden
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
        </div>
      </div>
    );
  }

  if (tx.kind === "success") {
    return (
      <div
        className={cn(
          "rounded-md border border-success/30 bg-success-tint px-3 py-3 text-small",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <p className="font-medium text-success">{tx.label}</p>
        {tx.hash !== "submitted" && (
          <a
            className="mt-2 inline-block text-caption text-info underline"
            href={explorerTxUrl(tx.hash)}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        )}
      </div>
    );
  }

  const friendly = humanError(tx.message);

  return (
    <div
      className={cn(
        "rounded-md border border-danger/30 bg-danger-tint px-3 py-3 text-small",
        className,
      )}
      role="alert"
    >
      <p className="font-medium text-danger">{friendly.title}</p>
      {friendly.hint && (
        <p className="mt-1 text-caption text-secondary">{friendly.hint}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        <button
          type="button"
          className="text-caption text-muted underline-offset-2 hover:text-secondary hover:underline"
          onClick={() => setShowTech((v) => !v)}
        >
          {showTech ? "Hide technical details" : "Show technical details"}
        </button>
      </div>
      {showTech && (
        <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-border bg-raised p-2 text-caption text-muted whitespace-pre-wrap break-all">
          {tx.message}
        </pre>
      )}
    </div>
  );
}
