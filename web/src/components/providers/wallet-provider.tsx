"use client";

import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { setupIntearWallet } from "@near-wallet-selector/intear-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupNearMobileWallet } from "@near-wallet-selector/near-mobile-wallet";
import { setupNightly } from "@near-wallet-selector/nightly";
import { setupSender } from "@near-wallet-selector/sender";
import { WalletSelectorProvider } from "@near-wallet-selector/react-hook";
import "@near-wallet-selector/modal-ui/styles.css";
import type { ReactNode } from "react";
import { GACHA_CONTRACT, NETWORK } from "@/lib/config";

/**
 * Wallet Selector modal lists every module below. Injected wallets only show as
 * available when the extension/app is installed; browser wallets always appear.
 *
 * Not included: @near-wallet-selector/ethereum-wallets (needs wagmi/Web3Modal).
 */
const walletSelectorConfig = {
  network: NETWORK,
  // Limited function-call key for gacha methods. FT transfers use callFunction
  // against the payment/reward token (full-access / wallet prompt).
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
  modules: [
    setupMyNearWallet(),
    setupMeteorWallet(),
    setupHereWallet(),
    setupHotWallet(),
    setupIntearWallet(),
    setupNearMobileWallet(),
    setupSender(),
    setupNightly(),
    setupLedger(),
  ],
};

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WalletSelectorProvider config={walletSelectorConfig}>
      {children}
    </WalletSelectorProvider>
  );
}
