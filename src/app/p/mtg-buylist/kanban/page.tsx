import { auth, isMrtGuest } from "@/auth";
import { redirect } from "next/navigation";
import { MTG_BUYLIST_HREF } from "@/modules/mtg-buylist/schema";

export const dynamic = "force-dynamic";

export default async function MtgBuylistKanbanPage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");
  redirect(`${MTG_BUYLIST_HREF}/development?tab=kanban`);
}
