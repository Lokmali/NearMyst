"use client";

import Link from "next/link";
import { ArcMark } from "@/components/brand/arc-mark";
import { SocialLinks } from "@/components/brand/social-links";
import { CopyButton } from "@/components/ui/copy-button";
import { MEME_COOKING_URL } from "@/components/ux/create-meme-token";
import {
  explorerAccountUrl,
  GACHA_CONTRACT,
  NETWORK,
  SUPPORT_URL,
} from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-0 border-t border-border bg-base/80 backdrop-blur-sm">
      <div className="page-wrap grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-display font-semibold text-primary">
            <ArcMark size={24} />
            NearMyst
          </div>
          <p className="mt-3 max-w-xs prose-narrow text-small text-muted">
            Testnet demo with test tokens — not real money. Randomness is not
            production-secure. No audit.
          </p>
          <SocialLinks className="mt-4" />
        </div>

        <div>
          <div className="text-small font-medium text-muted">Links</div>
          <ul className="mt-3 space-y-2 text-small text-secondary">
            <li>
              <Link href="/explore" className="hover:text-primary">
                Explore
              </Link>
            </li>
            <li>
              <Link href="/buy" className="hover:text-primary">
                Buy $myst
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
                href={MEME_COOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                Create meme token
              </a>
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
            <li>
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                Support
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-small font-medium text-muted">Network</div>
          <div className="mt-3 space-y-2 text-small text-secondary">
            <div>
              Network: <span className="text-primary">{NETWORK}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="mono-id break-all text-primary" translate="no">
                {GACHA_CONTRACT}
              </span>
              <CopyButton
                value={GACHA_CONTRACT}
                iconOnly
                label="Copy contract id"
              />
            </div>
            <p className="pt-2 text-caption text-muted">
              Built for NEAR HACKATHON · testnet demo only
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
