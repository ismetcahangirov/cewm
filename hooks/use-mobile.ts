import { useSyncExternalStore } from "react";

const mobileQuery = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );
}
