import { useEffect, useState } from "react";

/**
 * Tracks `prefers-reduced-motion`. All CSS animation classes in this app (see
 * `animate-fade-in` / `animate-shimmer` in tailwind.config.ts) are also gated globally via the
 * `@media (prefers-reduced-motion: reduce)` block in globals.css, so most components don't need
 * this directly — it's here for the rare case a component needs to branch in JS (e.g. skipping a
 * staggered reveal delay).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}
