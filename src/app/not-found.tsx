import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--page)] px-4 text-center">
      <h1 className="text-2xl font-semibold text-[var(--ink)]">Page not found</h1>
      <p className="mt-2 text-[var(--muted)]">
        That route is not in the site network.
      </p>
      <Link href="/home" className="sg-btn-primary mt-6">
        Home
      </Link>
    </div>
  );
}
