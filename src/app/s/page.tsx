import { HubLanding } from "@/core/shell/HubLanding";
import { getDependencies } from "@/core/store/json-store";
import { systemHubRag } from "@/core/access/rag";

export default async function SystemHubPage() {
  const deps = await getDependencies();
  return <HubLanding hubId="hub-system" attention={systemHubRag(deps)} />;
}
