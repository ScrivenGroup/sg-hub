import { isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { listBuylistArchives, listPlaymantisHarvestDiff } from "@/core/store/json-store";
import { getBuylistSession, requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { MTG_BUYLIST_HREF } from "@/modules/mtg-buylist/schema";
import { MtgBuylistChrome } from "@/modules/mtg-buylist/ui/MtgBuylistChrome";
import { MtgBuylistLogs } from "@/modules/mtg-buylist/ui/MtgBuylistLogs";

export const dynamic = "force-dynamic";

export default async function MtgBuylistLogsPage() {
  const session = await getBuylistSession();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const { kind, host } = hostKindFromHeaders(await headers());
  const staff = await requireBuylistStaff();
  const href = `${MTG_BUYLIST_HREF}/logs`;
  if (!staff) {
    return (
      <MtgBuylistChrome
        href={href}
        title="Logs"
        intent="Staff Microsoft sign-in required. Harvest diffs are yours only."
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

  const [rows, archives] = await Promise.all([
    listPlaymantisHarvestDiff(staff.userKey),
    listBuylistArchives(staff.userKey),
  ]);

  return (
    <MtgBuylistChrome
      href={href}
      title="Logs"
      intent="Your harvest vs Import Review diffs, plus archived runs. Not shared with other logins."
      page
      hostKind={kind}
      host={host}
    >
      <MtgBuylistLogs initialRows={rows} archives={archives} />
    </MtgBuylistChrome>
  );
}
