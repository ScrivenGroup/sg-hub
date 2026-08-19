"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitFeedbackAction } from "@/core/feedback/actions";
import { ShellModal } from "@/core/shell/ShellModal";

export function FeedbackCapture() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const onClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setPageTitle(document.title);
  }, [pathname]);

  function openCapture() {
    setSent(false);
    setError(null);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className="sg-btn-ghost hidden sm:inline-flex"
        onClick={openCapture}
      >
        Feedback
      </button>

      <button
        type="button"
        className="fixed right-5 z-40 flex h-14 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)] shadow-lg sm:hidden"
        style={{ bottom: "max(1.25rem, calc(1.25rem + env(safe-area-inset-bottom)))" }}
        onClick={openCapture}
        aria-label="Send feedback"
      >
        Feedback
      </button>

      <ShellModal
        open={open}
        titleId={titleId}
        onClose={onClose}
        panelClassName="max-w-md"
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
          <button type="button" className="sg-btn-ghost" onClick={onClose}>
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
      </ShellModal>
    </>
  );
}
