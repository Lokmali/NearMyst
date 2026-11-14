"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { MachineCard } from "@/components/gacha/machine-card";
import { MachineCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { GetTestTokensWhenNeeded } from "@/components/ux/get-test-tokens";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { listMachines } from "@/lib/contract/client";
import type { MachineStatus, MachineView } from "@/lib/types";
import { duration, ease, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "remaining";
type StatusFilter = "All" | MachineStatus;

export default function ExplorePage() {
  const { reduced } = useMotionPreference();
  const [machines, setMachines] = useState<MachineView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [status, setStatus] = useState<StatusFilter>("All");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await listMachines(0, 100);
        if (!cancelled) setMachines(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setMachines([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = machines.filter((m) => {
      // Visitors never see Draft machines (seed leftovers / unfinished creates).
      if (m.status === "Draft") return false;
      if (status === "All") {
        /* Active + Paused */
      } else if (m.status !== status) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.creator.toLowerCase().includes(q) ||
        String(m.id).includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      if (sort === "remaining") return b.packs_remaining - a.packs_remaining;
      return b.id - a.id;
    });
    return list;
  }, [machines, query, sort, status]);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (query.trim()) {
    chips.push({
      key: "q",
      label: `Search: ${query.trim()}`,
      clear: () => setQuery(""),
    });
  }
  if (status !== "All") {
    chips.push({
      key: "status",
      label: `Status: ${status}`,
      clear: () => setStatus("All"),
    });
  }
  if (sort !== "newest") {
    chips.push({
      key: "sort",
      label: "Sort: packs left",
      clear: () => setSort("newest"),
    });
  }

  function clearFilters() {
    setQuery("");
    setStatus("All");
    setSort("newest");
  }

  return (
    <div className="page-wrap space-y-8 py-8 md:py-10">
      <FadeIn>
        <h1 className="text-h1 text-primary">Explore machines</h1>
        <p className="mt-3 max-w-2xl prose-narrow text-body text-secondary">
          Pick a machine, check the odds, and buy a mystery pack. Prefer an
          Active machine with packs left.
        </p>
      </FadeIn>

      <GetTestTokensWhenNeeded />

      <div className="sticky top-16 z-30 border border-border bg-base/95 px-4 py-3 shadow-card backdrop-blur-md md:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              strokeWidth={1.75}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, creator, or id"
              className="pl-9"
              aria-label="Search machines"
            />
          </div>
          <div
            role="group"
            aria-label="Sort"
            className="inline-flex rounded-[var(--radius-btn)] border border-border bg-subtle p-1"
          >
            {(
              [
                ["newest", "Newest"],
                ["remaining", "Packs left"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={cn(
                  "min-h-11 rounded-[var(--radius-btn)] px-3 text-caption font-medium transition",
                  sort === key
                    ? "bg-raised text-primary shadow-card"
                    : "text-muted hover:text-secondary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Status filter"
          >
            {(["All", "Active", "Paused"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "min-h-11 rounded-[var(--radius-btn)] border px-3 text-caption font-medium transition",
                  status === s
                    ? "border-brand/40 bg-brand/15 text-primary"
                    : "border-border text-muted hover:text-secondary",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-subtle px-3 text-caption text-secondary hover:text-primary"
              >
                {c.label}
                <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                <span className="sr-only">Clear</span>
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
        <p className="mt-2 text-caption text-muted">
          <span className="tabular">{filtered.length}</span> result
          {filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {error && (
        <ErrorPanel message="We couldn’t load machines. Check your connection and try again." />
      )}

      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MachineCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          title="No machines match"
          description="Clear filters or try another search."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )}

      <LayoutGroup>
        <motion.div
          layout={!reduced}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((m, i) => (
              <motion.div
                key={m.id}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{
                  duration: duration.base,
                  ease: ease.out,
                  delay: Math.min(i, 8) * stagger.base,
                }}
              >
                <MachineCard machine={m} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
