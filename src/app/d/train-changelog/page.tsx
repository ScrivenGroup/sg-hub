import { auth, isMrtGuest } from "@/auth";
import { redirect } from "next/navigation";
import { SubHubShell } from "@/core/shell/SubHubShell";
import { getChangelogsForNode } from "@/core/store/json-store";

export const dynamic = "force-dynamic";

export default async function TrainChangelogPage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");
  const changelogs = await getChangelogsForNode("d-train-changelog");
  return <SubHubShell href="/d/train-changelog" changelogs={changelogs} />;
}
