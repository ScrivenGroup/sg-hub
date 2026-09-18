import type { ReactNode } from "react";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import type { DevHostKind } from "@/core/kanban/host";
import { MTG_BUYLIST_HREF } from "../schema";
import { MtgBuylistLeafBody } from "./MtgBuylistNav";

export function MtgBuylistChrome({
  children,
  canRaise = true,
  hostKind,
  host,
}: {
  children?: ReactNode;
  canRaise?: boolean;
  hostKind?: DevHostKind;
  host?: string;
}) {
  return (
    <AppShell
      currentHref={MTG_BUYLIST_HREF}
      frameClassName="h-dvh max-h-dvh overflow-hidden"
      mainClassName="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-3 pt-3"
    >
      <div className="shrink-0">
        <PageNav href={MTG_BUYLIST_HREF} compact />
      </div>
      <MtgBuylistLeafBody canRaise={canRaise} hostKind={hostKind} host={host}>
        {children}
      </MtgBuylistLeafBody>
    </AppShell>
  );
}
