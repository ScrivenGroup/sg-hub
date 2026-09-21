"use client";

import type { ReactNode } from "react";
import type { RegistryNode } from "@/core/contracts/types";

/** Shared hub → children list. Site network travel and Raise leaf picker both use this. */
export function SiteNetworkNestedList({
  hubs,
  childrenByHub,
  home,
  renderHub,
  renderChild,
}: {
  hubs: RegistryNode[];
  childrenByHub: Record<string, RegistryNode[]>;
  home: ReactNode;
  renderHub: (hub: RegistryNode) => ReactNode;
  renderChild: (child: RegistryNode) => ReactNode;
}) {
  return (
    <ul className="space-y-3">
      <li>{home}</li>
      {hubs.map((hub) => (
        <li key={hub.id} className="space-y-1">
          {renderHub(hub)}
          <ul className="ml-4 space-y-1 border-l border-[var(--border)] pl-3">
            {(childrenByHub[hub.id] ?? []).map((child) => (
              <li key={child.id}>{renderChild(child)}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
