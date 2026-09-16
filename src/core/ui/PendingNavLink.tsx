"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

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
        <span className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-[var(--surface)]/85 text-sm font-medium text-[var(--ink)]">
          Loading…
        </span>
      ) : null}
    </Link>
  );
}
