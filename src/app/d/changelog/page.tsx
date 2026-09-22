import { DevelopmentHubRoom } from "@/core/kanban/ui/DevelopmentHubRoom";
import { SG_HUB_CHANGELOG_HREF } from "@/core/kanban/development-hub";

export const dynamic = "force-dynamic";

export default function SgHubChangelogPage() {
  return <DevelopmentHubRoom href={SG_HUB_CHANGELOG_HREF} panel="changelog" />;
}
