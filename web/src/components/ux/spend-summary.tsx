import { formatTokenAmount } from "@/lib/format";

/** Small plain-language cost summary before a spend action. */
export function SpendSummary({
  pay,
  get,
  feeLabel,
}: {
  pay: string;
  get: string;
  feeLabel?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-subtle px-3 py-2.5 text-caption text-secondary">
      <div className="flex justify-between gap-3">
        <span>You pay</span>
        <span className="tabular font-medium text-primary">
          {formatTokenAmount(pay)} tokens
        </span>
      </div>
      <div className="mt-1 flex justify-between gap-3">
        <span>You get</span>
        <span className="font-medium text-primary">{get}</span>
      </div>
      {feeLabel && (
        <div className="mt-1 flex justify-between gap-3 text-muted">
          <span>Fee</span>
          <span>{feeLabel}</span>
        </div>
      )}
    </div>
  );
}
