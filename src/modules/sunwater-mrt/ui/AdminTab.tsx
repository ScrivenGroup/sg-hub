"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createMrtShareAction,
  deleteMrtShareAction,
  disableMrtShareAction,
  listMrtGuestActivityAction,
  listMrtSharesAction,
  revealMrtSharePasswordAction,
  setMrtSharePasswordAction,
} from "../actions";
import {
  MRT_SHARE_DURATIONS,
  type MrtAudienceSharePublic,
  type MrtGuestActivity,
} from "../share-public";
import { SubTabs } from "./SubTabs";

const SUBS = ["Sharing", "Guest activity", "Guides"] as const;
const GUIDES = ["How to share"] as const;

const INTRO: Record<(typeof SUBS)[number], string> = {
  Sharing: "Create a labelled guest link. Viewers get a personal copy they can click-drag.",
  "Guest activity": "Who opened a share on this instance.",
  Guides: "How to share a guest link. Product usage is on the Help tab.",
};

function guestLink(id: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/w/sunwater-mrt/guest?s=${encodeURIComponent(id)}`;
}

function formatExpiry(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

function GuideFigure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="my-4 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full" />
      <figcaption className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
        {caption}
      </figcaption>
    </figure>
  );
}

function HowToShareGuide() {
  return (
    <article className="mrt-how-to-share max-w-4xl space-y-6 text-sm leading-relaxed text-[var(--ink)]">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Milestone Resourcing Tracker · Staff guide
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">How to share</h2>
        <p className="max-w-2xl text-[var(--muted)]">
          Give an external audience a personal copy of the live plan they can
          click-drag. They do not use the site staff login. You create a
          labelled link in this app and send the password separately.
        </p>
        <p className="mrt-guide-downloads flex flex-wrap gap-3 print:hidden">
          <a className="sg-btn-secondary text-sm" href="/mrt-guest-share.html" download>
            Download HTML
          </a>
          <button
            type="button"
            className="sg-btn-secondary text-sm"
            onClick={() => window.print()}
          >
            Download PDF
          </button>
        </p>
      </header>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">1. Open Admin → Sharing</h3>
        <p>
          Sign in as staff (Microsoft or Dev Login). In the tracker, open{" "}
          <strong>Admin</strong>, then <strong>Sharing</strong>. Do not send
          people to <code>/login</code> — that door is for staff only.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">2. Add an audience</h3>
        <p>
          Use a label you will remember (for example Board pack). Set a password
          and how long the link should last, then create the share.
        </p>
        <GuideFigure
          src="/mrt-guide/admin-sharing.png"
          alt="Admin Sharing: add audience row and audience table"
          caption="Admin → Sharing. Add an audience on one row; the table lists each link."
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">3. Send the link and the password</h3>
        <p>
          <strong>Copy link</strong> and send that URL. Tell them the password{" "}
          <strong>another way</strong> — not in the URL and not in the same
          message if you can avoid it.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">4. What the viewer sees</h3>
        <p>
          They open the guest page, enter their name and that password, and get
          a <strong>personal copy</strong> of the live plan. They can drag and
          save on that desk. Reset restores the current live copy. They cannot
          change the live plan. Site/Staff login will not open this view.
        </p>
        <GuideFigure
          src="/mrt-guide/guest-gate.png"
          alt="Guest sign-in page for the Milestone Resourcing Tracker"
          caption="Guest gate. Name and share password only — no Microsoft button."
        />
        <GuideFigure
          src="/mrt-guide/guest-readonly.png"
          alt="Read-only tracker Gantt for a guest session"
          caption="After sign-in they work a personal copy. Reset restores live; they cannot save to live."
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">5. Cut access</h3>
        <p>
          Disable that audience (or let it expire) to cut that link. Other
          audiences stay on. Replace password on a row if you need to rotate
          one audience without touching the others.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">6. If View stops working</h3>
        <p>
          A zip deploy can clear shares stored on disk. Recreate the audience
          in <strong>Admin → Sharing</strong> — not in Azure. Guest activity
          on this instance is a file log, not an audit archive.
        </p>
      </section>
    </article>
  );
}

function SharingPanel() {
  const [shares, setShares] = useState<MrtAudienceSharePublic[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [audience, setAudience] = useState("");
  const [password, setPassword] = useState("");
  const [hours, setHours] = useState(168);
  const [pwRow, setPwRow] = useState<string | null>(null);
  const [pwEdits, setPwEdits] = useState<Record<string, string>>({});
  const [pwHours, setPwHours] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<{
    id: string;
    password: string;
    until: number;
  } | null>(null);

  function refresh() {
    void listMrtSharesAction().then(setShares);
  }

  useEffect(() => {
    refresh();
  }, []);

  const [revealTick, setRevealTick] = useState(0);
  useEffect(() => {
    if (!revealed) return;
    const left = revealed.until - Date.now();
    if (left <= 0) {
      setRevealed(null);
      return;
    }
    const hide = window.setTimeout(() => setRevealed(null), left);
    const tick = window.setInterval(() => setRevealTick((n) => n + 1), 250);
    return () => {
      window.clearTimeout(hide);
      window.clearInterval(tick);
    };
  }, [revealed]);
  void revealTick;

  function copyLink(id: string) {
    const url = guestLink(id);
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 2000);
    });
  }

  function viewPassword(id: string) {
    setError("");
    start(async () => {
      const result = await revealMrtSharePasswordAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRevealed({
        id,
        password: result.password,
        until: Date.now() + 10_000,
      });
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        One link per audience. Guest logins are tagged with that label.
        Password is not in the URL.
      </p>

      <form
        className="flex flex-wrap items-end gap-3 border-b border-[var(--border)] pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          start(async () => {
            const result = await createMrtShareAction({
              audience,
              password,
              durationHours: hours,
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setAudience("");
            setPassword("");
            setShares(await listMrtSharesAction());
          });
        }}
      >
        <label className="min-w-[12rem] flex-1 text-sm">
          Audience
          <input
            className="mrt-input mt-1 w-full"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            required
            maxLength={80}
            placeholder="Board pack"
          />
        </label>
        <label className="min-w-[10rem] flex-1 text-sm">
          Password
          <input
            className="mrt-input mt-1 w-full"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
            autoComplete="new-password"
          />
        </label>
        <label className="w-36 text-sm">
          Expiry
          <select
            className="mrt-select mt-1 w-full"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          >
            {MRT_SHARE_DURATIONS.map((d) => (
              <option key={d.hours} value={d.hours}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="mrt-btn-secondary" disabled={pending}>
          {pending ? "Saving…" : "Create share"}
        </button>
      </form>
      {error ? (
        <p className="text-sm text-[var(--rag-red)]">{error}</p>
      ) : null}

      {shares.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No audiences yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="mrt-table w-full">
            <thead>
              <tr>
                <th>Audience</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shares.map((row) => {
                const expired = Date.parse(row.expiresAt) <= Date.now();
                const on = row.enabled && !expired;
                return (
                  <tr key={row.id}>
                    <td>{row.audience}</td>
                    <td>{on ? "On" : row.enabled ? "Expired" : "Off"}</td>
                    <td className="whitespace-nowrap text-xs">
                      {formatExpiry(row.expiresAt)}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          className="mrt-btn-secondary"
                          onClick={() => copyLink(row.id)}
                        >
                          {copied === row.id ? "Copied" : "Copy link"}
                        </button>
                        <button
                          type="button"
                          className="mrt-btn-secondary"
                          disabled={pending}
                          title={
                            row.hasVault
                              ? "Show password for 10 seconds"
                              : "Not stored — replace password to enable view"
                          }
                          onClick={() => viewPassword(row.id)}
                        >
                          View password
                        </button>
                        {row.enabled ? (
                          <button
                            type="button"
                            className="mrt-btn-secondary"
                            disabled={pending}
                            onClick={() => {
                              start(async () => {
                                await disableMrtShareAction(row.id);
                                setShares(await listMrtSharesAction());
                              });
                            }}
                          >
                            Disable
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="mrt-btn-secondary"
                          onClick={() =>
                            setPwRow((cur) => (cur === row.id ? null : row.id))
                          }
                        >
                          {pwRow === row.id ? "Cancel" : "Replace password"}
                        </button>
                        <button
                          type="button"
                          className="mrt-btn-secondary"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Delete audience “${row.audience}”? This cannot be undone.`,
                              )
                            ) {
                              return;
                            }
                            start(async () => {
                              const result = await deleteMrtShareAction(row.id);
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setRevealed((cur) =>
                                cur?.id === row.id ? null : cur,
                              );
                              setShares(await listMrtSharesAction());
                            });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                      {revealed?.id === row.id ? (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
                            {revealed.password}
                          </span>
                          <button
                            type="button"
                            className="mrt-btn-secondary"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                revealed.password,
                              );
                            }}
                          >
                            Copy
                          </button>
                          <span className="text-[var(--muted)]">
                            Hides in{" "}
                            {Math.max(
                              1,
                              Math.ceil((revealed.until - Date.now()) / 1000),
                            )}
                            s
                          </span>
                        </p>
                      ) : null}
                      {pwRow === row.id ? (
                        <form
                          className="mt-2 flex flex-wrap items-end gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const nextPw = pwEdits[row.id] || "";
                            start(async () => {
                              const result = await setMrtSharePasswordAction({
                                id: row.id,
                                password: nextPw,
                                durationHours: pwHours[row.id] ?? 168,
                              });
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setPwEdits((cur) => ({ ...cur, [row.id]: "" }));
                              setPwRow(null);
                              setShares(await listMrtSharesAction());
                            });
                          }}
                        >
                          <input
                            className="mrt-input w-40"
                            type="password"
                            placeholder="New password"
                            value={pwEdits[row.id] || ""}
                            onChange={(e) =>
                              setPwEdits((cur) => ({
                                ...cur,
                                [row.id]: e.target.value,
                              }))
                            }
                            minLength={4}
                            required
                          />
                          <select
                            className="mrt-select w-28"
                            value={pwHours[row.id] ?? 168}
                            onChange={(e) =>
                              setPwHours((cur) => ({
                                ...cur,
                                [row.id]: Number(e.target.value),
                              }))
                            }
                          >
                            {MRT_SHARE_DURATIONS.map((d) => (
                              <option key={d.hours} value={d.hours}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="mrt-btn-secondary"
                            disabled={pending}
                          >
                            Save password
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GuestActivityPanel() {
  const [items, setItems] = useState<MrtGuestActivity[] | null>(null);

  useEffect(() => {
    void listMrtGuestActivityAction().then(setItems);
  }, []);

  if (items == null) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Share logins on this instance (newest first). File-only — zip deploys
        may wipe it. Not an audit archive.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No guest activity on this instance yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="mrt-table w-full">
            <thead>
              <tr>
                <th>When</th>
                <th>Name</th>
                <th>Audience</th>
                <th>IP</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={`${row.at}-${row.ip}-${i}`}>
                  <td className="whitespace-nowrap tabular-nums text-xs">
                    {row.at.replace("T", " ").replace(/\.\d+Z$/, " Z")}
                  </td>
                  <td>{row.name}</td>
                  <td>{row.audience || "—"}</td>
                  <td className="font-mono text-xs">{row.ip}</td>
                  <td>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminTab() {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Sharing");
  const [guide, setGuide] = useState<(typeof GUIDES)[number]>("How to share");

  return (
    <div>
      <div className="print:hidden">
        <SubTabs tabs={SUBS} value={sub} onChange={setSub} intro={INTRO[sub]} />
      </div>
      {sub === "Sharing" ? <SharingPanel /> : null}
      {sub === "Guest activity" ? <GuestActivityPanel /> : null}
      {sub === "Guides" ? (
        <div>
          <div className="print:hidden">
            <SubTabs
              tabs={GUIDES}
              value={guide}
              onChange={setGuide}
              intro="Print or download the sharing steps for staff."
            />
          </div>
          {guide === "How to share" ? <HowToShareGuide /> : null}
        </div>
      ) : null}
    </div>
  );
}
