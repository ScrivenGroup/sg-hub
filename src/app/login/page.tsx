import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, authFlags, signIn } from "@/auth";
import { logMrtGuestActivity } from "@/core/store/json-store";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  const { entraConfigured, devAuth, shareConfigured } = authFlags;

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
            Scriven Group
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Plain. Professional. Consistent.
          </p>
        </div>

        <div className="space-y-4">
          {entraConfigured ? (
            <form
              action={async () => {
                "use server";
                await signIn("microsoft-entra-id", { redirectTo: "/home" });
              }}
            >
              <button type="submit" className="sg-btn-primary w-full">
                Sign in with Microsoft
              </button>
            </form>
          ) : null}

          {shareConfigured ? (
            <form
              className="space-y-3"
              action={async (formData) => {
                "use server";
                const name = String(formData.get("name") || "").trim();
                const password = String(formData.get("password") || "");
                const h = await headers();
                const ip =
                  h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                  h.get("x-real-ip") ||
                  "unknown";
                await logMrtGuestActivity({
                  name: name || "unknown",
                  ip,
                  userAgent: h.get("user-agent") || "",
                  action: "share-login",
                });
                await signIn("mrt-share", {
                  name,
                  password,
                  ip,
                  redirectTo: "/w/sunwater-mrt",
                });
              }}
            >
              {entraConfigured ? (
                <p className="text-center text-xs text-[var(--muted)]">
                  Or view the Milestone Resourcing Tracker
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
              <button type="submit" className="sg-btn-secondary w-full">
                View MRT
              </button>
            </form>
          ) : null}

          {devAuth ? (
            <form
              className="space-y-3"
              action={async (formData) => {
                "use server";
                await signIn("dev-login", {
                  name: String(formData.get("name") || "Scriven Owner"),
                  redirectTo: "/home",
                });
              }}
            >
              {entraConfigured ? (
                <p className="text-center text-xs text-[var(--muted)]">
                  Or use Dev Login (local only)
                </p>
              ) : null}
              <label className="block text-sm font-medium text-[var(--ink)]">
                Display name
                <input
                  className="sg-input mt-1"
                  name="name"
                  type="text"
                  defaultValue="Scriven Owner"
                  autoComplete="name"
                />
              </label>
              <button type="submit" className="sg-btn-secondary w-full">
                Dev Login
              </button>
            </form>
          ) : null}

          {!entraConfigured && !devAuth && !shareConfigured ? (
            <p className="text-sm text-[var(--muted)]">
              No login providers configured. Set Entra env vars, MRT_SHARE_PASSWORD, or DEV_AUTH=true.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
