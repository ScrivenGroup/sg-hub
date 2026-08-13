import {
  codeBadgeColor,
  codeBadgeForeground,
  codeBadgeLabel,
} from "@/core/registry";
import type { RegistryNode } from "@/core/contracts/types";

export function CodeBadge({ node }: { node: RegistryNode }) {
  const bg = codeBadgeColor(node.code);
  const fg = codeBadgeForeground(node.code);
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold tracking-wide"
      style={{ backgroundColor: bg, color: fg }}
      title="Stable sub-hub code (badge colour only — not theme)"
    >
      {codeBadgeLabel(node)}
    </span>
  );
}
