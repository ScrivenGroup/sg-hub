import { DevelopmentHubRoom } from "@/core/kanban/ui/DevelopmentHubRoom";

export const dynamic = "force-dynamic";

export default function DevelopmentChangelogPage() {
  return <DevelopmentHubRoom href="/d/changelog" panel="changelog" />;
}
