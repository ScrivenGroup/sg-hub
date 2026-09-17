import { redirect } from "next/navigation";

export default async function InternalKanbanRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const q = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  redirect(`/d${q}`);
}
