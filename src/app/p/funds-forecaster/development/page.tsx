import { FundsForecasterChrome } from "@/modules/funds-forecaster/ui/FundsForecasterChrome";
import { FUNDS_FORECASTER_HREF } from "@/modules/funds-forecaster/ui/FundsForecasterNav";

export default function FundsForecasterDevelopmentPage() {
  return (
    <FundsForecasterChrome
      href={`${FUNDS_FORECASTER_HREF}/development`}
      title="Development"
      intent="The only place the current offline design may live. Reference museum — not the product UI to restyle into revA."
    >
      <div className="sg-card mb-4 border-dashed">
        <p className="font-medium">
          Reference design from the offline experiment. Not revA.
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Do not build the product pages by restyling this. Personal statement
          CSVs and snapshots stay in the sibling folder, not in this hub.
        </p>
      </div>
      <iframe
        title="Funds Forecaster offline reference"
        src={`${FUNDS_FORECASTER_HREF}/development/reference`}
        className="h-[min(80vh,900px)] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]"
      />
    </FundsForecasterChrome>
  );
}
