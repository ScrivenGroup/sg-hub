import { formatDeltaSummary, type KanbanDelta } from "./fingerprint";
import type { KanbanBoard, KanbanInboxNote } from "./schema";
import { COLUMN_LABELS, LANE_LABELS } from "./schema";
import {
  formatAttachmentPromptBlock,
  type AttachmentPromptFile,
} from "./attachments";

export function buildSessionPrompt(opts: {
  leafTitle: string;
  leafHref: string;
  nodeId: string;
  idea: KanbanInboxNote;
  board: KanbanBoard;
  delta: KanbanDelta;
  attachmentFiles?: AttachmentPromptFile[];
}): string {
  const { leafTitle, leafHref, nodeId, idea, board, delta, attachmentFiles } = opts;
  const openTickets = board.tickets.filter((t) => t.column !== "archived");
  const ticketLines =
    openTickets.length === 0
      ? "- (none)"
      : openTickets
          .map(
            (t) =>
              `- \`${t.id}\` [${COLUMN_LABELS[t.column]} / ${LANE_LABELS[t.lane]}] ${t.title}${
                t.sourceIdeaId ? ` · sourceIdeaId ${t.sourceIdeaId}` : " · ad-hoc"
              }`,
          )
          .join("\n");

  const packExample = {
    boardId: nodeId,
    revisionExpected: board.revision,
    archiveIdeaIds: [idea.id],
    tickets: [
      {
        id: "kt-example",
        title: "Short ticket title",
        body: "What to do. Cite PLATFORM / WEB_DEVELOPMENT. Not a copy of the raw note.",
        lane: "behaviour",
        column: "later",
        sourceIdeaId: idea.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    changelogFragments: [],
  };

  return `You are working in the ScrivenGroup hub on leaf **${leafTitle}** (\`${leafHref}\`, nodeId \`${nodeId}\`).

Open Development Inbox: \`${leafHref}/development?tab=inbox\`
Open Development KanBan: \`${leafHref}/development?tab=kanban\`

## Host
This Cursor session is **this git desk**. Station preview is \`http://localhost:3000\`. A \`wip/<leaf>\` desk is \`http://localhost:3001\` (or 3002+). \`AUTH_URL\` in that desk’s \`.env.local\` must match the port \`next dev\` uses. Copying station env without rewriting \`AUTH_URL\` sends login to \`:3000\`. Never paste a station \`:3000\` link from a wip chat.

When \`DATABASE_URL\` is set, Feedback and Kanban rows live on **Neon** (same database localhost and live share) in **one inbox table** (\`kanban_ideas\`). \`data/\` is laptop fallback only and is stripped from the zip. **Seed is not the live board** — \`w-sunwater-mrt\` seed \`ideas: []\` does not mean the inbox is empty.

Inbox sittings, in order: (1) \`npx --yes tsx scripts/inspect-neon-inbox.ts\` (read-only SELECT; never print DATABASE_URL; do **not** call \`getKanbanBoard\` / \`loadKanbanRows\` — they can seed-write), (2) Development Inbox \`/d?tab=inbox\`, (3) seed last, missing ids only.

Chrome **Feedback** is the capture door (Raise-style popup on the header / mobile FAB). Split **ideas** into tickets; do not auto-ticket bugs.

After you publish a snapshot **on live**, refresh \`liveBaseline\` on localhost so the change-since-live meter can drop.

## Job
One chat = one job (\`dc-sessions\`). Plan first unless told to skip. Produce and move Kanban **tickets**; do not dump transcripts.

Read before building: \`docs/PLATFORM.md\`, \`docs/DEV_CHOICES.md\`, \`docs/WEB_DEVELOPMENT.md\`.

## Source raw inbox note (not a ticket)
- **id:** \`${idea.id}\` (cite this on every ticket you create from it)
- **title:** ${idea.title}
- **body:**
${idea.body || "(empty)"}

${formatAttachmentPromptBlock(attachmentFiles ?? [])}
Do **not** turn this raw note into a single ticket. Split into as many tickets as needed. Each ticket gets a **category** (colour badge / swimlane): experience, structure, behaviour, data, platform. Keep \`sourceIdeaId: "${idea.id}"\`. When those tickets are saved in the session pack, **archive this raw id** (do not delete the note). Tickets from this note keep \`sourceIdeaId\`.

## Current board snapshot (revision ${board.revision})
${ticketLines}

${formatDeltaSummary(delta)}

## What to do
1. Plan the work (reviewable plan).
2. Split the raw note into tickets with a category badge. User-facing KanBan is informational — they do not action cards. Columns are Later → Open → Done. Raw notes live on the Inbox tab, not on the board.
3. Emit a **session pack** JSON (schema below) the user can **Publish snapshot** on live (and on localhost while developing).
4. As you work, move tickets: later → open → done. Archive when closed.
5. **Actioning tickets drives the changelog** on the same Development page (WIP and/or release). Completing work is not column-only.
6. Extra work the user asks for in this session that was never an inbox note still gets tickets + changelog; those tickets omit \`sourceIdeaId\` (ad-hoc).
7. Prefer small publishes so the change-since-live meter stays out of red (10+).

## Session pack schema
Paste this shape into Development → KanBan → Publish snapshot. Upserts tickets by id; archives listed raw ids; does not clobber tickets missing from the pack.

\`\`\`json
${JSON.stringify(packExample, null, 2)}
\`\`\`
`;
}
