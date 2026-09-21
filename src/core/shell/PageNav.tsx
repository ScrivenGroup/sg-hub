import Link from "next/link";
import { getNodeByHref, getNodeById } from "@/core/registry";

type Crumb = { href: string; label: string };

function buildTrail(href: string): Crumb[] {
  if (href === "/home") {
    return [{ href: "/home", label: "Home" }];
  }

  const trail: Crumb[] = [{ href: "/home", label: "Home" }];
  const node = getNodeByHref(href);
  if (!node) {
    return trail;
  }

  const ancestors: Crumb[] = [];
  let parentId = node.parentId;
  while (parentId) {
    const parent = getNodeById(parentId);
    if (!parent) break;
    ancestors.unshift({ href: parent.href, label: parent.title });
    parentId = parent.parentId;
  }

  trail.push(...ancestors);
  trail.push({ href: node.href, label: node.title });
  return trail;
}

export function PageNav({
  href,
  compact = false,
  hideBack = false,
  className,
}: {
  href: string;
  compact?: boolean;
  hideBack?: boolean;
  className?: string;
}) {
  const trail = buildTrail(href);
  const back =
    hideBack || href === "/home"
      ? null
      : trail.length >= 2
        ? trail[trail.length - 2]
        : { href: "/home", label: "Home" };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-sm ${
        compact ? "mb-2" : "mb-4 gap-3"
      } ${className ?? ""}`}
    >
      {back ? (
        <Link
          href={back.href}
          className={`sg-btn-ghost shrink-0 px-2 text-sm ${
            compact ? "min-h-8 py-0.5" : "py-1"
          }`}
        >
          ← Back
        </Link>
      ) : null}
      <nav aria-label="Breadcrumb" className="min-w-0 text-[var(--muted)]">
        <ol className="flex flex-wrap items-center gap-1">
          {trail.map((crumb, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={`${crumb.href}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <span aria-hidden>/</span> : null}
                {last ? (
                  <span className="font-medium text-[var(--ink)]" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:underline">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
