# Standards (agent checklist)

In-app: System → Standards (`/s/standards`). This file stays the short checklist. Named kit: [`docs/DESIGN_LIBRARY.md`](./DESIGN_LIBRARY.md) and the Design Library tab.

See also `src/core/checklist.md` and [`docs/WEB_DEVELOPMENT.md`](./WEB_DEVELOPMENT.md).

## Drop pile (parallel sittings)

When you find or make a design/behaviour note on another desk, **do not invent a new class**. Dump it on Standards Drop (`/s/standards?tab=drop`): kind note / decision / conflict, optional source leaf, what to remember. Chrome Feedback stays the bug door (`/d?tab=inbox`). Do not restyle other leaves until Bill decides on the library card.

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
