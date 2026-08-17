import { SubHubShell } from "@/core/shell/SubHubShell";
import { getChangelogsForNode } from "@/core/store/json-store";

export default async function SunwaterMrtPage() {
  const changelogs = await getChangelogsForNode("w-sunwater-mrt");
  return <SubHubShell href="/w/sunwater-mrt" changelogs={changelogs} />;
}
