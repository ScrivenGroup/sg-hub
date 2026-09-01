import { getChangelogsForNode } from "@/core/store/json-store";
import { FundsForecasterChrome } from "@/modules/funds-forecaster/ui/FundsForecasterChrome";
import { FUNDS_FORECASTER_HREF } from "@/modules/funds-forecaster/ui/FundsForecasterNav";

export default async function FundsForecasterHubPage() {
  const changelogs = await getChangelogsForNode("p-funds-forecaster");
  return (
    <FundsForecasterChrome
      href={FUNDS_FORECASTER_HREF}
      title="Funds Forecaster"
      intent="Personal funds forecast: savings, safety floor, horizon, and income versus hard, soft, and category spend. Skeleton only — the offline HTML is a Development reference, not revA product UI."
      changelogs={changelogs}
    >
      <div className="sg-card border-dashed">
        <p className="font-medium">Hub skeleton</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          No live forecast here yet. Open Inputs, Forecast, or Upcoming for
          intent. Open Development to see the parked offline design.
        </p>
      </div>
    </FundsForecasterChrome>
  );
}
