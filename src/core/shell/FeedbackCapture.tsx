"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitFeedbackAction } from "@/core/feedback/actions";

export function FeedbackCapture() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  useEffect(() => {
    setPageTitle(document.title);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="sg-btn-ghost hidden sm:inline-flex"
        onClick={() => {
          setSent(false);
          setError(null);
          setOpen(true);
        }}
      >
        Feedback
      </button>

      <button
        type="button"
        className="fixed right-5 z-40 flex h-14 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)] shadow-lg sm:hidden"
        style={{ bottom: "max(1.25rem, calc(1.25rem + env(safe-area-inset-bottom)))" }}
        onClick={() => {
          setSent(false);
          setError(null);
          setOpen(true);
        }}
        aria-label="Send feedback"
      >
        Feedback
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div className="flex min-h-full items-start justify-center sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(90dvh,calc(100dvh-1.5rem))] w-full max-w-md overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id={titleId}
                  className="text-lg font-semibold text-[var(--ink)]"
                >
                  Send feedback
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Bugs, ideas, housekeeping — stored in Internal → Feedback for
                  Cursor sessions.
                </p>
              </div>
              <button
                type="button"
                className="sg-btn-ghost"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            {sent ? (
              <p className="py-6 text-center font-medium text-[var(--ink)]">
                Thanks — logged.
              </p>
            ) : (
              <form
                className="space-y-4"
                action={(formData) => {
                  setError(null);
                  startTransition(async () => {
                    const result = await submitFeedbackAction(formData);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setSent(true);
                    setTimeout(() => {
                      setOpen(false);
                      setSent(false);
                    }, 1100);
                  });
                }}
              >
                <input type="hidden" name="pageHref" value={pathname} />
                <input type="hidden" name="pageTitle" value={pageTitle} />
                <label className="block text-sm font-medium">
                  Type
                  <select
                    name="kind"
                    className="sg-input mt-1"
                    defaultValue="bug"
                  >
                    <option value="bug">Bug</option>
                    <option value="idea">Idea</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Message
                  <textarea
                    name="message"
                    required
                    rows={5}
                    className="sg-input mt-1 min-h-[120px] py-3"
                    placeholder="What happened, or what should change?"
                  />
                </label>
                <p className="text-xs text-[var(--muted)]">Page: {pathname}</p>
                {error ? (
                  <p className="text-sm text-[var(--rag-red)]">{error}</p>
                ) : null}
                <button
                  type="submit"
                  className="sg-btn-primary w-full"
                  disabled={pending}
                >
                  {pending ? "Sending…" : "Submit"}
                </button>
              </form>
            )}
          </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
