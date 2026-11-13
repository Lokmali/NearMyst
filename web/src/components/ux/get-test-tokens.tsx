"use client";

import { DEFAULT_PAYMENT_TOKEN } from "@/lib/ux-copy";
import { CopyButton } from "@/components/ui/copy-button";
import { Card } from "@/components/ui/card";

/** Clear instructions when the user has no demo tokens. */
export function GetTestTokensCard({ className }: { className?: string }) {
  return (
    <Card id="get-tokens" className={className}>
      <h3 className="text-h3 text-primary">Get test tokens</h3>
      <p className="mt-2 text-small text-secondary">
        These are <strong className="font-medium text-primary">test tokens</strong> on
        NEAR testnet — not real money. Ask a teammate to run the seed script for your
        wallet, or use the project seed command:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-subtle p-3 text-caption text-secondary">
        {`$env:GACHA_CONTRACT="app.nearmyst.testnet"
.\\scripts\\seed-testnet.ps1 -Wallet nearmyst.testnet`}
      </pre>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-caption text-muted">
        Demo token:{" "}
        <span className="mono-id text-secondary">{DEFAULT_PAYMENT_TOKEN}</span>
        <CopyButton value={DEFAULT_PAYMENT_TOKEN} iconOnly label="Copy token id" />
      </p>
    </Card>
  );
}
