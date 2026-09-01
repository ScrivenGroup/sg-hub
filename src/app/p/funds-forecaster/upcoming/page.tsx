import { FundsForecasterChrome } from "@/modules/funds-forecaster/ui/FundsForecasterChrome";
import { FUNDS_FORECASTER_HREF } from "@/modules/funds-forecaster/ui/FundsForecasterNav";

export default function FundsForecasterUpcomingPage() {
  return (
    <FundsForecasterChrome
      href={`${FUNDS_FORECASTER_HREF}/upcoming`}
      title="Upcoming"
      intent="Upcoming payments table plus an occurrence filter. No payment rows on this skeleton."
    >
      <div className="sg-card border-dashed">
        <p className="font-medium">Skeleton</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Intent only. Do not paste the offline upcoming-payments table here.
        </p>
      </div>
    </FundsForecasterChrome>
  );
}
