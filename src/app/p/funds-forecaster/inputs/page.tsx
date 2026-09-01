import { FundsForecasterChrome } from "@/modules/funds-forecaster/ui/FundsForecasterChrome";
import { FUNDS_FORECASTER_HREF } from "@/modules/funds-forecaster/ui/FundsForecasterNav";

export default function FundsForecasterInputsPage() {
  return (
    <FundsForecasterChrome
      href={`${FUNDS_FORECASTER_HREF}/inputs`}
      title="Inputs"
      intent="Capture savings, safety floor, horizon, income rows, hard groups, soft groups, and categories. No editors or seeded Table 1 numbers in this skeleton."
    >
      <div className="sg-card border-dashed">
        <p className="font-medium">Skeleton</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Intent only. Do not port the offline form layout onto this page.
        </p>
      </div>
    </FundsForecasterChrome>
  );
}
