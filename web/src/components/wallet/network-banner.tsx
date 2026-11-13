"use client";

import { useEffect, useState } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { NETWORK } from "@/lib/config";

/**
 * Warn when the connected wallet account suffix does not match NEXT_PUBLIC_NETWORK.
 * Selector is configured for NETWORK; this catches .near accounts on a testnet build.
 */
export function NetworkMismatchBanner() {
  const { signedAccountId } = useWalletSelector();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!signedAccountId) {
      setShow(false);
      return;
    }
    const isMainnetAccount = signedAccountId.endsWith(".near") &&
      !signedAccountId.endsWith(".testnet");
    const isTestnetAccount =
      signedAccountId.endsWith(".testnet") ||
      signedAccountId.includes(".testnet");
    if (NETWORK === "testnet" && isMainnetAccount) {
      setShow(true);
      return;
    }
    if (NETWORK === "mainnet" && isTestnetAccount) {
      setShow(true);
      return;
    }
    setShow(false);
  }, [signedAccountId]);

  if (!show) return null;

  return (
    <div
      className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-small text-warning"
      role="alert"
    >
      Network mismatch: app is configured for <strong>{NETWORK}</strong> but
      wallet account looks like a different network ({signedAccountId}). Switch
      wallet network or update <code>NEXT_PUBLIC_NETWORK</code>.
    </div>
  );
}
