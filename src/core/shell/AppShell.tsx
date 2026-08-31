import Image from "next/image";
import Link from "next/link";
import { auth, isMrtGuest, signOut } from "@/auth";
import { getHubs, getChildren } from "@/core/registry";
import { BackButton } from "@/core/shell/BackButton";
import { SiteNetwork } from "@/core/shell/SiteNetwork";
import { FeedbackCapture } from "@/core/shell/FeedbackCapture";

export async function AppShell({
  children,
  currentHref,
  mainClassName,
  title,
}: {
  children: React.ReactNode;
  currentHref: string;
  mainClassName?: string;
  title?: React.ReactNode;
}) {
  const session = await auth();
  const guest = isMrtGuest(session);
  const hideShellBack =
    guest ||
    currentHref === "/w/sunwater-mrt" ||
    currentHref.startsWith("/w/sunwater-mrt/");
  const homeHref = guest ? "/w/sunwater-mrt" : "/home";
  const hubs = getHubs();
  const childrenByHub = Object.fromEntries(
    hubs.map((h) => [h.id, getChildren(h.id)]),
  );
  const initials =
    session?.user?.name
      ?.split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--page)] text-[var(--ink)]">
      <a href="#main" className="sg-skip print:hidden">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur print:hidden">
        <div className="flex items-center gap-3 px-4 py-2">
          <Link
            href={homeHref}
            className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
          >
            <Image
              src="/logo.png"
              alt="Scriven Group"
              width={36}
              height={36}
              className="rounded-md"
              priority
            />
            <span className="hidden text-sm font-semibold sm:inline">
              Scriven Group
            </span>
          </Link>
          {title ? (
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
              {typeof title === "string" ? (
                <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                  {title}
                </h1>
              ) : (
                title
              )}
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          <nav className="ml-auto flex shrink-0 items-center gap-2" aria-label="App">
            {hideShellBack ? null : <BackButton />}
            {guest ? null : (
              <Link href="/home" className="sg-btn-ghost">
                Home
              </Link>
            )}
            {guest ? null : (
              <SiteNetwork
                hubs={hubs}
                childrenByHub={childrenByHub}
                currentHref={currentHref}
              />
            )}
            {guest ? null : <FeedbackCapture />}
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold text-[var(--surface)]">
                <span className="sr-only">Profile menu</span>
                {initials}
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                <p className="truncate text-sm font-medium">
                  {session?.user?.name}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {session?.user?.role === "mrt-guest"
                    ? "View session · personal copy"
                    : session?.user?.email}
                </p>
                <form
                  className="mt-3"
                  action={async () => {
                    "use server";
                    const dest =
                      session?.user?.role === "mrt-guest"
                        ? session.user.shareId
                          ? `/w/sunwater-mrt/guest?s=${encodeURIComponent(session.user.shareId)}`
                          : "/w/sunwater-mrt/guest"
                        : "/login";
                    await signOut({ redirectTo: dest });
                  }}
                >
                  <button type="submit" className="sg-btn-secondary w-full">
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </nav>
        </div>
      </header>
      <main
        id="main"
        className={
          mainClassName ?? "mx-auto max-w-5xl px-4 pb-24 pt-8 sm:pb-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
