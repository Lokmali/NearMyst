"use client";

import { type ReactNode, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { SOCIAL_TELEGRAM_URL, SOCIAL_X_URL } from "@/lib/config";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

const faqLinkClass =
  "font-medium text-brand underline-offset-2 hover:text-brand-hover hover:underline";

const ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: "Is this real money?",
    a: "No. NearMyst on this demo is NEAR testnet with free test tokens. Do not send real funds.",
  },
  {
    q: "How is the pack result decided?",
    a: "When you open, the contract rolls against the published odds using testnet block randomness mixed with pack data. The result (tier, amount, random_ref) is stored on-chain. This is not VRF — validators can influence the seed.",
  },
  {
    q: "Why do I wait a block before opening?",
    a: "You must open on a later block than purchase. That gap is a simple fairness rule for this testnet demo so the open isn’t decided in the same block as the buy.",
  },
  {
    q: "What if my payout fails?",
    a: "If the reward FT transfer fails, your pack becomes a PendingClaim. Re-register on the FT if needed, then use Claim — the UI labels this “Reward waiting for you.”",
  },
  {
    q: "Do I need a wallet? How do I get play tokens?",
    a: "Yes — connect a NEAR testnet wallet. Copy your account id, ask the demo host to send free play tokens, and use the public NEAR faucet if you need a little testnet NEAR for fees.",
  },
  {
    q: "Can I use my own meme token?",
    a: (
      <>
        Yes. Create a token at{" "}
        <a
          href="https://meme.cooking/"
          target="_blank"
          rel="noreferrer"
          className={faqLinkClass}
        >
          meme.cooking
        </a>
        , then paste its NEAR account id into Payment token or reward Token on
        the Create page. Any NEAR token works. Demo machines often use
        ft.nearmyst.testnet ($myst).
      </>
    ),
  },
  {
    q: "How do creators earn?",
    a: "Pack price minus the platform fee accrues as creator earnings. Creators withdraw from the machine page when earnings are available.",
  },
  {
    q: "What is not production-ready?",
    a: "Testnet randomness (not VRF), demo FT, and no formal audit. Mainnet would need VRF or an oracle, a real NEP-141, an audit, and legal review.",
  },
  {
    q: "Where can I get support?",
    a: (
      <>
        Join the NearMyst{" "}
        <a
          href={SOCIAL_TELEGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className={faqLinkClass}
        >
          Telegram
        </a>{" "}
        — that’s the best place for help with the testnet demo. Updates also
        post on{" "}
        <a
          href={SOCIAL_X_URL}
          target="_blank"
          rel="noreferrer"
          className={faqLinkClass}
        >
          X
        </a>
        .
      </>
    ),
  },
];

export function FaqAccordion() {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);
  const { reduced } = useMotionPreference();

  return (
    <div className="divide-y divide-border rounded-[var(--radius-md)] border border-border bg-raised">
      {ITEMS.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-panel-${i}`;
        const btnId = `${baseId}-btn-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-body font-medium text-primary hover:bg-subtle/60"
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={reduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduced ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: duration.fast, ease: ease.out }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 prose-narrow text-small text-secondary">
                    {item.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
