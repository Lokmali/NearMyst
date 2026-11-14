"use client";

import { useState } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useWalletReady } from "@/components/providers/wallet-provider";

/**
 * Opens the Wallet Selector modal with visible errors.
 * MyNearWallet uses a popup — blocked popups are the most common connect failure.
 */
export function ConnectWalletButton({
  children = "Connect Wallet",
  size = "sm",
  variant = "primary",
  className,
  onClick,
  loading,
  disabled,
  ...props
}: ButtonProps & { children?: React.ReactNode }) {
  const walletsReady = useWalletReady();

  if (!walletsReady) {
    return (
      <Button
        size={size}
        variant={variant}
        className={className}
        loading
        disabled
        {...props}
      >
        Loading wallets…
      </Button>
    );
  }

  return (
    <ConnectWalletButtonReady
      size={size}
      variant={variant}
      className={className}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      {...props}
    >
      {children}
    </ConnectWalletButtonReady>
  );
}

function ConnectWalletButtonReady({
  children = "Connect Wallet",
  size = "sm",
  variant = "primary",
  className,
  onClick,
  loading,
  disabled,
  ...props
}: ButtonProps & { children?: React.ReactNode }) {
  const { signIn } = useWalletSelector();
  const [busy, setBusy] = useState(false);

  async function onConnect() {
    setBusy(true);
    try {
      await Promise.resolve(signIn());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const popup = /popup/i.test(msg) || /blocked/i.test(msg);
      const meteorApp =
        /Meteor Wallet App/i.test(msg) || /Not supported/i.test(msg);
      const injectedNear = /reading ['"]near['"]/i.test(msg);
      toast.error(
        popup
          ? "Allow popups for this site, then try again"
          : meteorApp
            ? "That Meteor option is for the mobile app"
            : injectedNear
              ? "That wallet doesn’t support NEAR testnet"
              : "Couldn’t open wallet",
        {
          description: popup
            ? "MyNearWallet needs a popup. Try Meteor Wallet (browser extension) if popups are blocked."
            : meteorApp || injectedNear
              ? "Pick MyNearWallet or Meteor Wallet, and make sure the wallet is on testnet."
              : msg,
        },
      );
      console.error("[NearMyst] signIn failed:", e);
    } finally {
      window.setTimeout(() => setBusy(false), 400);
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      {...props}
      loading={busy || Boolean(loading)}
      disabled={Boolean(disabled)}
      onClick={(e) => {
        onClick?.(e);
        void onConnect();
      }}
    >
      {children}
    </Button>
  );
}
