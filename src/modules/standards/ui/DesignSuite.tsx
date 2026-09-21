"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { InfoTip } from "@/core/ui/InfoTip";
import { RagDot } from "@/core/ui/RagDot";
import { StatusPill } from "@/core/ui/StatusPill";
import { getNodeByHref } from "@/core/registry";
import { setStandardsChoiceAction } from "../actions";
import {
  PARKED_FOR_LATER,
  isOffStandard,
  offStandardEntries,
  optionFor,
  questionFor,
  type LibraryQuestion,
} from "../catalog";
import { STANDARDS_HREF, type StandardsChoices } from "../schema";

const quiet =
  "rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5";
const tile =
  "flex flex-col gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--page)] p-4 text-left";

export function DesignSuite({ choices }: { choices: StandardsChoices }) {
  const [local, setLocal] = useState(choices);
  const [offOnly, setOffOnly] = useState(false);
  useEffect(() => {
    setLocal(choices);
  }, [choices]);

  const node = getNodeByHref(STANDARDS_HREF);
  const offIds = new Set(offStandardEntries(local));
  const offCount = offIds.size;
  const showButtons =
    !offOnly || offIds.has("obj-btn-primary") || offIds.has("obj-btn-destructive");
  const showSurfaces = !offOnly || offIds.has("obj-dialog");

  function pick(id: string, optionId: string) {
    setLocal((prev) => ({ ...prev, [id]: optionId }));
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[var(--muted)]">
          Definitive hub kit. Specimens are what the site uses today. If you pick
          something else, that object is flagged.
        </p>
        <button
          type="button"
          className={offOnly ? "sg-btn-primary" : "sg-btn-secondary"}
          onClick={() => setOffOnly((on) => !on)}
        >
          Different from standard{offCount ? ` (${offCount})` : ""}
        </button>
      </div>

      {offOnly && offCount === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nothing differs from standard.</p>
      ) : null}

      {offOnly ? null : (
        <>
          <Section title="Colour">
            <ColourBoard />
          </Section>

          <Section title="Type">
            <div className={quiet}>
              <code className="font-mono text-xs text-[var(--muted)]">Manrope</code>
              <p className="mt-2 text-3xl font-semibold tracking-tight">Heading 3xl</p>
              <p className="mt-1">Body on ink.</p>
              <p className="text-sm text-[var(--muted)]">Muted description.</p>
              <p className="mt-1 font-mono text-xs">Mono · token names</p>
            </div>
          </Section>

          <Section title="Shape">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={quiet}>
                <ItemHead title="Radius" use="10px" />
                <span
                  className="mt-3 block h-12 w-12 border border-[var(--ink)] bg-[var(--surface)]"
                  style={{ borderRadius: 10 }}
                />
              </div>
              <div className={quiet}>
                <ItemHead title="Control height" use="32px" />
                <button type="button" className="sg-btn-secondary mt-3">
                  32px
                </button>
              </div>
            </div>
          </Section>
        </>
      )}

      {showButtons ? (
        <Section title="Buttons">
          <div className="grid gap-3 lg:grid-cols-2">
            {offOnly && !offIds.has("obj-btn-primary") ? null : (
              <ChoiceItem
                entryId="obj-btn-primary"
                title="Primary"
                use="sg-btn-primary"
                choices={local}
                onPicked={pick}
              />
            )}
            {offOnly ? null : (
              <>
                <KitItem title="Secondary" use="sg-btn-secondary">
                  <button type="button" className="sg-btn-secondary">
                    Cancel
                  </button>
                </KitItem>
                <KitItem title="Ghost" use="sg-btn-ghost">
                  <button type="button" className="sg-btn-ghost">
                    Ghost
                  </button>
                </KitItem>
                <KitItem title="Action" use="sg-btn-action">
                  <button type="button" className="sg-btn-action">
                    Open Inbox
                  </button>
                </KitItem>
              </>
            )}
            {offOnly && !offIds.has("obj-btn-destructive") ? null : (
              <ChoiceItem
                entryId="obj-btn-destructive"
                title="Destructive"
                use="sg-btn-danger"
                choices={local}
                onPicked={pick}
              />
            )}
          </div>
        </Section>
      ) : null}

      {offOnly ? null : (
        <>
          <Section title="Fields">
            <div className="grid gap-3 sm:grid-cols-2">
              <KitItem title="Input" use="sg-input">
                <input className="sg-input max-w-[12rem]" defaultValue="Field" readOnly />
              </KitItem>
              <KitItem title="Checkbox" use="native">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked />
                  Native control
                </label>
              </KitItem>
            </div>
          </Section>

          <Section title="Navigation">
            <div className="grid gap-3 sm:grid-cols-2">
              <KitItem title="Tab" use="sg-tab">
                <div className="flex gap-1 border-b border-[var(--border)]">
                  <span className="sg-tab" aria-selected>
                    Selected
                  </span>
                  <span className="sg-tab">Idle</span>
                </div>
              </KitItem>
              <KitItem title="Text link" use="underline underline-offset-2">
                <a href="#colour" className="underline underline-offset-2">
                  In-page link
                </a>
              </KitItem>
            </div>
          </Section>
        </>
      )}

      {showSurfaces ? (
        <Section title="Surfaces">
          <div className="grid gap-3 sm:grid-cols-2">
            {offOnly ? null : (
              <KitItem title="Card" use="sg-card">
                <div className="sg-card !p-3 text-sm">Hover darkens the border</div>
              </KitItem>
            )}
            {offOnly && !offIds.has("obj-dialog") ? null : (
              <ChoiceItem
                entryId="obj-dialog"
                title="Dialog"
                use="EffortPopupShell"
                choices={local}
                onPicked={pick}
              />
            )}
          </div>
        </Section>
      ) : null}

      {offOnly ? null : (
        <>
          <Section title="Chrome bits">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KitItem title="Code badge" use="CodeBadge">
                {node ? <CodeBadge node={node} /> : null}
              </KitItem>
              <KitItem title="Status pill" use="StatusPill">
                <StatusPill status="building" />
              </KitItem>
              <KitItem title="RAG dot" use="RagDot">
                <div className="flex items-center gap-3 text-sm">
                  <RagDot level="amber" size={10} />
                  Amber
                  <RagDot level="red" size={10} />
                  Red
                  <span className="text-[var(--muted)]">Green omitted</span>
                </div>
              </KitItem>
              <KitItem title="Info tip" use="InfoTip">
                <span className="inline-flex items-center gap-2 text-sm">
                  Hint
                  <InfoTip label="Native title tooltip. Letter i." />
                </span>
              </KitItem>
            </div>
          </Section>

          <Section title="Page">
            <div className="grid gap-3 sm:grid-cols-2">
              <KitItem title="Page header" use="PageNav + h1 + badge + pill">
                <div className="space-y-1">
                  <p className="text-3xl font-semibold tracking-tight">Leaf title</p>
                  <p className="text-sm text-[var(--muted)]">Muted description, max-w-2xl.</p>
                </div>
              </KitItem>
              <KitItem title="Page width" use="AppShell main">
                <p className="text-sm text-[var(--muted)]">
                  Fill the frame. Cap reading text, not the page.
                </p>
              </KitItem>
            </div>
          </Section>

          <Section title="States">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KitItem title="Pending" use="disabled + opacity">
                <button type="button" className="sg-btn-primary opacity-50" disabled>
                  Saving…
                </button>
              </KitItem>
              <KitItem title="Empty" use="one muted sentence">
                <p className="text-sm text-[var(--muted)]">No version rows yet.</p>
              </KitItem>
              <KitItem title="Field error" use="under the input">
                <p className="text-sm text-[var(--rag-red)]">Layer required</p>
              </KitItem>
              <KitItem title="Guest" use="hide chrome">
                <p className="text-sm text-[var(--muted)]">Do not disable-in-place.</p>
              </KitItem>
            </div>
          </Section>

          <Section title="Not in the kit">
            <p className="text-sm text-[var(--muted)]">{PARKED_FOR_LATER.join(" · ")}.</p>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ItemHead({ title, use }: { title: string; use: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <code className="font-mono text-xs text-[var(--muted)]">{use}</code>
    </div>
  );
}

function KitItem({
  title,
  use,
  children,
}: {
  title: string;
  use: string;
  children: ReactNode;
}) {
  return (
    <div className={`${quiet} space-y-3`}>
      <ItemHead title={title} use={use} />
      {children}
    </div>
  );
}

function ChoiceItem({
  entryId,
  title,
  use,
  choices,
  onPicked,
}: {
  entryId: string;
  title: string;
  use: string;
  choices: StandardsChoices;
  onPicked: (entryId: string, optionId: string) => void;
}) {
  const question = questionFor(entryId);
  const pick = optionFor(entryId, choices[entryId]);
  const decided = Boolean(pick);
  const off = isOffStandard(choices, entryId);
  const [editing, setEditing] = useState(false);
  const showChooser = Boolean(question) && (!decided || editing);

  return (
    <div className={`${quiet} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <ItemHead title={title} use={use} />
        {off ? (
          <span className="text-xs font-semibold text-[var(--rag-amber)]">
            Different from standard
          </span>
        ) : null}
      </div>
      {showChooser && question ? (
        <Chooser
          question={question}
          picked={pick?.id}
          onPicked={(optionId) => {
            onPicked(entryId, optionId);
            setEditing(false);
          }}
        />
      ) : (
        <>
          {pick ? <OptionLook questionId={entryId} optionId={pick.id} /> : null}
          {off && pick ? (
            <p className="text-sm text-[var(--muted)]">You chose {pick.label}.</p>
          ) : null}
          <button type="button" className="sg-btn-secondary self-start" onClick={() => setEditing(true)}>
            Choose again
          </button>
        </>
      )}
    </div>
  );
}

function Chooser({
  question,
  picked,
  onPicked,
}: {
  question: LibraryQuestion;
  picked?: string;
  onPicked: (optionId: string) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function choose(optionId: string) {
    const data = new FormData();
    data.set("entryId", question.id);
    data.set("optionId", optionId);
    setError("");
    onPicked(optionId);
    start(async () => {
      const result = await setStandardsChoiceAction(data);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">{question.why}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const on = picked === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={pending}
              onClick={() => choose(opt.id)}
              className={`${tile} ${on ? "border-[var(--ink)]" : ""}`}
            >
              <span className="text-xs font-semibold text-[var(--muted)]">
                {i === 0 ? "A" : "B"}
                {opt.now ? " · Standard" : ""}
              </span>
              <OptionLook questionId={question.id} optionId={opt.id} />
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-xs text-[var(--muted)]">{opt.hint}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-[var(--rag-red)]">{error}</p> : null}
    </div>
  );
}

function OptionLook({ questionId, optionId }: { questionId: string; optionId: string }) {
  if (questionId === "obj-btn-primary") {
    return <PrimaryLook bordered={optionId === "border"} />;
  }
  if (questionId === "obj-btn-destructive") {
    return optionId === "named" ? (
      <DangerLook />
    ) : (
      <span className="text-sm text-[var(--muted)]">No kit class</span>
    );
  }
  if (questionId === "obj-dialog") {
    return <MiniDialog capped={optionId === "one"} />;
  }
  return null;
}

function ColourBoard() {
  return (
    <div className={quiet}>
      <div className="flex flex-wrap gap-3">
        {[
          ["#3C3C3B", "Ink"],
          ["#F5F5F4", "Page"],
          ["#FFFFFF", "Surface"],
          ["#ECECEC", "Muted fill"],
          ["#D4D4D2", "Border"],
          ["#6B6B69", "Muted text"],
          ["#2F8F4E", "Green"],
          ["#D4A017", "Amber"],
          ["#C0392B", "Red"],
        ].map(([hex, label]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span
              className="h-8 w-8 shrink-0 border border-[var(--border)]"
              style={{ backgroundColor: hex, borderRadius: 8 }}
              title={hex}
            />
            <span>
              {label}
              <span className="mt-0.5 block font-mono text-[10px] text-[var(--muted)]">{hex}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrimaryLook({ bordered }: { bordered: boolean }) {
  return (
    <span
      className="sg-btn-primary pointer-events-none self-start"
      style={bordered ? { border: "1px solid var(--ink)" } : undefined}
      aria-hidden
    >
      Save
    </span>
  );
}

function DangerLook() {
  return (
    <span
      className="inline-flex min-h-8 items-center self-start rounded-[10px] border border-[var(--rag-red)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--rag-red)]"
      aria-hidden
    >
      Remove
    </span>
  );
}

function MiniDialog({ capped }: { capped: boolean }) {
  return (
    <div className={`h-20 w-full bg-black/40 p-1.5 ${capped ? "grid" : "flex items-center"}`} aria-hidden>
      <div
        className={`w-full rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[10px] ${
          capped ? "flex max-h-full flex-col overflow-hidden" : "p-2"
        }`}
      >
        {capped ? (
          <>
            <div className="shrink-0 border-b border-[var(--border)] px-2 py-0.5">Title</div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 py-0.5 text-[var(--muted)]">Body…</div>
            <div className="shrink-0 border-t border-[var(--border)] px-2 py-0.5">Save</div>
          </>
        ) : (
          "Centred panel"
        )}
      </div>
    </div>
  );
}
