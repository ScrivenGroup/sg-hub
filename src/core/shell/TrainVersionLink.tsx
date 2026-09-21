import Link from "next/link";
import {
  TRAIN_CHANGELOG_HREF,
  TRAIN_VERSION,
  formatTrainVersion,
  isTrainHotfix,
} from "@/core/train/version";

/** AppShell Train clock. Version is the door to Train Changelog. Hotfix chip only. */
export function TrainVersionLink({ linked }: { linked: boolean }) {
  const version = formatTrainVersion();
  const hotfix = isTrainHotfix(TRAIN_VERSION);
  const inner = (
    <>
      <span className="font-semibold tabular-nums">{version}</span>
      {hotfix ? (
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
          Hotfix
        </span>
      ) : null}
    </>
  );
  const className =
    "inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm text-[var(--ink)]";
  const title = hotfix ? `${version} Hotfix` : version;

  if (!linked) {
    return (
      <span className={`${className} px-1.5`} title={title}>
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={TRAIN_CHANGELOG_HREF}
      className={`${className} sg-btn-ghost`}
      title="Train Changelog"
      aria-label={`Train Changelog ${title}`}
    >
      {inner}
    </Link>
  );
}
