import { headers } from "next/headers";
import { hostKindFromHeaders, parseDevTab } from "@/core/kanban/host";
import { emptyKanbanBoard } from "@/core/kanban/schema";
import {
  getChangelogsForNode,
  getKanbanBoard,
  getMtgBuylistNotes,
} from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { MTG_BUYLIST_NODE_ID } from "@/modules/mtg-buylist/schema";
import { MtgBuylistDevelopment } from "@/modules/mtg-buylist/ui/MtgBuylistDevelopment";

export const dynamic = "force-dynamic";

export default async function MtgBuylistDevelopmentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const staff = await requireBuylistStaff();
  const { kind } = hostKindFromHeaders(await headers());
  const changelogs = await getChangelogsForNode(MTG_BUYLIST_NODE_ID);
  const [notes, board] = staff
    ? await Promise.all([
        getMtgBuylistNotes(staff.userKey),
        getKanbanBoard(MTG_BUYLIST_NODE_ID),
      ])
    : (["", emptyKanbanBoard(MTG_BUYLIST_NODE_ID)] as const);

  return (
    <MtgBuylistDevelopment
      changelogs={changelogs}
      notes={notes || ""}
      board={board}
      hostKind={kind}
      initialTab={parseDevTab(params.tab)}
    />
  );
}
