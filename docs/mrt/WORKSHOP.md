# MRT requirements workshop

Bill describes. The agent **structures and cleanses**. The agent does **not** invent CORE, and does **not** implement during a workshop sitting unless Bill says to.

Ticket: Neon `kt-mrt-effort-reqs`. Catalogue: [REQUIREMENTS.md](./REQUIREMENTS.md).

---

## Goal

Get a handle on complexity so later sittings cannot “fix” one thing by breaking another. Every gesture, screen, and wait has:

- **purpose** (why it exists)
- **function** (what happens)
- **user requirement** (who needs it, when)
- **status** (CORE / intended / draft / parked / out)
- **do not** (the mole this card is there to stop)

---

## How Bill talks

Dump in any order. Incomplete is fine. Prefer concrete over abstract.

Useful shapes:

- “This screen is for …”
- “When I click / drag / type X, Y should happen”
- “Never …”
- “This is CORE” / “this can wait” / “this is out of v1”
- “It used to … and the last sitting broke …”
- Screenshots, obligation names (e.g. FIA Assessment), 1 vs many obligations

You do not have to use IDs. You do not have to fill a template.

---

## What the agent does with that

1. Split the dump into **Proposed cards** (see template below). One card = one function or one user requirement. Do not merge pan, bar-drag, and resize into one card.
2. Cleanse: drop chat filler, keep Bill’s meaning, name the surface, write a **Do not** line from the last mole.
3. Show the cleaned cards in chat. Mark anything inferred (not said) as **inferred — confirm**.
4. Wait for Bill: **lock** / **amend** / **later** / **out**.
5. Only then move cards into REQUIREMENTS.md with the matching status.
6. Append a short sitting note to `kt-mrt-effort-reqs`. Do not replace the ticket with a novel.

The agent may **not**:

- Lock a card without Bill
- Quietly change an existing CORE card to match current code
- Start coding from a Proposed card
- “Simplify” a finicky rule into a different product (same failure as parent-resize stretching every child)

---

## Status

| Status | Meaning |
| ------ | ------- |
| **CORE** | Locked. Builder may change how it paints, not what it does, and may not remove it. |
| **intended** | Bill said it; not locked. Do not build unless a ticket names it. |
| **draft** | Agent structured it; waiting for lock / amend. |
| **parked** | Later cycle. Chrome polish sits here until the related CORE cards exist. |
| **out** | Not v1 (Followups, Assumptions, costing, levelling, …). |

Changing CORE requires Bill to redefine it on the card **and** on `kt-mrt-core-behaviour`. Code convenience is not a redefinition.

---

## Card template

```md
### F-EG-00 Short name

| Field | Value |
| ----- | ----- |
| Surface | Effort Gantt (Rebalance / Occurrence) |
| Purpose | |
| Who | Planner |
| Trigger | |
| Behaviour | |
| Do not | |
| Status | draft |
| Verify | |
```

IDs:

- `P-` purpose of the product or a surface
- `U-` user requirement
- `F-` function. Prefix: `APP` chrome, `OG` Obligations Gantt, `EG` Effort Gantt (shared), `RB` Rebalance-only, `OC` Occurrence-only, `DF` Defaults, `HS` hours/heatmap, `IN` Inputs, `DEF` Definitions, `SH` share

---

## Sitting shape (one chat)

1. Pick a surface (default first pass: **Effort Gantt** — that is where the moles were).
2. Bill dumps.
3. Agent returns cleaned cards, not code.
4. Bill locks a batch.
5. Stop. Next sitting may build **only** against locked cards, listing F-IDs in / out.

Do not workshop and rewrite EffortGantt in the same sitting.

---

## Builder sitting (after lock)

The prompt must include:

```text
In scope: F-…
Must still be true: F-… (CORE)
Out: everything else, including parked polish
If a fix would change CORE, stop and ask.
```

One sitting = one function cluster. Flush (fps, spinner, overlay) is not allowed to rewrite a CORE card. If bars, colours, pan, or occurrence-open time regress, restore before adding more.

---

## First workshop (next sitting)

Capture Effort Gantt in Bill’s words:

1. What Rebalance is for vs a single occurrence (FIA Assessment).
2. Each click-drag (already listed as CORE — confirm or amend, do not silently drop).
3. What a coloured task bar is vs hour cells.
4. Open / save / Centre / zoom / sticky headers — CORE vs parked.
5. How fast a single obligation must open (seconds, not ~60s).
6. Anything still missing from the catalogue.

Then, if energy remains: Obligations Gantt (diamond-only drag is already CORE), then the rest of the tracker.
