"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
  iconOnly = false,
}: {
  value: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void onCopy()}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "min-h-9 gap-1.5 px-2 text-caption text-muted hover:text-primary",
        iconOnly && "w-9 px-0",
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" strokeWidth={1.75} />
      ) : (
        <Copy className="h-4 w-4" strokeWidth={1.75} />
      )}
      {!iconOnly && (copied ? "Copied" : label)}
    </Button>
  );
}
