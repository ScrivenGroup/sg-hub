import { auth, isMrtGuest } from "@/auth";
import { redirect } from "next/navigation";
import { getMtgBuylistStore } from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { MTG_BUYLIST_HREF } from "@/modules/mtg-buylist/schema";
import { MtgBuylistChrome } from "@/modules/mtg-buylist/ui/MtgBuylistChrome";
import { MtgBuylistWorkspace } from "@/modules/mtg-buylist/ui/MtgBuylistWorkspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function MtgBuylistPage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const staff = await requireBuylistStaff();
  if (!staff) {
    return (
      <MtgBuylistChrome
        href={MTG_BUYLIST_HREF}
        title="MTG Buylist"
        intent="Staff Microsoft sign-in required. This run is yours alone — no guest door."
        canRaise={false}
      >
        <div className="sg-card">
          <p className="font-medium">Sign in to run this tool</p>
        </div>
      </MtgBuylistChrome>
    );
  }

  const store = await getMtgBuylistStore(staff.userKey);

  return (
    <MtgBuylistChrome
      href={MTG_BUYLIST_HREF}
      title="MTG Buylist"
      intent="Shared ManaBox CSV, then isolated Playmantis and MTGMate streams (each shows what that store will buy). Compare activates when two or more stores are harvested — credit vs credit, Mate cash shown. This run is keyed to your login."
    >
      <MtgBuylistWorkspace initialStore={store} />
    </MtgBuylistChrome>
  );
}
