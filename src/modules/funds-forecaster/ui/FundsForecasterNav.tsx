import Link from "next/link";

export const FUNDS_FORECASTER_HREF = "/p/funds-forecaster";

const LINKS = [
  { href: FUNDS_FORECASTER_HREF, label: "Hub" },
  { href: `${FUNDS_FORECASTER_HREF}/inputs`, label: "Inputs" },
  { href: `${FUNDS_FORECASTER_HREF}/forecast`, label: "Forecast" },
  { href: `${FUNDS_FORECASTER_HREF}/upcoming`, label: "Upcoming" },
  { href: `${FUNDS_FORECASTER_HREF}/development`, label: "Development" },
] as const;

export function FundsForecasterNav({ currentHref }: { currentHref: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Funds Forecaster">
      {LINKS.map((link) => {
        const current = currentHref === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={current ? "sg-btn-primary" : "sg-btn-secondary"}
            aria-current={current ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
