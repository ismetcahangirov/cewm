"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ErrorTexts = {
  eyebrow: string;
  title: string;
  body: string;
  retry: string;
  home: string;
  homeHref: string;
};

const ErrorTextsContext = createContext<ErrorTexts | null>(null);

export function ErrorTextsProvider({
  value,
  children,
}: {
  value: ErrorTexts;
  children: ReactNode;
}) {
  return <ErrorTextsContext value={value}>{children}</ErrorTextsContext>;
}

export function useErrorTexts(): ErrorTexts | null {
  return useContext(ErrorTextsContext);
}
