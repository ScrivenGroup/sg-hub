import { isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { getBuylistSession, requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { MtgBuylistChrome } from "@/modules/mtg-buylist/ui/MtgBuylistChrome";

export const dynamic = "force-dynamic";

export default async function MtgBuylistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getBuylistSession();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const { kind, host } = hostKindFromHeaders(await headers());
  const staff = await requireBuylistStaff();

  return (
    <MtgBuylistChrome canRaise={Boolean(staff)} hostKind={kind} host={host}>
      {children}
    </MtgBuylistChrome>
  );
}
