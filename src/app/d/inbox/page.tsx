import { DevelopmentHubRoom } from "@/core/kanban/ui/DevelopmentHubRoom";

export const dynamic = "force-dynamic";

export default function DevelopmentInboxPage() {
  return <DevelopmentHubRoom href="/d/inbox" panel="inbox" />;
}
