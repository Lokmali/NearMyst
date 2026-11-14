"use client";

import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import {
  ButtonHTMLAttributes,
  forwardRef,
  type ComponentProps,
} from "react";
import { CapsuleSpinner } from "@/components/brand/capsule";
import { cn } from "@/lib/utils";

/* Dealt buttons=block: solid rect, soft radius, step on hover / press on click */
const buttonVariants = cva(
  "btn-block-press relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-btn)] font-semibold transition-[transform,filter,background-color,border-color,color,opacity] duration-base ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:transform-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-[var(--bg-base)] shadow-card hover:bg-brand-hover active:bg-brand-pressed disabled:opacity-50 disabled:shadow-none",
        secondary:
          "border border-border-strong bg-transparent text-primary hover:border-brand/50 hover:bg-subtle/80 active:bg-subtle disabled:opacity-50",
        ghost:
          "bg-transparent text-secondary hover:bg-subtle/80 hover:text-primary active:bg-subtle disabled:opacity-50",
        danger:
          "bg-danger/90 text-white hover:bg-danger active:bg-danger/80 disabled:opacity-50",
      },
      size: {
        sm: "h-9 min-h-9 px-4 text-small",
        md: "h-11 min-h-11 px-5 text-body",
        lg: "h-12 min-h-12 px-7 text-body",
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
        <span
          className={cn(
            "inline-flex min-w-0 items-center justify-center gap-2",
            loading && "opacity-90",
          )}
        >
          {children}
        </span>
      </button>
    );
  },
);

/** Real link with button styles — avoids invalid <a><button> nesting that breaks clicks. */
export type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  };

export function ButtonLink({
  className,
  variant,
  size,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export { buttonVariants };
