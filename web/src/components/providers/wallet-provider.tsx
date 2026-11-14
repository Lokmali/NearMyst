"use client";

import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";
import { setupBitgetWallet } from "@near-wallet-selector/bitget-wallet";
import { setupCoin98Wallet } from "@near-wallet-selector/coin98-wallet";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { setupIntearWallet } from "@near-wallet-selector/intear-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupMathWallet } from "@near-wallet-selector/math-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMeteorWalletApp } from "@near-wallet-selector/meteor-wallet-app";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupNarwallets } from "@near-wallet-selector/narwallets";
import { setupNearMobileWallet } from "@near-wallet-selector/near-mobile-wallet";
import { setupNightly } from "@near-wallet-selector/nightly";
import { setupOKXWallet } from "@near-wallet-selector/okx-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { setupWelldoneWallet } from "@near-wallet-selector/welldone-wallet";
import { setupXDEFI } from "@near-wallet-selector/xdefi";
import { WalletSelectorProvider } from "@near-wallet-selector/react-hook";
import type { WalletModuleFactory } from "@near-wallet-selector/core";
import "@near-wallet-selector/modal-ui/styles.css";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EXPLORER_URL,
  GACHA_CONTRACT,
  NEAR_RPC,
  NETWORK,
} from "@/lib/config";

const WalletReadyContext = createContext(false);

/** True after WalletSelectorProvider has mounted with real modules. */
export function useWalletReady() {
  return useContext(WalletReadyContext);
}

/**
 * setupWalletSelector is a singleton — the first call wins.
 * Initializing with modules: [] locks an empty modal forever.
 * We only mount WalletSelectorProvider once client modules are built.
 */
// Wallet packages return differently typed factories; selector accepts them all.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWalletFactory = WalletModuleFactory<any>;

function safeSetup(name: string, factory: () => unknown): AnyWalletFactory | null {
  try {
    return factory() as AnyWalletFactory;
  } catch (e) {
    console.warn(`[NearMyst] skipped wallet module ${name}:`, e);
    return null;
  }
}

function buildWalletModules(): AnyWalletFactory[] {
  const modules = [
    safeSetup("my-near-wallet", () => setupMyNearWallet()),
    safeSetup("meteor-wallet", () => setupMeteorWallet()),
    safeSetup("meteor-wallet-app", () =>
      setupMeteorWalletApp({ contractId: GACHA_CONTRACT }),
    ),
    safeSetup("here-wallet", () => setupHereWallet()),
    safeSetup("hot-wallet", () => setupHotWallet()),
    safeSetup("intear-wallet", () => setupIntearWallet()),
    safeSetup("bitte-wallet", () => setupBitteWallet()),
    safeSetup("near-mobile-wallet", () => setupNearMobileWallet()),
    safeSetup("sender", () => setupSender()),
    safeSetup("nightly", () => setupNightly()),
    safeSetup("okx-wallet", () => setupOKXWallet()),
    safeSetup("bitget-wallet", () => setupBitgetWallet()),
    safeSetup("math-wallet", () => setupMathWallet()),
    safeSetup("coin98-wallet", () => setupCoin98Wallet()),
    safeSetup("welldone-wallet", () => setupWelldoneWallet()),
    safeSetup("xdefi", () => setupXDEFI()),
    safeSetup("narwallets", () => setupNarwallets()),
    safeSetup("ledger", () => setupLedger()),
  ];

  return modules.filter((m): m is AnyWalletFactory => m !== null);
}

const networkConfig = {
  network: {
    networkId: NETWORK,
    nodeUrl: NEAR_RPC,
    helperUrl:
      NETWORK === "mainnet"
        ? "https://helper.mainnet.near.org"
        : "https://helper.testnet.near.org",
    explorerUrl: EXPLORER_URL,
    indexerUrl:
      NETWORK === "mainnet"
        ? "https://api.kitwallet.app"
        : "https://testnet-api.kitwallet.app",
  },
  fallbackRpcUrls: [
    NEAR_RPC,
    NETWORK === "mainnet"
      ? "https://rpc.mainnet.near.org"
      : "https://rpc.testnet.near.org",
  ].filter((u, i, a) => a.indexOf(u) === i),
  debug: process.env.NODE_ENV === "development",
  createAccessKeyFor: {
    contractId: GACHA_CONTRACT,
    methodNames: [
      "open_pack",
      "claim_pending",
      "create_machine",
      "activate_machine",
      "pause_machine",
      "unpause_machine",
      "withdraw_creator_earnings",
      "withdraw_platform_earnings",
      "withdraw_unreserved_inventory",
    ],
  },
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<AnyWalletFactory[] | null>(null);

  useEffect(() => {
    setModules(buildWalletModules());
  }, []);

  const config = useMemo(() => {
    if (!modules?.length) return null;
    return { ...networkConfig, modules };
  }, [modules]);

  // Hold the tree until modules exist so useWalletSelector never runs against
  // an empty singleton (and never runs outside the provider).
  if (!config) {
    return (
      <WalletReadyContext.Provider value={false}>
        <div
          className="flex min-h-svh items-center justify-center bg-[var(--bg-base)] text-small text-secondary"
          aria-busy
          aria-live="polite"
        >
          Loading wallets…
        </div>
      </WalletReadyContext.Provider>
    );
  }

  return (
    <WalletReadyContext.Provider value={true}>
      <WalletSelectorProvider config={config}>{children}</WalletSelectorProvider>
    </WalletReadyContext.Provider>
  );
}
