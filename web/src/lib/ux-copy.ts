/** Plain-language labels and error helpers (UI only). */

export const PACK_STATUS_LABEL: Record<string, string> = {
  Unopened: "Ready to open",
  Opened: "Opening…",
  PendingClaim: "Reward waiting for you",
  Delivered: "Reward received",
};

export function packStatusLabel(status: string): string {
  return PACK_STATUS_LABEL[status] ?? status;
}

export function humanError(raw: string): { title: string; hint?: string } {
  const m = raw.toLowerCase();
  if (/user rejected|rejected by user|user cancelled|cancel/i.test(raw)) {
    return {
      title: "You cancelled in your wallet",
      hint: "Nothing was charged. Try again when you’re ready.",
    };
  }
  if (/insufficient|not enough|exceeds balance/i.test(m)) {
    return {
      title: "Not enough tokens",
      hint: "Get test tokens, then try again.",
    };
  }
  if (/storage|not registered|registration/i.test(m)) {
    return {
      title: "Account setup needed",
      hint: "Set up your account for this token (one-time), then retry.",
    };
  }
  if (/paused|not active|draft/i.test(m)) {
    return {
      title: "This machine isn’t available to buy right now",
      hint: "It may be paused or not activated yet.",
    };
  }
  if (/later block|same block|randomness rule/i.test(m)) {
    return {
      title: "Pack not ready to open yet",
      hint: "Wait a few seconds, then try Open again.",
    };
  }
  if (/failed to fetch|rpc failed|network/i.test(m)) {
    return {
      title: "Connection problem",
      hint: "Check your internet and refresh the page.",
    };
  }
  if (/unsupported naj/i.test(m)) {
    return {
      title: "Wallet couldn’t send that action",
      hint: "Refresh the page and try again.",
    };
  }
  return { title: "Something went wrong", hint: "See technical details if you need help." };
}

export const DEFAULT_PAYMENT_TOKEN =
  process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN ?? "ft.nearmyst.testnet";
