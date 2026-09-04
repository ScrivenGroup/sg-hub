import { auth, isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hostKindFromHeaders, parseDevTab } from "@/core/kanban/host";
import { emptyKanbanBoard } from "@/core/kanban/schema";
import {
  getChangelogsForNode,
  getKanbanBoard,
  getMtgBuylistStore,
} from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
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
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const params = await searchParams;
  const changelogs = await getChangelogsForNode(MTG_BUYLIST_NODE_ID);
  const staff = await requireBuylistStaff();
  const notes = staff ? (await getMtgBuylistStore(staff.userKey)).notes || "" : "";
  const board = staff
    ? await getKanbanBoard(MTG_BUYLIST_NODE_ID)
    : emptyKanbanBoard(MTG_BUYLIST_NODE_ID);
  const { kind, host } = hostKindFromHeaders(await headers());

  return (
    <MtgBuylistChrome
      href={`${MTG_BUYLIST_HREF}/development`}
      title="Development"
      intent="Release table, WIP plan, staff notes, Inbox ideas, and a KanBan snapshot of tickets. Notes are per login JSON until Neon. Inbox and KanBan share one leaf board."
      wide
    >
      <MtgBuylistDevelopment
        changelogs={changelogs}
        notes={notes}
        board={board}
        hostKind={kind}
        host={host}
        initialTab={parseDevTab(params.tab)}
      />
    </MtgBuylistChrome>
  );
}
