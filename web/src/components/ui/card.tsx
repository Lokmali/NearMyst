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
        "relative rounded-lg border border-border bg-raised p-5 shadow-card transition duration-fast ease-out md:p-6",
        hover &&
          "hover:-translate-y-0.5 hover:border-border-strong hover:bg-[#12121f]",
        className,
      )}
      {...props}
    />
  );
}
