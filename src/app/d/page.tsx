import { auth, isMrtGuest } from "@/auth";
import { redirect } from "next/navigation";
import { HubLanding } from "@/core/shell/HubLanding";
import { developmentHubPathForTab } from "@/core/kanban/development-hub";

export const dynamic = "force-dynamic";

export default async function DevelopmentHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const params = await searchParams;
  if (params.tab) {
    redirect(developmentHubPathForTab(params.tab));
  }

  return <HubLanding hubId="hub-development" />;
}
