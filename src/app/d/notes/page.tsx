import { DevelopmentHubRoom } from "@/core/kanban/ui/DevelopmentHubRoom";

export const dynamic = "force-dynamic";

export default function DevelopmentNotesPage() {
  return <DevelopmentHubRoom href="/d/notes" panel="notes" />;
}
