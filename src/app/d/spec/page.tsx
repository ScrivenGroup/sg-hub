import { DevelopmentHubRoom } from "@/core/kanban/ui/DevelopmentHubRoom";

export const dynamic = "force-dynamic";

export default function DevelopmentSpecPage() {
  return <DevelopmentHubRoom href="/d/spec" panel="spec" />;
}
