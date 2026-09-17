import type { StandardsHoldRecord } from "../schema";
import { HoldPile } from "./HoldPile";

export function HomeTab({ holds }: { holds: StandardsHoldRecord[] }) {
  return <HoldPile items={holds} />;
}
