import { isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hostKindFromHeaders, parseDevTab } from "@/core/kanban/host";
import { emptyKanbanBoard } from "@/core/kanban/schema";
import {
  getChangelogsForNode,
  getKanbanBoard,
  getMtgBuylistNotes,
} from "@/core/store/json-store";
import { getBuylistSession, requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import {
  MTG_BUYLIST_HREF,
  MTG_BUYLIST_NODE_ID,
} from "@/modules/mtg-buylist/schema";
import { MtgBuylistChrome } from "@/modules/mtg-buylist/ui/MtgBuylistChrome";
import { MtgBuylistDevelopment } from "@/modules/mtg-buylist/ui/MtgBuylistDevelopment";

export const dynamic = "force-dynamic";

export default async function MtgBuylistDevelopmentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getBuylistSession();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const params = await searchParams;
  const [changelogs, staff, { kind, host }] = await Promise.all([
    getChangelogsForNode(MTG_BUYLIST_NODE_ID),
    requireBuylistStaff(),
    headers().then((h) => hostKindFromHeaders(h)),
  ]);
  const [notes, board] = staff
    ? await Promise.all([
        getMtgBuylistNotes(staff.userKey),
        getKanbanBoard(MTG_BUYLIST_NODE_ID),
      ])
    : ["", emptyKanbanBoard(MTG_BUYLIST_NODE_ID)] as const;

  return (
    <MtgBuylistChrome
      href={`${MTG_BUYLIST_HREF}/development`}
      title="Development"
      intent="Release table, WIP plan, staff notes, Inbox, and a KanBan snapshot. Notes are per login until Neon. Inbox and KanBan share one leaf board."
      wide
      hostKind={kind}
      host={host}
    >
      <MtgBuylistDevelopment
        changelogs={changelogs}
        notes={notes || ""}
        board={board}
        hostKind={kind}
        host={host}
        initialTab={parseDevTab(params.tab)}
      />
    </MtgBuylistChrome>
  );
}
