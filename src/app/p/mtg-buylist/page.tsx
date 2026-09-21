import { getMtgBuylistWorkspace } from "@/core/store/json-store";
import { requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { parseRunStep, resolveRunStep } from "@/modules/mtg-buylist/logic/run-steps";
import { MtgBuylistWorkspace } from "@/modules/mtg-buylist/ui/MtgBuylistWorkspace";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function MtgBuylistPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string; step?: string }>;
}) {
  const params = await searchParams;
  const staff = await requireBuylistStaff();
  if (!staff) {
    return (
      <div className="sg-card">
        <p className="font-medium">Sign in to run this tool</p>
      </div>
    );
  }

  const pack = await getMtgBuylistWorkspace(staff.userKey, params.run);
  const initialStep = resolveRunStep(parseRunStep(params.step), {
    hasRun: Boolean(pack.activeRunId),
    hasCsv: Boolean(pack.store.csv),
    hasHarvest: Boolean(pack.store.playmantis || pack.store.mate),
    hasSubmission: false,
  });

  return (
    <MtgBuylistWorkspace
      initialStore={pack.store}
      initialRuns={pack.runs}
      initialRunId={pack.activeRunId}
      initialStep={initialStep}
      initialArchives={pack.archives}
    />
  );
}
