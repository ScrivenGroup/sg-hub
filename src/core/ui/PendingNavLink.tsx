"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { UiLoadingSpinner } from "@/core/shell/UiLoading";

export function PendingNavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      data-local-pending=""
      className={`relative ${className ?? ""}`}
      aria-busy={pending}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
    >
      {children}
      {pending ? (
        <span className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-[color-mix(in_srgb,var(--surface)_62%,transparent)]">
          <UiLoadingSpinner className="!h-7 !w-7" />
          <span className="sr-only">Loading</span>
        </span>
      ) : null}
    </Link>
  );
}
