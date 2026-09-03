import { auth, isMrtGuest } from "@/auth";
import { redirect } from "next/navigation";
import { MTG_BUYLIST_HREF } from "@/modules/mtg-buylist/schema";
import { MtgBuylistChrome } from "@/modules/mtg-buylist/ui/MtgBuylistChrome";
import { MtgBuylistKanban } from "@/modules/mtg-buylist/ui/MtgBuylistKanban";

export const dynamic = "force-dynamic";

export default async function MtgBuylistKanbanPage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  return (
    <MtgBuylistChrome
      href={`${MTG_BUYLIST_HREF}/kanban`}
      title="KanBan"
      intent="Shell for ideas and tasks that feed MTG Buylist development. Board wiring comes later."
    >
      <MtgBuylistKanban />
    </MtgBuylistChrome>
  );
}
