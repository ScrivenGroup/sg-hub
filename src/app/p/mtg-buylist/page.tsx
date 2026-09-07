import { auth, isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { getMtgBuylistStore } from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { MTG_BUYLIST_HREF } from "@/modules/mtg-buylist/schema";
import { MtgBuylistChrome } from "@/modules/mtg-buylist/ui/MtgBuylistChrome";
import { MtgBuylistWorkspace } from "@/modules/mtg-buylist/ui/MtgBuylistWorkspace";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function MtgBuylistPage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const { kind, host } = hostKindFromHeaders(await headers());
  const staff = await requireBuylistStaff();
  if (!staff) {
    return (
      <MtgBuylistChrome
        href={MTG_BUYLIST_HREF}
        title="MTG Buylist"
        intent="Staff Microsoft sign-in required. This run is yours alone — no guest door."
        canRaise={false}
        hostKind={kind}
        host={host}
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
      intent="Shared ManaBox CSV, then isolated Playmantis and MTGMate streams. Compare (filters and exports) is available from the first harvested store — credit vs credit when both exist, Mate cash shown. This run is keyed to your login."
      hostKind={kind}
      host={host}
    >
      <MtgBuylistWorkspace initialStore={store} />
    </MtgBuylistChrome>
  );
}
