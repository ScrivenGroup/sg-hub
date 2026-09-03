import { auth, isMrtGuest } from "@/auth";
import { redirect } from "next/navigation";
import { getChangelogsForNode, getMtgBuylistStore } from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import {
  MTG_BUYLIST_HREF,
  MTG_BUYLIST_NODE_ID,
} from "@/modules/mtg-buylist/schema";
import { MtgBuylistChrome } from "@/modules/mtg-buylist/ui/MtgBuylistChrome";
import { MtgBuylistDevelopment } from "@/modules/mtg-buylist/ui/MtgBuylistDevelopment";

export const dynamic = "force-dynamic";

export default async function MtgBuylistDevelopmentPage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const changelogs = await getChangelogsForNode(MTG_BUYLIST_NODE_ID);
  const staff = await requireBuylistStaff();
  const notes = staff ? (await getMtgBuylistStore(staff.userKey)).notes || "" : "";

  return (
    <MtgBuylistChrome
      href={`${MTG_BUYLIST_HREF}/development`}
      title="Development"
      intent="Release table, WIP plan, and staff notes for MTG Buylist. Notes are per login JSON until Neon."
    >
      <MtgBuylistDevelopment changelogs={changelogs} notes={notes} />
    </MtgBuylistChrome>
  );
}
