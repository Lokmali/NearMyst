"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, ExternalLink, Copy, Check, LogOut, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArcMark } from "@/components/brand/arc-mark";
import { RouteIris } from "@/components/motion/route-iris";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { useWalletReady } from "@/components/providers/wallet-provider";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
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
  const walletsReady = useWalletReady();
  if (!walletsReady) {
    return <HeaderShell signedAccountId={null} signOut={async () => {}} />;
  }
  return <HeaderWithWallet />;
}

function HeaderWithWallet() {
  const { signedAccountId, signOut } = useWalletSelector();
  return (
    <HeaderShell signedAccountId={signedAccountId} signOut={signOut} />
  );
}

function HeaderShell({
  signedAccountId,
  signOut,
}: {
  signedAccountId: string | null;
  signOut: () => Promise<void> | void;
}) {
  const pathname = usePathname();
  const { reduced, mode, toggle } = useMotionPreference();
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

  return (
    <>
      <RouteIris />
      <header
        className={cn(
          "sticky top-0 z-40 h-16 transition duration-base ease-out",
          scrolled ? "glass-header shadow-card" : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="page-wrap flex h-full items-center justify-between gap-3 md:gap-4">
          <div className="flex min-w-0 items-center gap-5 md:gap-6">
            <Link
              href="/"
              className="flex h-9 shrink-0 items-center gap-2 font-display text-[0.9375rem] font-semibold leading-none tracking-tight text-primary transition hover:text-brand-hover"
            >
              <ArcMark size={22} priority className="rounded-[6px]" />
              <span>
                Near<span className="text-brand">Myst</span>
              </span>
            </Link>
            {/* Near.com-style text links — shared height with right controls */}
            <nav className="hidden items-center gap-0.5 text-small md:flex">
              {NAV.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-3.5 text-small font-medium leading-none transition duration-fast ease-out",
                      active
                        ? "bg-subtle text-primary"
                        : "text-secondary hover:bg-subtle/70 hover:text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden h-9 items-center gap-1.5 rounded-full border border-border bg-subtle/80 px-3 text-small font-medium leading-none text-secondary sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              {NETWORK === "testnet" ? "Testnet" : NETWORK}
            </span>

            {signedAccountId ? (
              <div className="relative" ref={accountRef}>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label={`Account ${signedAccountId}`}
                  onClick={() => setAccountOpen((v) => !v)}
                  className="hidden h-9 max-w-[14.5rem] px-3 text-small font-medium leading-none sm:inline-flex"
                >
                  <Wallet
                    className="h-3.5 w-3.5 shrink-0 text-brand"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span
                    className="min-w-0 truncate leading-none tracking-tight"
                    translate="no"
                  >
                    {shortenAccount(signedAccountId)}
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
                      className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-overlay p-2 shadow-overlay"
                    >
                      <div className="mb-1 rounded-md px-3 py-2.5">
                        <p
                          className="truncate text-small font-medium text-primary"
                          translate="no"
                          title={signedAccountId}
                        >
                          {signedAccountId}
                        </p>
                        <p className="mt-0.5 text-caption tabular text-muted">
                          {balError
                            ? "Balance unavailable"
                            : balance != null
                              ? `${balance} Ⓝ`
                              : "Loading balance…"}
                        </p>
                      </div>
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
              <div className="hidden sm:block">
                <ConnectWalletButton size="sm" />
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
                    onClick={() => setMenuOpen(false)}
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
                      <div className="space-y-0.5 text-caption text-muted">
                        <div className="truncate text-primary" translate="no">
                          {signedAccountId}
                        </div>
                        <div className="tabular">
                          {balError
                            ? "Balance unavailable"
                            : balance != null
                              ? `${balance} Ⓝ`
                              : "Loading balance…"}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          setMenuOpen(false);
                          void signOut();
                        }}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <ConnectWalletButton
                      className="w-full"
                      size="md"
                      onClick={() => setMenuOpen(false)}
                    />
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
