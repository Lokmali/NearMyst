import type { ReactNode } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MEME_COOKING_URL = "https://meme.cooking/";

/** Outbound CTA — create an FT on meme.cooking, then paste the account id into NearMyst. */
export function CreateMemeTokenPanel({
  className,
  compact = false,
}: {
  className?: string;
  /** Tighter strip for embedding under token inputs. */
  compact?: boolean;
}) {
  return (
    <aside
      className={cn(
        "rounded-[var(--radius-md)] border border-brand/35 bg-brand-tint/60",
        compact ? "px-3.5 py-3" : "px-4 py-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          compact
            ? "flex-col sm:flex-row sm:items-center sm:justify-between"
            : "flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        )}
      >
        <div className="min-w-0 flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand"
            aria-hidden
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-small font-semibold text-primary">
              Need your own meme token?
            </p>
            <p className="mt-1 text-caption text-secondary">
              Create one on meme.cooking, then paste the token account id into
              the fields above. Any NEAR token works.
            </p>
          </div>
        </div>
        <a
          href={MEME_COOKING_URL}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "shrink-0",
          )}
        >
          Create meme token
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </a>
      </div>
    </aside>
  );
}

/** Text link for FAQ / compact footers. */
export function CreateMemeTokenLink({
  className,
  children = "Create a meme token on meme.cooking",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={MEME_COOKING_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-medium text-brand underline-offset-2 hover:text-brand-hover hover:underline",
        className,
      )}
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
    </a>
  );
}
