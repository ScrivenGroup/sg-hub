import { SubHubShell } from "@/core/shell/SubHubShell";
import { getChangelogsForNode } from "@/core/store/json-store";

export default async function FuelTrackerPage() {
  const changelogs = await getChangelogsForNode("p-fueltracker");
  return <SubHubShell href="/p/fueltracker" changelogs={changelogs} />;
}
