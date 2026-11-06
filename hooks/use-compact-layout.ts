"use client";

import { useEffect, useState } from "react";

const COMPACT_QUERY = "(max-width: 1023px)";

/** Match the Tailwind lg breakpoint without reading window during SSR. */
export function useCompactLayout(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}
