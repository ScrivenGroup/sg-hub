import { auth, isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { listPlaymantisHarvestDiff } from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { MTG_BUYLIST_HREF } from "@/modules/mtg-buylist/schema";
import { MtgBuylistChrome } from "@/modules/mtg-buylist/ui/MtgBuylistChrome";
import { MtgBuylistLogs } from "@/modules/mtg-buylist/ui/MtgBuylistLogs";

export const dynamic = "force-dynamic";

export default async function MtgBuylistLogsPage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const { kind, host } = hostKindFromHeaders(await headers());
  const staff = await requireBuylistStaff();
  const href = `${MTG_BUYLIST_HREF}/logs`;
  if (!staff) {
    return (
      <MtgBuylistChrome
        href={href}
        title="Logs"
        intent="Staff Microsoft sign-in required. Harvest diffs are app-wide, not per run."
        page
        canRaise={false}
        hostKind={kind}
        host={host}
      >
        <div className="sg-card">
          <p className="font-medium">Sign in to view logs</p>
        </div>
      </MtgBuylistChrome>
    );
  }

  const rows = await listPlaymantisHarvestDiff();

  return (
    <MtgBuylistChrome
      href={href}
      title="Logs"
      intent="App-wide harvest vs Import Review diffs. Not tied to the current Run."
      page
      hostKind={kind}
      host={host}
    >
      <MtgBuylistLogs initialRows={rows} />
    </MtgBuylistChrome>
  );
}
