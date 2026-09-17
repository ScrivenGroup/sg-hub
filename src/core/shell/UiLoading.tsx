"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Hub “loading” veil — opaque screen + spinner.
 * Use for tab/filter/navigation waits. Harvest and uploads keep the processing card.
 */
type LoadingKind = "ui" | "nav";

type UiLoadingApi = {
  begin: (kind?: LoadingKind) => void;
  end: (kind?: LoadingKind) => void;
};

const UiLoadingContext = createContext<UiLoadingApi | null>(null);

export function useUiLoading(): UiLoadingApi | null {
  return useContext(UiLoadingContext);
}

/** Show the loading veil, then run `action` as a React transition so the veil can paint first. */
export function useUiLoadingGate() {
  const loading = useUiLoading();
  const [isPending, startTransition] = useTransition();
  const armed = useRef(false);
  useEffect(() => {
    if (armed.current && !isPending) {
      armed.current = false;
      loading?.end("ui");
    }
  }, [isPending, loading]);
  return (action: () => void) => {
    loading?.begin("ui");
    armed.current = true;
    startTransition(() => action());
  };
}

export function UiLoadingSpinner() {
  return <span className="sg-loading-spin" aria-hidden />;
}

export function UiLoadingScreen() {
  return (
    <div
      className="flex min-h-[40vh] w-full items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <UiLoadingSpinner />
    </div>
  );
}

function UiLoadingOverlay({ open }: { open: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!open || !mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[2147482900] flex cursor-wait items-center justify-center bg-[color-mix(in_srgb,var(--page)_86%,var(--ink))]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <UiLoadingSpinner />
    </div>,
    document.body,
  );
}

function NavigationLoading() {
  const loading = useUiLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const begin = loading?.begin;
  const end = loading?.end;

  useEffect(() => {
    end?.("nav");
  }, [pathname, searchParams, end]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const a = target?.closest("a[href]");
      if (!a) return;
      if (a.getAttribute("download") != null) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      const targetAttr = a.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      begin?.("nav");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [begin]);

  return null;
}

export function UiLoadingProvider({ children }: { children: ReactNode }) {
  const uiCount = useRef(0);
  const navCount = useRef(0);
  const [open, setOpen] = useState(false);

  const sync = useCallback(() => {
    setOpen(uiCount.current + navCount.current > 0);
  }, []);

  const begin = useCallback(
    (kind: LoadingKind = "ui") => {
      if (kind === "nav") navCount.current += 1;
      else uiCount.current += 1;
      sync();
    },
    [sync],
  );

  const end = useCallback(
    (kind: LoadingKind = "ui") => {
      if (kind === "nav") navCount.current = Math.max(0, navCount.current - 1);
      else uiCount.current = Math.max(0, uiCount.current - 1);
      sync();
    },
    [sync],
  );

  const value = useMemo(() => ({ begin, end }), [begin, end]);

  return (
    <UiLoadingContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <NavigationLoading />
      </Suspense>
      <UiLoadingOverlay open={open} />
    </UiLoadingContext.Provider>
  );
}
