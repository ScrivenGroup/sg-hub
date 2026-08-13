import type { RegistryNode } from "@/core/contracts/types";
import { HUB_LABELS, seedNodes } from "./seed";

export { HUB_LABELS };

export function getNodes(): RegistryNode[] {
  return seedNodes;
}

export function getHubs(): RegistryNode[] {
  return seedNodes
    .filter((n) => n.kind === "hub")
    .sort((a, b) => a.order - b.order);
}

export function getChildren(parentId: string): RegistryNode[] {
  return seedNodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function getNodeByHref(href: string): RegistryNode | undefined {
  const normalized = href.replace(/\/$/, "") || "/";
  return seedNodes.find((n) => n.href === normalized);
}

export function getNodeById(id: string): RegistryNode | undefined {
  return seedNodes.find((n) => n.id === id);
}

export function codeBadgeLabel(node: RegistryNode): string {
  return `${node.hubPrefix.toUpperCase()}·${node.code}`;
}

export function codeBadgeColor(code: string): string {
  return `#${code}`;
}

export function codeBadgeForeground(code: string): string {
  const hex = code.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
}
