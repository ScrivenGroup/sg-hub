# Standards (agent checklist)

In-app: System → Standards (`/s/standards`). This file stays the short checklist. Named kit: [`docs/DESIGN_LIBRARY.md`](./DESIGN_LIBRARY.md) and the Design Library tab.

See also `src/core/checklist.md` and [`docs/WEB_DEVELOPMENT.md`](./WEB_DEVELOPMENT.md).

## Design Library

The in-app Design Library is the definitive visual kit. Do not invent a new class. If Bill picks something other than the hub standard, that object is flagged on the card (one current choice). Chrome Feedback stays the bug door (`/d?tab=inbox`). Do not restyle other leaves until that object is locked.

## Holding pile

Standards Home (`/s/standards`) has **Hold**: a dumping ground to file later. Leaf / WIP desks **follow the kit**. If you notice a gap or cannot follow it (example: a button with no border that should always have one), **do not rewrite the Design Library**. Drop a note on Hold (kind note / conflict / idea, optional source leaf, what to remember). Conflicts may exist for good reason — that is why updates are deliberate, on the Standards desk, not from a random leaf sitting.

When Bill says “refer standards; if it isn’t the default, drop a note to be filed later,” that note lands here.

## Kit

- Hex code → **badge colour only**; SG theme default; ThemeContract opt-in per sub-hub
- Chrome: Home, Site network, **Feedback** (one register), Profile, `PageNav`
- Starting UI kit: `sg-card`, `sg-btn-primary` / `secondary` / `ghost`, `sg-input`, `sg-tab`, tokens in `globals.css`
- Use the **named** object (`sg-btn-primary`), not a one-off colour
- Framing: featureless shell + changelog plan; no fake features while `sketched`
- Maps update via registry when topology changes (Site network = fast travel)
- Deps RAG cascades to System Home card
- Access per surface (`shared` / `restricted` / `per_user`)
- A11y: skip link, focus, Esc closes dialogs, 32px control height (`--sg-btn-height`)
- No my-site MD3 / third component library on hub pages
