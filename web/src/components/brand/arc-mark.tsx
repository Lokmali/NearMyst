import Image from "next/image";
import { cn } from "@/lib/utils";

/** Brand mark: NEAR N + mystery box logo. */
export function ArcMark({
  className,
  size = 28,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo-v2.png"
      alt=""
      width={size}
      height={size}
      className={cn(
        "shrink-0 rounded-md object-cover border border-brand/70",
        className,
      )}
      aria-hidden
      priority={priority}
    />
  );
}
