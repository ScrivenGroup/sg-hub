import { redirect } from "next/navigation";
import { developmentHubPathForTab } from "@/core/kanban/development-hub";

export default async function InternalKanbanRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  redirect(developmentHubPathForTab(tab));
}
