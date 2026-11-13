"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ErrorPanel } from "@/components/ui/error-panel";
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
import { GACHA_CONTRACT, explorerTxUrl } from "@/lib/config";
import {
  percentToBps,
  platformFeeAmount,
  requiredDepositAmount,
  sumTierBps,
  totalInventorySlots,
  validateTierSum,
} from "@/lib/odds";
import { formatTokenAmount } from "@/lib/format";
import { extractCreateMachineId, extractTxHash } from "@/lib/tx";
import type { PlatformConfig, Tier, TierConfig } from "@/lib/types";

const TIERS: Tier[] = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
const DEFAULT_FT =
  process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN ?? "ft.nearmyst.testnet";

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
  | { id: "error"; message: string };

const flowSteps = [
  { id: "create", label: "Basics" },
  { id: "deposit", label: "Rewards" },
  { id: "verify", label: "Deposit" },
  { id: "activate", label: "Activate" },
] as const;

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
  const { signedAccountId, signIn, callFunction } = useWalletSelector();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [name, setName] = useState("TESTNET DEMO Machine");
  const [description, setDescription] = useState(
    "TESTNET DEMO - FT rewards only. Not production secure.",
  );
  const [imageUrl, setImageUrl] = useState(
    "https://example.com/nearmyst-testnet-demo.png",
  );
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
    rewards.every(
      (r) =>
        r.token.trim() &&
        BigInt(r.amount_per_win || "0") > 0n &&
        r.quantity >= 1,
    ) &&
    step.id === "idle";

  function updateReward(i: number, patch: Partial<RewardRow>) {
    setRewards((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onSubmit() {
    if (!signedAccountId) {
      signIn();
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

    const rewardInputs: CreateRewardInput[] = rewards.map((r) => ({
      token: r.token.trim(),
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

    const hashes: string[] = [];
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
      const createHash = extractTxHash(createOut);
      if (createHash) hashes.push(createHash);

      // Prefer tx return value / EVENT_JSON machine_created (not "newest by creator").
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

      for (let i = 0; i < depositLines.length; i++) {
        const line = depositLines[i];
        setStep({
          id: "deposit",
          label: `Depositing reward #${i} (${line.tier})…`,
          index: i + 1,
          total: depositLines.length,
        });
        // Use callFunction (NAJ actionCreators) — signAndSendTransactions with
        // InternalAction { type, params } throws "Unsupported NAJ action" in Selector v10.
        const depositOut = await callFunction({
          contractId: line.token.trim(),
          method: "ft_transfer_call",
          args: {
            receiver_id: GACHA_CONTRACT,
            amount: line.amount.toString(),
            memo: null,
            msg: buildDepositRewardMsg(machineId, i),
          },
          gas: GAS_FT_TRANSFER_CALL,
          deposit: ONE_YOCTO,
        });
        const h = extractTxHash(depositOut);
        if (h) hashes.push(h);
      }

      setStep({ id: "verify", label: "Verifying deposits on-chain…" });
      let verified = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((r) => setTimeout(r, 1000));
        const m = await getMachine(machineId);
        if (!m) continue;
        const deposited = m.rewards.reduce(
          (s, r) => s + r.quantity_deposited,
          0,
        );
        if (deposited >= m.max_packs) {
          verified = true;
          break;
        }
      }
      if (!verified) {
        throw new Error(
          `Deposits not verified on-chain for machine #${machineId}. Activate blocked until inventory >= max_packs.`,
        );
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
      if (actHash) hashes.push(actHash);

      const final = await getMachine(machineId);
      if (!final || final.status !== "Active") {
        throw new Error(
          `activate_machine finished but status is ${final?.status ?? "unknown"}`,
        );
      }

      setStep({ id: "done", machineId, hashes });
      toast.success(`Machine #${machineId} is Active`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setStep({ id: "error", message });
      toast.error(message);
    }
  }

  const busy = step.id !== "idle" && step.id !== "done" && step.id !== "error";

  return (
    <div className="mx-auto max-w-container">
      <div className="mb-8">
        <h1 className="text-h1 text-primary">Create a machine</h1>
        <p className="mt-2 max-w-2xl prose-narrow text-small text-secondary">
          Guided setup: Basics → Rewards → Deposit → Activate. You’ll approve
          each step in your wallet. Testnet only — not real money.
        </p>
      </div>

      {!signedAccountId && (
        <Card className="mb-6 border-warning/25 bg-warning-tint text-small text-secondary">
          Connect your wallet to create. A wallet is your login for NEAR.{" "}
          <button type="button" className="font-medium text-primary underline" onClick={() => signIn()}>
            Connect Wallet
          </button>
        </Card>
      )}

      {signedAccountId && (
        <StorageRegisterPanel
          className="mb-6"
          paymentToken={paymentToken.trim() || DEFAULT_FT}
          rewardTokens={rewards.map((r) => r.token.trim()).filter(Boolean)}
        />
      )}

      {/* Mobile progress */}
      <nav
        aria-label="Create sections"
        className="sticky top-16 z-20 -mx-4 mb-6 border-b border-border bg-base/90 px-4 py-2 backdrop-blur-md lg:hidden"
      >
        <ol className="flex gap-1 overflow-x-auto">
          {flowSteps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "min-h-10 whitespace-nowrap rounded-full px-3 text-caption font-medium transition",
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
            <div className="text-eyebrow text-muted">1 · Basics</div>
            <h2 className="text-h3 text-primary">Name, price & odds</h2>
            <p className="text-caption text-muted">
              Example: “Neon Capsule Drop”, price 1000 tokens, 10 packs.
            </p>
            <label className="block text-small text-secondary">
              Name
              <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-small text-secondary">
              Description
              <Textarea
                className="mt-1.5"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block text-small text-secondary">
              Image URL
              <Input className="mt-1.5" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </label>
            <label className="block text-small text-secondary">
              Payment token{" "}
              <span className="text-caption text-muted">(account id of the token people pay with)</span>
              <Input
                className="mt-1.5"
                value={paymentToken}
                onChange={(e) => setPaymentToken(e.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-small text-secondary">
                Pack price (token units)
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

          <Card id="sec-deposit" className="scroll-mt-28 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-eyebrow text-muted">2 · Rewards</div>
                <h2 className="mt-1 text-h3 text-primary">What people can win</h2>
                <p className="mt-1 text-caption text-muted">
                  Fund prizes up front. Total reward slots must be at least max packs.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setRewards((r) => [
                    ...r,
                    {
                      tier: "Common",
                      token: paymentToken,
                      amount_per_win: "100",
                      quantity: 1,
                    },
                  ])
                }
              >
                Add reward
              </Button>
            </div>
            {rewards.map((r, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-md border border-border bg-subtle p-4 sm:grid-cols-2"
              >
                <label className="text-caption text-muted">
                  Tier
                  <Select
                    className="mt-1.5"
                    value={r.tier}
                    onChange={(e) => updateReward(i, { tier: e.target.value as Tier })}
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-caption text-muted">
                  Token
                  <Input
                    className="mt-1.5"
                    value={r.token}
                    onChange={(e) => updateReward(i, { token: e.target.value })}
                  />
                </label>
                <label className="text-caption text-muted">
                  Amount per win
                  <Input
                    className="mt-1.5 tabular"
                    value={r.amount_per_win}
                    onChange={(e) => updateReward(i, { amount_per_win: e.target.value })}
                  />
                </label>
                <label className="text-caption text-muted">
                  Quantity (slots)
                  <Input
                    type="number"
                    min={1}
                    className="mt-1.5 tabular"
                    value={r.quantity}
                    onChange={(e) => updateReward(i, { quantity: Number(e.target.value) })}
                  />
                </label>
                <p className="sm:col-span-2 text-caption text-muted">
                  Required deposit:{" "}
                  <span className="tabular text-secondary">
                    {formatTokenAmount(depositLines[i]?.amount.toString() ?? "0")} tokens
                  </span>
                  {rewards.length > 1 && (
                    <button
                      type="button"
                      className="ml-3 text-danger underline"
                      onClick={() =>
                        setRewards((rows) => rows.filter((_, idx) => idx !== i))
                      }
                    >
                      Remove
                    </button>
                  )}
                </p>
              </div>
            ))}
            <p className="text-small text-secondary">
              Inventory slots:{" "}
              <span
                className={cn(
                  "tabular font-medium",
                  slots >= maxPacks ? "text-success" : "text-danger",
                )}
              >
                {slots}
              </span>{" "}
              / need ≥ {maxPacks}
            </p>
          </Card>

          <Card id="sec-verify" className="scroll-mt-28 text-small text-secondary">
            <div className="text-eyebrow text-muted">3 · Deposit</div>
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
            <div className="text-eyebrow text-muted">4 · Activate</div>
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

            <Button
              className="w-full sm:w-auto"
              loading={busy}
              disabled={!canSubmit && !!signedAccountId}
              onClick={() => {
                if (!signedAccountId) {
                  signIn();
                  return;
                }
                void onSubmit();
              }}
            >
              {!signedAccountId
                ? "Connect to create"
                : busy
                  ? "Working…"
                  : "Create & activate"}
            </Button>
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
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setStep({ id: "idle" })}
                  >
                    Reset and try again
                  </button>
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

