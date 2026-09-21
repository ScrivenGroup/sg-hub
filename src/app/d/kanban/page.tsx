import { DevelopmentHubRoom } from "@/core/kanban/ui/DevelopmentHubRoom";

export const dynamic = "force-dynamic";

export default function DevelopmentKanbanPage() {
  return <DevelopmentHubRoom href="/d/kanban" panel="kanban" />;
}
