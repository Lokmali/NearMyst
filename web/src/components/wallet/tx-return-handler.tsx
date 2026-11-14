"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import { useWalletReady } from "@/components/providers/wallet-provider";
import { explorerTxUrl } from "@/lib/config";
import {
  finalizeFtRegistrationFromPending,
  peekPendingFtRegistration,
  rememberLegacyRegistration,
} from "@/lib/contract/client";
import { verifyTxOnChain } from "@/lib/tx";

/**
 * MyNearWallet (and similar) redirect back with ?transactionHashes=...
 * Verify each hash on-chain — never invent success.
 * Also completes pending FT storage_deposit registrations after remount.
 */
export function TxReturnHandler() {
  const ready = useWalletReady();
  if (!ready) return null;
  return <TxReturnHandlerReady />;
}

function TxReturnHandlerReady() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { signedAccountId } = useWalletSelector();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const hashes = params.get("transactionHashes");
    const errorCode = params.get("errorCode");
    const errorMessage = params.get("errorMessage");

    if (!hashes && !errorCode) return;
    handled.current = true;

    const next = new URLSearchParams(params.toString());
    next.delete("transactionHashes");
    next.delete("errorCode");
    next.delete("errorMessage");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);

    if (errorCode) {
      finalizeFtRegistrationFromPending(false);
      toast.error(
        decodeURIComponent(errorMessage || errorCode).replace(/\+/g, " "),
      );
      return;
    }

    const list = hashes!.split(",").filter(Boolean);
    const account = signedAccountId;
    void (async () => {
      for (const h of list) {
        if (!account) {
          toast.message("Wallet returned a transaction", {
            description: h,
            action: {
              label: "Explorer",
              onClick: () => window.open(explorerTxUrl(h), "_blank"),
            },
          });
          continue;
        }
        toast.message("Verifying transaction…", { description: h });
        const result = await verifyTxOnChain(h, account);
        if (result.ok) {
          const pending = peekPendingFtRegistration();
          if (pending) {
            rememberLegacyRegistration(pending.tokenId, pending.accountId);
            finalizeFtRegistrationFromPending(true);
            toast.success(`${pending.label} — registered`, {
              description: h,
              action: {
                label: "Explorer",
                onClick: () => window.open(explorerTxUrl(h), "_blank"),
              },
            });
            window.dispatchEvent(new Event("nearmyst:ft-reg-updated"));
          } else {
            toast.success("Transaction confirmed on-chain", {
              description: h,
              action: {
                label: "Explorer",
                onClick: () => window.open(explorerTxUrl(h), "_blank"),
              },
            });
          }
        } else {
          finalizeFtRegistrationFromPending(false);
          toast.error("Transaction failed or unconfirmed", {
            description: result.error,
            action: {
              label: "Explorer",
              onClick: () => window.open(explorerTxUrl(h), "_blank"),
            },
          });
        }
      }
    })();
  }, [params, pathname, router, signedAccountId]);

  return null;
}
