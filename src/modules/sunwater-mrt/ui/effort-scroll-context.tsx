"use client";

import { createContext, useContext, type RefObject } from "react";

export type EffortFreeze = {
  xRoot: RefObject<HTMLDivElement | null>;
  frozenHost: HTMLDivElement | null;
  chartHost: HTMLDivElement | null;
  chromeTop: HTMLDivElement | null;
  chromeBottom: HTMLDivElement | null;
};

export const EffortScrollCtx = createContext<EffortFreeze | null>(null);

export function useEffortFreeze() {
  return useContext(EffortScrollCtx);
}

export function useEffortScrollRoot() {
  return useContext(EffortScrollCtx)?.xRoot ?? null;
}
