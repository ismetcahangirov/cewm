"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";

import { makeStore, type RootState } from "@/lib/store";

export function StoreProvider({
  children,
  preloadedState,
}: {
  children: ReactNode;
  preloadedState?: Partial<RootState>;
}) {
  const [store] = useState(() => makeStore(preloadedState));
  return <Provider store={store}>{children}</Provider>;
}
