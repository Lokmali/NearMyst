"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input, Textarea } from "@/components/ui/input";
import { ErrorPanel } from "@/components/ui/error-panel";
import { TierBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GAS_ACTIVATE,
  GAS_CREATE_MACHINE,
  GAS_FT_TRANSFER_CALL,
  ONE_YOCTO,
  buildDepositRewardMsg,
  getConfig,
  getMachine,
  getRequiredCreateDeposit,
  type CreateMachineArgs,
  type CreateRewardInput,
} from "@/lib/contract/client";
import { StorageRegisterPanel } from "@/components/gacha/storage-register";
import { CreateMemeTokenPanel } from "@/components/ux/create-meme-token";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { GACHA_CONTRACT, explorerTxUrl } from "@/lib/config";
import {
  percentToBps,
  platformFeeAmount,
  requiredDepositAmount,
  sumTierBps,
  totalInventorySlots,
  validateTierSum,
} from "@/lib/odds";
import { formatTokenAmount, tokenSymbol } from "@/lib/format";
import { extractCreateMachineId, extractTxHash } from "@/lib/tx";
import type { PlatformConfig, Tier, TierConfig } from "@/lib/types";

const TIERS: Tier[] = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
const DEFAULT_FT =
  process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN ?? "ft.nearmyst.testnet";

/** Starter amount / slots when a tier is turned on in Odds. */
const DEFAULT_REWARD_BY_TIER: Record<
  Tier,
  { amount_per_win: string; quantity: number }
> = {
  Common: { amount_per_win: "100", quantity: 6 },
  Rare: { amount_per_win: "500", quantity: 3 },
  Epic: { amount_per_win: "2000", quantity: 1 },
  Legendary: { amount_per_win: "5000", quantity: 1 },
  Mythic: { amount_per_win: "10000", quantity: 1 },
};

type RewardRow = {
  tier: Tier;
  token: string;
  amount_per_win: string;
  quantity: number;
};

type Step =
  | { id: "idle" }
  | { id: "create"; label: string }
  | { id: "deposit"; label: string; index: number; total: number }
  | { id: "verify"; label: string }
  | { id: "activate"; label: string }
  | { id: "done"; machineId: number; hashes: string[] }
  | { id: "error"; message: string; machineId?: number; hashes?: string[] };

/** Testnet RPC + FT callbacks can lag; poll until inventory is funded. */
async function waitForDepositsFunded(
  machineId: number,
  onTick?: (attempt: number, deposited: number, need: number) => void,
  signal?: { cancelled: boolean },
): Promise<boolean> {
  const maxAttempts = 24; // ~40s — then surface Retry (don't feel stuck forever)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.cancelled) return false;
    const delay = attempt < 8 ? 1200 : 2000;
    await new Promise((r) => setTimeout(r, delay));
    if (signal?.cancelled) return false;
    try {
      const m = await getMachine(machineId);
      if (!m) continue;
      const deposited = m.rewards.reduce(
        (s, r) => s + r.quantity_deposited,
        0,
      );
      onTick?.(attempt + 1, deposited, m.max_packs);
      if (deposited >= m.max_packs) return true;
      if (m.status === "Active") return true;
    } catch {
      /* keep polling */
    }
  }
  return false;
}

const flowSteps = [
  { id: "create", label: "Create" },
  { id: "deposit", label: "Deposit" },
  { id: "verify", label: "Confirm" },
  { id: "activate", label: "Activate" },
] as const;

const PENDING_KEY = "nearmyst-create-pending-v1";

type PendingDepositLine = {
  index: number;
  token: string;
  amount: string;
  tier: string;
};

type PendingCreate = {
  machineId: number;
  nextDepositIndex: number;
  deposits: PendingDepositLine[];
  hashes: string[];
  phase: "deposit" | "verify" | "activate";
};

function readPending(): PendingCreate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCreate;
  } catch {
    return null;
  }
}

function writePending(p: PendingCreate | null) {
  if (typeof window === "undefined") return;
  try {
    if (!p) sessionStorage.removeItem(PENDING_KEY);
    else sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function flowStatus(
  id: (typeof flowSteps)[number]["id"],
  current: Step["id"],
) {
  const order = ["create", "deposit", "verify", "activate", "done"] as const;
  if (current === "error") return "failed";
  if (current === "idle") return "pending";
  if (current === "done") return "done";
  const ci = order.indexOf(current as (typeof order)[number]);
  const ii = order.indexOf(id);
  if (ii < ci) return "done";
  if (ii === ci) return "active";
  return "pending";
}

export default function CreatePage() {
  const { signedAccountId, callFunction } = useWalletSelector();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [paymentToken, setPaymentToken] = useState(DEFAULT_FT);
  const [packPrice, setPackPrice] = useState("1000");
  const [maxPacks, setMaxPacks] = useState(10);
  const [percents, setPercents] = useState<Record<Tier, number>>({
    Common: 60,
    Rare: 30,
    Epic: 10,
    Legendary: 0,
    Mythic: 0,
  });
  const [rewards, setRewards] = useState<RewardRow[]>([
    { tier: "Common", token: DEFAULT_FT, amount_per_win: "100", quantity: 6 },
    { tier: "Rare", token: DEFAULT_FT, amount_per_win: "500", quantity: 3 },
    { tier: "Epic", token: DEFAULT_FT, amount_per_win: "2000", quantity: 1 },
  ]);
  const [step, setStep] = useState<Step>({ id: "idle" });
  const [activeSection, setActiveSection] = useState<(typeof flowSteps)[number]["id"]>("create");

  useEffect(() => {
    void getConfig()
      .then(setConfig)
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load get_config"),
      );
  }, []);

  // Rewards always use the Basics payment token — no per-row token field.
  useEffect(() => {
    const token = paymentToken.trim() || DEFAULT_FT;
    setRewards((rows) =>
      rows.every((r) => r.token === token)
        ? rows
        : rows.map((r) => ({ ...r, token })),
    );
  }, [paymentToken]);

  // Odds % > 0 → ensure a reward row; % = 0 → drop that tier’s rows.
  useEffect(() => {
    const token = paymentToken.trim() || DEFAULT_FT;
    setRewards((rows) => {
      let next = rows.filter((r) => (percents[r.tier] ?? 0) > 0);
      for (const tier of TIERS) {
        if ((percents[tier] ?? 0) <= 0) continue;
        if (next.some((r) => r.tier === tier)) continue;
        const defaults = DEFAULT_REWARD_BY_TIER[tier];
        next = [
          ...next,
          {
            tier,
            token,
            amount_per_win: defaults.amount_per_win,
            quantity: defaults.quantity,
          },
        ];
      }
      // Keep tier order: Common → Mythic
      next = next.toSorted(
        (a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier),
      );
      const same =
        next.length === rows.length &&
        next.every(
          (r, i) =>
            rows[i]?.tier === r.tier &&
            rows[i]?.token === r.token &&
            rows[i]?.amount_per_win === r.amount_per_win &&
            rows[i]?.quantity === r.quantity,
        );
      return same ? rows : next;
    });
  }, [percents, paymentToken]);

  useEffect(() => {
    const ids = flowSteps.map((s) => s.id);
    const nodes = ids
      .map((id) => document.getElementById(`sec-${id}`))
      .filter((el): el is HTMLElement => !!el);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id.replace(/^sec-/, "") as
          | (typeof flowSteps)[number]["id"]
          | undefined;
        if (top && ids.includes(top)) setActiveSection(top);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: (typeof flowSteps)[number]["id"]) {
    document.getElementById(`sec-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveSection(id);
  }

  const tiers: TierConfig[] = useMemo(
    () =>
      TIERS.filter((t) => percents[t] > 0).map((t) => ({
        tier: t,
        probability_bps: percentToBps(percents[t]),
      })),
    [percents],
  );

  const bpsSum = sumTierBps(tiers);
  const tierError = validateTierSum(tiers);
  const slots = totalInventorySlots(rewards);
  const depositLines = useMemo(() => {
    return rewards.map((r, i) => {
      let amount = 0n;
      try {
        amount = requiredDepositAmount(r.amount_per_win, r.quantity);
      } catch {
        amount = 0n;
      }
      return { index: i, ...r, amount };
    });
  }, [rewards]);

  const feePreview = useMemo(() => {
    try {
      const total = BigInt(packPrice || "0") * BigInt(maxPacks);
      const feeBps = config?.platform_fee_bps ?? 0;
      return {
        total,
        fee: platformFeeAmount(total, feeBps),
        creator: total - platformFeeAmount(total, feeBps),
        feeBps,
      };
    } catch {
      return null;
    }
  }, [packPrice, maxPacks, config]);

  const canSubmit =
    !!signedAccountId &&
    !tierError &&
    name.trim().length > 0 &&
    slots >= maxPacks &&
    maxPacks >= 1 &&
    BigInt(packPrice || "0") > 0n &&
    paymentToken.trim().length > 0 &&
    rewards.every(
      (r) => BigInt(r.amount_per_win || "0") > 0n && r.quantity >= 1,
    ) &&
    step.id === "idle";

  function updateReward(i: number, patch: Partial<RewardRow>) {
    setRewards((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function runDepositsAndActivate(pending: PendingCreate) {
    const { machineId, deposits } = pending;
    let { nextDepositIndex, hashes, phase } = pending;
    const total = deposits.length;

    try {
      if (phase === "deposit") {
        for (let i = nextDepositIndex; i < deposits.length; i++) {
          const line = deposits[i];
          if (BigInt(line.amount) <= 0n) {
            nextDepositIndex = i + 1;
            writePending({
              machineId,
              nextDepositIndex,
              deposits,
              hashes,
              phase: "deposit",
            });
            continue;
          }
          setStep({
            id: "deposit",
            label: `Approve wallet: deposit ${i + 1}/${total} (${line.tier})…`,
            index: i + 1,
            total,
          });
          writePending({
            machineId,
            nextDepositIndex: i,
            deposits,
            hashes,
            phase: "deposit",
          });
          // NAJ actionCreators — InternalAction throws "Unsupported NAJ action" in Selector v10.
          const depositOut = await callFunction({
            contractId: line.token.trim(),
            method: "ft_transfer_call",
            args: {
              receiver_id: GACHA_CONTRACT,
              amount: line.amount,
              memo: null,
              msg: buildDepositRewardMsg(machineId, line.index),
            },
            gas: GAS_FT_TRANSFER_CALL,
            deposit: ONE_YOCTO,
          });
          const h = extractTxHash(depositOut);
          if (h) hashes = [...hashes, h];
          nextDepositIndex = i + 1;
          writePending({
            machineId,
            nextDepositIndex,
            deposits,
            hashes,
            phase: "deposit",
          });
        }
        phase = "verify";
        writePending({
          machineId,
          nextDepositIndex,
          deposits,
          hashes,
          phase,
        });
      }

      if (phase === "verify" || phase === "activate") {
        setStep({
          id: "verify",
          label: "Confirming deposits on-chain…",
        });
        writePending({
          machineId,
          nextDepositIndex,
          deposits,
          hashes,
          phase: "verify",
        });
        const verified = await waitForDepositsFunded(
          machineId,
          (attempt, deposited, need) => {
            setStep({
              id: "verify",
              label: `Confirming deposits… ${deposited}/${need} slots (${attempt})`,
            });
          },
        );
        if (!verified) {
          writePending({
            machineId,
            nextDepositIndex,
            deposits,
            hashes,
            phase: "verify",
          });
          setStep({
            id: "error",
            machineId,
            hashes,
            message: `Deposits not confirmed yet for machine #${machineId}. Approve any pending wallet prompts, then tap “Retry activate”. Or open the machine and Activate when inventory is full.`,
          });
          toast.error("Still confirming deposits — retry when ready");
          return;
        }
        phase = "activate";
        writePending({
          machineId,
          nextDepositIndex,
          deposits,
          hashes,
          phase,
        });
      }

      setStep({ id: "activate", label: "Activating machine…" });
      const actOut = await callFunction({
        contractId: GACHA_CONTRACT,
        method: "activate_machine",
        args: { machine_id: machineId },
        gas: GAS_ACTIVATE,
        deposit: "0",
      });
      const actHash = extractTxHash(actOut);
      if (actHash) hashes = [...hashes, actHash];

      const final = await getMachine(machineId);
      if (!final || final.status !== "Active") {
        writePending({
          machineId,
          nextDepositIndex,
          deposits,
          hashes,
          phase: "activate",
        });
        setStep({
          id: "error",
          machineId,
          hashes,
          message: `Activation incomplete (status: ${final?.status ?? "unknown"}). Tap “Retry activate”.`,
        });
        toast.error("Activation incomplete — retry");
        return;
      }

      writePending(null);
      setStep({ id: "done", machineId, hashes });
      toast.success(`Machine #${machineId} is Active`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Keep pending so wallet-redirect remounts can resume.
      setStep({
        id: "error",
        message: `${message} — tap Continue setup if the wallet redirected.`,
        machineId,
        hashes,
      });
      toast.error(message);
    }
  }

  async function onSubmit() {
    if (!signedAccountId) {
      toast.message("Connect your wallet first");
      return;
    }
    if (tierError) {
      toast.error(tierError);
      return;
    }
    if (slots < maxPacks) {
      toast.error(
        `Inventory slots (${slots}) must be >= max packs (${maxPacks})`,
      );
      return;
    }

    const rewardToken = paymentToken.trim();
    const rewardInputs: CreateRewardInput[] = rewards.map((r) => ({
      token: rewardToken,
      amount_per_win: r.amount_per_win,
      tier: r.tier,
      quantity: r.quantity,
    }));

    const args: CreateMachineArgs = {
      name: name.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      payment_token: paymentToken.trim(),
      pack_price: packPrice,
      max_packs: maxPacks,
      tiers,
      rewards: rewardInputs,
    };

    const deposits: PendingDepositLine[] = depositLines.map((d) => ({
      index: d.index,
      token: d.token.trim() || rewardToken,
      amount: d.amount.toString(),
      tier: d.tier,
    }));

    try {
      setStep({ id: "create", label: "Creating machine on-chain…" });
      const createDeposit = await getRequiredCreateDeposit(maxPacks);
      const createOut = await callFunction({
        contractId: GACHA_CONTRACT,
        method: "create_machine",
        args: { ...args } as Record<string, unknown>,
        gas: GAS_CREATE_MACHINE,
        deposit: createDeposit,
      });
      const hashes: string[] = [];
      const createHash = extractTxHash(createOut);
      if (createHash) hashes.push(createHash);

      const machineId =
        typeof createOut === "number"
          ? createOut
          : typeof createOut === "string" && /^\d+$/.test(createOut)
            ? Number(createOut)
            : extractCreateMachineId(createOut);

      if (machineId == null) {
        throw new Error(
          "create_machine submitted but machine id could not be resolved from the transaction result — check explorer",
        );
      }

      const pending: PendingCreate = {
        machineId,
        nextDepositIndex: 0,
        deposits,
        hashes,
        phase: "deposit",
      };
      writePending(pending);
      await runDepositsAndActivate(pending);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const pending = readPending();
      setStep({
        id: "error",
        message,
        machineId: pending?.machineId,
        hashes: pending?.hashes,
      });
      toast.error(message);
    }
  }

  async function continuePendingSetup() {
    const pending = readPending();
    if (!pending) {
      toast.message("No unfinished create found");
      return;
    }
    if (!signedAccountId) {
      toast.message("Connect your wallet first");
      return;
    }
    toast.message(`Continuing machine #${pending.machineId}…`);
    await runDepositsAndActivate(pending);
  }

  /** Resume verify+activate after deposits already sent. */
  async function retryActivate(machineId: number) {
    if (!signedAccountId) {
      toast.message("Connect your wallet first");
      return;
    }
    const existing = readPending();
    const hashes =
      step.id === "error"
        ? (step.hashes ?? existing?.hashes ?? [])
        : (existing?.hashes ?? []);
    const pending: PendingCreate = {
      machineId,
      nextDepositIndex: existing?.deposits.length ?? 0,
      deposits: existing?.deposits ?? [],
      hashes,
      phase: "verify",
    };
    writePending(pending);
    await runDepositsAndActivate(pending);
  }

  // After MyNearWallet redirect, resume unfinished create/deposit/activate.
  useEffect(() => {
    if (!signedAccountId) return;
    const pending = readPending();
    if (!pending) return;
    if (step.id !== "idle") return;
    setStep({
      id: "error",
      machineId: pending.machineId,
      hashes: pending.hashes,
      message: `Unfinished setup for machine #${pending.machineId} (wallet may have redirected). Tap “Continue setup” to deposit/activate.`,
    });
  }, [signedAccountId, step.id]);

  const busy = step.id !== "idle" && step.id !== "done" && step.id !== "error";

  return (
    <div className="page-wrap py-8 md:py-10">
      <div className="mb-10">
        <h1 className="text-h1 text-primary">Create a machine</h1>
        <p className="mt-3 max-w-2xl prose-narrow text-body text-secondary">
          Guided setup: Basics → Rewards → Deposit → Activate. You’ll approve
          each step in your wallet. Testnet only — not real money.
        </p>
      </div>

      {!signedAccountId && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-warning/25 bg-warning-tint text-small text-secondary">
          <p>Connect your wallet to create. A wallet is your login for NEAR.</p>
          <ConnectWalletButton size="sm" />
        </Card>
      )}

      {signedAccountId && (
        <StorageRegisterPanel
          className="mb-6"
          paymentToken={paymentToken.trim() || DEFAULT_FT}
          rewardTokens={[paymentToken.trim()].filter(Boolean)}
        />
      )}

      {/* Mobile progress */}
      <nav
        aria-label="Create sections"
        className="sticky top-16 z-20 mb-6 border border-border bg-base/95 px-3 py-2 shadow-card backdrop-blur-md lg:hidden"
      >
        <ol className="flex gap-1 overflow-x-auto">
          {flowSteps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "min-h-10 whitespace-nowrap rounded-[var(--radius-btn)] px-3 text-caption font-medium transition",
                  activeSection === s.id
                    ? "bg-brand/15 text-primary"
                    : "text-muted hover:text-secondary",
                )}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Desktop sticky rail */}
        <aside className="hidden lg:block">
          <nav
            aria-label="Create sections"
            className="sticky top-24 space-y-1 rounded-lg border border-border bg-raised p-2 shadow-card"
          >
            {flowSteps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-small transition",
                  activeSection === s.id
                    ? "bg-brand-tint text-primary"
                    : "text-muted hover:bg-subtle hover:text-secondary",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-caption font-semibold",
                    activeSection === s.id
                      ? "bg-brand text-white"
                      : "bg-subtle text-muted",
                  )}
                >
                  {i + 1}
                </span>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl space-y-8">
          <Card id="sec-create" className="scroll-mt-28 space-y-4">
            <h2 className="text-h3 text-primary">1 · Basics</h2>
            <h2 className="text-h3 text-primary">Name, price & odds</h2>
            <p className="text-caption text-muted">
              Example: “Neon Capsule Drop”, price 1000 tokens, 10 packs.
            </p>
            <label className="block text-small text-secondary">
              Name
              <Input
                className="mt-1.5"
                value={name}
                placeholder="Mystery name"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-small text-secondary">
              Description
              <Textarea
                className="mt-1.5"
                rows={3}
                value={description}
                placeholder="Mystery description"
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block text-small text-secondary">
              Image URL
              <Input className="mt-1.5" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </label>
            <label className="block text-small text-secondary">
              Payment token{" "}
              <span className="text-caption text-muted">
                (account id · shows as {tokenSymbol(paymentToken.trim() || DEFAULT_FT)})
              </span>
              <Input
                className="mt-1.5"
                value={paymentToken}
                onChange={(e) => setPaymentToken(e.target.value)}
              />
            </label>
            <CreateMemeTokenPanel compact className="mt-1" />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-small text-secondary">
                Pack price ({tokenSymbol(paymentToken.trim() || DEFAULT_FT)} units)
                <Input
                  className="mt-1.5 tabular"
                  value={packPrice}
                  onChange={(e) => setPackPrice(e.target.value)}
                />
              </label>
              <label className="block text-small text-secondary">
                Max packs
                <Input
                  type="number"
                  min={1}
                  className="mt-1.5 tabular"
                  value={maxPacks}
                  onChange={(e) => setMaxPacks(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-small font-medium text-primary">
                  Odds (must total 100%)
                </p>
                <span
                  className={cn(
                    "text-small tabular",
                    tierError ? "text-danger" : "text-success",
                  )}
                >
                  Running total: {(bpsSum / 100).toFixed(2)}%
                </span>
              </div>
              <ProgressBar
                className="mt-3"
                value={Math.min(bpsSum, 10_000)}
                max={10_000}
                barClassName={tierError ? "bg-danger" : "bg-success"}
                label="Must equal 100%"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {TIERS.map((t) => (
                  <label key={t} className="block text-small text-secondary">
                    {t} %
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      className="mt-1.5 tabular"
                      value={percents[t]}
                      onChange={(e) =>
                        setPercents((p) => ({ ...p, [t]: Number(e.target.value) }))
                      }
                    />
                  </label>
                ))}
              </div>
              {tierError && (
                <p className="animate-shake mt-2 text-small text-danger" role="alert">
                  {tierError}
                </p>
              )}
            </div>
          </Card>

          <Card id="sec-deposit" className="scroll-mt-28 space-y-5">
            <div>
              <h2 className="text-h3 text-primary">2 · Rewards</h2>
              <p className="mt-1.5 max-w-xl text-small text-secondary">
                Set amount and slots for each odds tier. Paid in{" "}
                <span className="font-medium text-primary">
                  {tokenSymbol(paymentToken.trim() || DEFAULT_FT)}
                </span>{" "}
                from Basics.
              </p>
            </div>

            {rewards.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-border bg-subtle/40 px-4 py-8 text-center text-small text-muted">
                Set a % above 0 in Odds to add reward tiers here.
              </p>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
                <div className="hidden grid-cols-[minmax(7rem,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(6rem,0.9fr)] gap-3 border-b border-border bg-subtle/80 px-4 py-2.5 text-caption font-medium text-muted md:grid">
                  <span>Tier</span>
                  <span>
                    Amount / win ({tokenSymbol(paymentToken.trim() || DEFAULT_FT)})
                  </span>
                  <span>Slots</span>
                  <span className="text-right">Deposit</span>
                </div>
                <ul className="divide-y divide-border">
                  {rewards.map((r, i) => (
                    <li
                      key={r.tier}
                      className="grid grid-cols-1 gap-3 px-4 py-3.5 md:grid-cols-[minmax(7rem,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(6rem,0.9fr)] md:items-center md:gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <TierBadge tier={r.tier} />
                        <span className="text-caption tabular text-muted">
                          {percents[r.tier]}%
                        </span>
                      </div>
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-caption text-muted md:sr-only">
                          Amount / win
                        </span>
                        <Input
                          className="tabular"
                          inputMode="numeric"
                          value={r.amount_per_win}
                          onChange={(e) =>
                            updateReward(i, { amount_per_win: e.target.value })
                          }
                          aria-label={`${r.tier} amount per win`}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-caption text-muted md:sr-only">
                          Slots
                        </span>
                        <Input
                          type="number"
                          min={1}
                          className="tabular"
                          value={r.quantity}
                          onChange={(e) =>
                            updateReward(i, {
                              quantity: Number(e.target.value),
                            })
                          }
                          aria-label={`${r.tier} quantity slots`}
                        />
                      </label>
                      <p className="text-caption tabular text-secondary md:text-right">
                        <span className="md:hidden">Deposit: </span>
                        {formatTokenAmount(
                          depositLines[i]?.amount.toString() ?? "0",
                        )}{" "}
                        {tokenSymbol(paymentToken.trim() || DEFAULT_FT)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-small",
                slots >= maxPacks
                  ? "border-success/30 bg-success-tint text-secondary"
                  : "border-danger/30 bg-danger-tint text-secondary",
              )}
            >
              <span>Inventory slots</span>
              <span
                className={cn(
                  "tabular font-semibold",
                  slots >= maxPacks ? "text-success" : "text-danger",
                )}
              >
                {slots} / need ≥ {maxPacks}
              </span>
            </div>
          </Card>

          <Card id="sec-verify" className="scroll-mt-28 text-small text-secondary">
            <h2 className="text-h3 text-primary">3 · Deposit</h2>
            <h2 className="mt-1 text-h3 text-primary">Costs before you sign</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                Storage for the machine: about 0.05 Ⓝ + 0.001 Ⓝ × max packs
                (exact amount is checked when you submit)
              </li>
              <li>
                Platform fee on sales:{" "}
                {config
                  ? `${(config.platform_fee_bps / 100).toFixed(2)}%`
                  : "loading…"}
              </li>
              {feePreview && (
                <li>
                  If all {maxPacks} packs sell at {formatTokenAmount(packPrice)} tokens:
                  platform {formatTokenAmount(feePreview.fee.toString())} · you{" "}
                  {formatTokenAmount(feePreview.creator.toString())}
                </li>
              )}
              <li>
                Reward deposits you’ll send now:{" "}
                {depositLines
                  .map((d) => `${d.tier} ${formatTokenAmount(d.amount.toString())}`)
                  .join(", ")}
              </li>
            </ul>
            <div className="mt-5 rounded-lg border border-border bg-subtle p-4">
              <p className="text-caption text-muted">Live preview</p>
              <p className="mt-1 text-h3 text-primary truncate">
                {name.trim() || "Untitled machine"}
              </p>
              <p className="mt-1 text-caption text-secondary line-clamp-2">
                {description.trim() || "Add a short description."}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-caption">
                <span>
                  Price{" "}
                  <span className="tabular text-primary">
                    {formatTokenAmount(packPrice || "0")} tokens
                  </span>
                </span>
                <span>
                  Packs{" "}
                  <span className="tabular text-primary">{maxPacks}</span>
                </span>
                <span>
                  Odds total{" "}
                  <span
                    className={cn(
                      "tabular",
                      tierError ? "text-danger" : "text-success",
                    )}
                  >
                    {(bpsSum / 100).toFixed(0)}%
                  </span>
                </span>
              </div>
            </div>
          </Card>

          <Card id="sec-activate" className="scroll-mt-28 space-y-4">
            <h2 className="text-h3 text-primary">4 · Activate</h2>
            <h2 className="text-h3 text-primary">Submit & go live</h2>
            <p className="text-caption text-muted">
              One click runs create → deposit rewards → verify → activate. Approve
              each wallet prompt.
            </p>
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {flowSteps.map((s) => {
                const status = flowStatus(s.id, step.id);
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "rounded-md border px-3 py-2 text-center text-caption font-medium",
                      status === "done" && "border-success/30 bg-success-tint text-success",
                      status === "active" && "border-brand/40 bg-brand-tint text-primary",
                      status === "pending" && "border-border bg-subtle text-muted",
                      status === "failed" && "border-danger/30 bg-danger-tint text-danger",
                    )}
                  >
                    {s.label}
                  </li>
                );
              })}
            </ol>
            {busy && (
              <p className="text-small text-brand" aria-live="polite">
                {"label" in step ? step.label : ""}
                {step.id === "deposit" && ` (${step.index}/${step.total})`}
              </p>
            )}

            {!signedAccountId ? (
              <ConnectWalletButton size="md" className="w-full sm:w-auto">
                Connect to create
              </ConnectWalletButton>
            ) : (
              <Button
                className="w-full sm:w-auto"
                loading={busy}
                disabled={!canSubmit}
                onClick={() => void onSubmit()}
              >
                {busy ? "Working…" : "Create & activate"}
              </Button>
            )}
            {signedAccountId && !canSubmit && !busy && (
              <p className="text-caption text-muted">
                {tierError
                  ? tierError
                  : !name.trim()
                    ? "Add a name"
                    : slots < maxPacks
                      ? `Add more reward slots (need ≥ ${maxPacks})`
                      : BigInt(packPrice || "0") <= 0n
                        ? "Set a pack price greater than 0"
                        : "Finish the form to enable Create"}
              </p>
            )}

            {step.id === "error" && (
              <ErrorPanel
                message={step.message}
                action={
                  <div className="flex flex-wrap gap-3">
                    {readPending() ? (
                      <button
                        type="button"
                        className="font-medium text-brand underline"
                        disabled={busy}
                        onClick={() => void continuePendingSetup()}
                      >
                        Continue setup
                      </button>
                    ) : null}
                    {step.machineId != null ? (
                      <>
                        <button
                          type="button"
                          className="font-medium text-brand underline"
                          disabled={busy}
                          onClick={() => void retryActivate(step.machineId!)}
                        >
                          Retry activate
                        </button>
                        <Link
                          className="underline"
                          href={`/machine/${step.machineId}`}
                        >
                          Open machine #{step.machineId}
                        </Link>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        writePending(null);
                        setStep({ id: "idle" });
                      }}
                    >
                      Reset and try again
                    </button>
                  </div>
                }
              />
            )}

            {step.id === "done" && (
              <div className="rounded-md border border-success/30 bg-success-tint p-4 text-small text-primary">
                <p>
                  Machine #{step.machineId} is Active.{" "}
                  <Link className="text-brand underline" href={`/machine/${step.machineId}`}>
                    Open machine →
                  </Link>
                </p>
                <ul className="mt-2 space-y-1">
                  {step.hashes.map((h) => (
                    <li key={h}>
                      <a
                        className="text-info underline"
                        href={explorerTxUrl(h)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {h.slice(0, 16)}…
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

