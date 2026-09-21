import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, authFlags, signIn } from "@/auth";
import { WipDeskBadge } from "@/core/shell/WipDeskBadge";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  const { entraConfigured, devAuth } = authFlags;

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
          <div className="mt-2">
            <WipDeskBadge />
          </div>
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

          {!entraConfigured && !devAuth ? (
            <p className="text-sm text-[var(--muted)]">
              No login providers configured. Set Entra env vars or DEV_AUTH=true.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
