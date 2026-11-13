"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { CapsuleSpinner } from "@/components/brand/capsule";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md font-semibold transition duration-base ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-[#7C6CFF] to-[#5B8CFF] text-white shadow-card hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:shadow-none",
        secondary:
          "border border-border bg-subtle text-primary hover:border-border-strong hover:bg-[#22223A] active:bg-subtle disabled:opacity-50",
        ghost:
          "bg-transparent text-secondary hover:bg-subtle/80 hover:text-primary active:bg-subtle disabled:opacity-50",
        danger:
          "bg-danger/90 text-white hover:bg-danger active:bg-danger/80 disabled:opacity-50",
      },
      size: {
        sm: "h-9 min-h-9 px-3 text-small",
        md: "h-11 min-h-11 px-4 text-body",
        lg: "h-[52px] min-h-[52px] px-5 text-body",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, loading, disabled, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <CapsuleSpinner className="scale-90" label="Loading" /> : null}
        <span className={cn(loading && "opacity-90")}>{children}</span>
      </button>
    );
  },
);

export { buttonVariants };
