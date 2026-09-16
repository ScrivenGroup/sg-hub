import type { DevHostKind } from "@/core/kanban/host";
import {
  getChangelogsForNode,
  getGuestMrtSandbox,
  getSunwaterMrtStore,
} from "@/core/store/json-store";
import { MrtWorkspace } from "./MrtWorkspace";

export async function MrtPlanBody({
  guest,
  guestId,
  showDevelopment,
  hostKind,
}: {
  guest: boolean;
  guestId?: string;
  showDevelopment: boolean;
  hostKind: DevHostKind;
}) {
  const [store, changelogs] = await Promise.all([
    guest && guestId
      ? getGuestMrtSandbox(guestId)
      : getSunwaterMrtStore(),
    getChangelogsForNode("w-sunwater-mrt"),
  ]);
  return (
    <MrtWorkspace
      initialStore={store}
      changelogs={changelogs}
      showDevelopment={showDevelopment}
      readOnly={false}
      sandbox={guest}
      hostKind={hostKind}
    />
  );
}
