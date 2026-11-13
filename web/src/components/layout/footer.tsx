"use client";

import Link from "next/link";
import { Capsule } from "@/components/brand/capsule";
import { CopyButton } from "@/components/ui/copy-button";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { explorerAccountUrl, GACHA_CONTRACT, NETWORK } from "@/lib/config";

export function Footer() {
  const { mode, toggle } = useMotionPreference();

  return (
    <footer className="mt-24 border-t border-border bg-base">
      <div className="mx-auto grid max-w-container gap-10 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <div className="flex items-center gap-2 font-display font-semibold text-primary">
            <Capsule size="xs" />
            NearMyst
          </div>
          <p className="mt-3 max-w-xs prose-narrow text-small text-muted">
            Mystery packs on NEAR.{" "}
            <strong className="font-medium text-secondary">
              Testnet demo with test tokens — not real money.
            </strong>{" "}
            Randomness is not production-secure. No audit.
          </p>
        </div>

        <div>
          <div className="text-caption font-medium uppercase tracking-[0.12em] text-muted">
            Links
          </div>
          <ul className="mt-3 space-y-2 text-small text-secondary">
            <li>
              <Link href="/explore" className="hover:text-primary">
                Explore
              </Link>
            </li>
            <li>
              <Link href="/create" className="hover:text-primary">
                Create
              </Link>
            </li>
            <li>
              <Link href="/inventory" className="hover:text-primary">
                Inventory
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/Lokmali/NearMyst"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href={explorerAccountUrl(GACHA_CONTRACT)}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                Contract on explorer
              </a>
            </li>
            <li>
              <Link href="/#how" className="hover:text-primary">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-primary">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-caption font-medium uppercase tracking-[0.12em] text-muted">
            Network
          </div>
          <div className="mt-3 space-y-2 text-small text-secondary">
            <div>
              Network: <span className="text-primary">{NETWORK}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="mono-id break-all text-primary">
                {GACHA_CONTRACT}
              </span>
              <CopyButton
                value={GACHA_CONTRACT}
                iconOnly
                label="Copy contract id"
              />
            </div>
            <button
              type="button"
              onClick={() => toggle()}
              className="min-h-11 text-caption text-muted underline-offset-2 hover:text-secondary hover:underline"
            >
              Motion: {mode === "full" ? "Full" : "Reduced"}
            </button>
            <p className="pt-2 text-caption text-muted">
              Built for NEAR HACKATHON · testnet demo only
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
