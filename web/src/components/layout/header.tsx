"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, ExternalLink, Copy, Check, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capsule } from "@/components/brand/capsule";
import { RouteIris } from "@/components/motion/route-iris";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { NETWORK, explorerAccountUrl } from "@/lib/config";
import { formatNear, shortenAccount } from "@/lib/format";
import { getAccountNearBalance } from "@/lib/contract/client";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/create", label: "Create" },
  { href: "/inventory", label: "Inventory" },
];

export function Header() {
  const pathname = usePathname();
  const { reduced, mode, toggle } = useMotionPreference();
  const { signedAccountId, signIn, signOut } = useWalletSelector();
  const [balance, setBalance] = useState<string | null>(null);
  const [balError, setBalError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAccountOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!signedAccountId) {
        setBalance(null);
        setBalError(null);
        return;
      }
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const yocto = await getAccountNearBalance(signedAccountId);
        if (!cancelled) {
          setBalance(formatNear(yocto));
          setBalError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setBalance(null);
          setBalError(e instanceof Error ? e.message : "Balance unavailable");
        }
      }
    }
    void load();
    // Poll less often; pause when the tab is hidden.
    const t = setInterval(() => void load(), 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [signedAccountId]);

  async function copyAddress() {
    if (!signedAccountId) return;
    try {
      await navigator.clipboard.writeText(signedAccountId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const initial = signedAccountId?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <RouteIris />
      <header
        className={cn(
          "sticky top-0 z-40 h-16 transition duration-base ease-out",
          scrolled ? "glass-header shadow-card" : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-full max-w-container items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-lg font-bold tracking-wide text-primary transition hover:text-brand-hover"
            >
              <Capsule size="sm" />
              <span>
                Near<span className="text-brand">Myst</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-small text-secondary md:flex">
              {NAV.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative rounded-md px-3 py-2 transition hover:text-primary",
                      active ? "text-primary" : "text-muted",
                    )}
                  >
                    {item.label}
                    {active && (
                      <motion.span
                        layoutId={reduced ? undefined : "nav-underline"}
                        className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-brand"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-subtle px-2.5 py-1 text-caption font-medium text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-info" aria-hidden />
              {NETWORK === "testnet" ? "Testnet" : NETWORK}
            </span>

            {signedAccountId ? (
              <div className="relative" ref={accountRef}>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="hidden sm:inline-flex"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-caption font-semibold text-brand"
                    aria-hidden
                  >
                    {initial}
                  </span>
                  <span className="text-left">
                    <span className="block text-caption font-semibold">
                      {shortenAccount(signedAccountId, 5, 7)}
                    </span>
                    <span className="block text-[10px] font-normal text-muted tabular">
                      {balError ? "balance error" : balance != null ? `${balance} Ⓝ` : "…"}
                    </span>
                  </span>
                </Button>
                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      role="menu"
                      initial={reduced ? false : { opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduced ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: duration.fast, ease: ease.out }}
                      className="absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border border-border bg-overlay p-2 shadow-overlay"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-small text-secondary hover:bg-subtle hover:text-primary"
                        onClick={() => void copyAddress()}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-success" strokeWidth={1.75} />
                        ) : (
                          <Copy className="h-4 w-4" strokeWidth={1.75} />
                        )}
                        {copied ? "Copied" : "Copy address"}
                      </button>
                      <a
                        role="menuitem"
                        href={explorerAccountUrl(signedAccountId)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-small text-secondary hover:bg-subtle hover:text-primary"
                        onClick={() => setAccountOpen(false)}
                      >
                        <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                        View on explorer
                      </a>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-small text-secondary hover:bg-subtle hover:text-primary"
                        onClick={() => {
                          toggle();
                        }}
                      >
                        <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                        Motion: {mode === "full" ? "Full" : "Reduced"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-small text-danger hover:bg-danger-tint"
                        onClick={() => {
                          setAccountOpen(false);
                          void signOut();
                        }}
                      >
                        <LogOut className="h-4 w-4" strokeWidth={1.75} />
                        Disconnect
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden flex-col items-end sm:flex">
                <Button size="sm" onClick={() => void signIn()}>
                  Connect Wallet
                </Button>
                <span className="mt-0.5 max-w-[11rem] text-right text-[10px] leading-tight text-muted">
                  Your login for NEAR
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 w-11 px-0 md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <X className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={reduced ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: 24 }}
              transition={{ duration: duration.base, ease: ease.out }}
              className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col border-l border-border bg-overlay shadow-overlay md:hidden"
            >
              <div className="flex h-16 items-center justify-between px-4">
                <span className="font-display font-semibold">Menu</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-11 px-0"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-3 text-body text-primary hover:bg-subtle"
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  className="rounded-md px-3 py-3 text-left text-body text-secondary hover:bg-subtle"
                  onClick={() => toggle()}
                >
                  Motion: {mode === "full" ? "Full" : "Reduced"}
                </button>
                <div className="mt-auto space-y-2 border-t border-border p-3">
                  {signedAccountId ? (
                    <>
                      <div className="text-caption text-muted">
                        {shortenAccount(signedAccountId)} ·{" "}
                        {balError ? "balance error" : balance != null ? `${balance} Ⓝ` : "…"}
                      </div>
                      <Button variant="secondary" className="w-full" onClick={() => void signOut()}>
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full" onClick={() => void signIn()}>
                      Connect Wallet
                    </Button>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
