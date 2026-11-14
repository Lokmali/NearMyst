"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll to #hash targets after App Router navigation / soft reloads.
 * Next often lands on the page without scrolling when the hash is present.
 */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;

      const id = decodeURIComponent(hash.slice(1));
      let attempts = 0;

      const tryScroll = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        attempts += 1;
        if (attempts < 12) {
          window.setTimeout(tryScroll, 50);
        }
      };

      tryScroll();
    };

    const t = window.setTimeout(scrollToHash, 0);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [pathname]);

  return null;
}
