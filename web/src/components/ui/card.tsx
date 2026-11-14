import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  hover = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-md)] border border-border bg-raised p-5 transition-[transform,border-color,background-color] duration-fast ease-out md:p-6",
        hover &&
          "hover:-translate-y-0.5 hover:border-border-strong hover:bg-[#1f1913]",
        className,
      )}
      {...props}
    />
  );
}
