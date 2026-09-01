import { FundsForecasterChrome } from "@/modules/funds-forecaster/ui/FundsForecasterChrome";
import { FUNDS_FORECASTER_HREF } from "@/modules/funds-forecaster/ui/FundsForecasterNav";

export default function FundsForecasterForecastPage() {
  return (
    <FundsForecasterChrome
      href={`${FUNDS_FORECASTER_HREF}/forecast`}
      title="Forecast"
      intent="Show monthly income and expense, rate gap, trough, extra weekly need, and a projected-balance chart. No charts or dummy numbers on this skeleton."
    >
      <div className="sg-card border-dashed">
        <p className="font-medium">Skeleton</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Intent only. Do not paste the offline forecast panel here.
        </p>
      </div>
    </FundsForecasterChrome>
  );
}
