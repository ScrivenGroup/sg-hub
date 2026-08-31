import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMrtShareById, shareIsLive } from "@/core/store/mrt-share";
import { guestMrtSignInAction } from "@/modules/sunwater-mrt/actions";
import { MRT_VERSION, MRT_VERSION_WHEN } from "@/modules/sunwater-mrt/version";

export default async function MrtGuestPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/w/sunwater-mrt");

  const params = await searchParams;
  const shareId = params.s?.trim() || "";
  const row = shareId ? await getMrtShareById(shareId) : null;
  const live = row ? shareIsLive(row) : false;
  const failed = params.error === "1";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--page)] px-4">
      <div className="w-full max-w-md rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Scriven Group"
            width={96}
            height={96}
            className="mb-4"
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Milestone Resourcing Tracker
          </h1>
          <p className="mt-1 text-xs font-medium text-[var(--muted)]">
            v{MRT_VERSION} · {MRT_VERSION_WHEN}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Shared view. Personal copy of the live plan.
          </p>
        </div>

        {!shareId ? (
          <p className="text-sm text-[var(--muted)]">
            You need the audience link from Scriven Group. The site staff login
            will not open this view.
          </p>
        ) : !live ? (
          <p className="text-sm text-[var(--muted)]">
            This share is off or has expired. Ask Scriven Group for a new link.
          </p>
        ) : (
          <form className="space-y-3" action={guestMrtSignInAction}>
            <input type="hidden" name="s" value={shareId} />
            {failed ? (
              <p className="text-sm text-[var(--rag-red)]">
                Name or password did not match. Try again, or ask for a new
                link.
              </p>
            ) : null}
            <label className="block text-sm font-medium text-[var(--ink)]">
              Your name
              <input
                className="sg-input mt-1"
                name="name"
                type="text"
                minLength={3}
                required
                autoComplete="name"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--ink)]">
              Share password
              <input
                className="sg-input mt-1"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="sg-btn-primary w-full">
              View tracker
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
