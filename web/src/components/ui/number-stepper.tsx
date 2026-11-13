"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function NumberStepper({
  value,
  min = 1,
  max,
  onChange,
  className,
  disabled,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  className?: string;
  disabled?: boolean;
}) {
  const clamp = (n: number) => {
    let next = n;
    if (Number.isNaN(next)) next = min;
    if (max != null) next = Math.min(max, next);
    return Math.max(min, next);
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="min-h-11 w-11 px-0"
      >
        <Minus className="h-4 w-4" strokeWidth={1.75} />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-20 text-center tabular"
        aria-label="Quantity"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-label="Increase quantity"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => onChange(clamp(value + 1))}
        className="min-h-11 w-11 px-0"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
      </Button>
    </div>
  );
}
