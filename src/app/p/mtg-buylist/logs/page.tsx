import { listBuylistArchives, listPlaymantisHarvestDiff } from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { MtgBuylistLogs } from "@/modules/mtg-buylist/ui/MtgBuylistLogs";

export const dynamic = "force-dynamic";

export default async function MtgBuylistLogsPage() {
  const staff = await requireBuylistStaff();
  if (!staff) {
    return (
      <div className="sg-card">
        <p className="font-medium">Sign in to view logs</p>
      </div>
    );
  }

  const [rows, archives] = await Promise.all([
    listPlaymantisHarvestDiff(staff.userKey),
    listBuylistArchives(staff.userKey),
  ]);

  return <MtgBuylistLogs initialRows={rows} archives={archives} />;
}
