import type { RegistryNode } from "@/core/contracts/types";
import { codeBadgeColor, getChildren } from "@/core/registry";

const CX = 240;
const CY = 240;
const RIM = 150;

type Dot = {
  id: string;
  name: string;
  hex: string;
  hub: boolean;
  pendingDelete: boolean;
  h: number;
  s: number;
};

function hexToHsl(code: string): { h: number; s: number; l: number } {
  const raw = code.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

function polar(h: number, s: number): { x: number; y: number } {
  const rad = (h * Math.PI) / 180;
  const radius = (s / 100) * RIM;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY - radius * Math.sin(rad),
  };
}

function dotsFor(hubs: RegistryNode[]): Dot[] {
  const dots: Dot[] = [];
  for (const hub of hubs) {
    const hsl = hexToHsl(hub.code);
    dots.push({
      id: hub.id,
      name: hub.title,
      hex: codeBadgeColor(hub.code),
      hub: true,
      pendingDelete: Boolean(hub.pendingDelete),
      h: hsl.h,
      s: hsl.s,
    });
    for (const child of getChildren(hub.id)) {
      const childHsl = hexToHsl(child.code);
      dots.push({
        id: child.id,
        name: child.title,
        hex: codeBadgeColor(child.code),
        hub: false,
        pendingDelete: Boolean(child.pendingDelete),
        h: childHsl.h,
        s: childHsl.s,
      });
    }
  }
  return dots;
}

/** Hue around the rim, saturation out from the centre. Greys sit in the middle. */
export function HubColorWheel({ hubs }: { hubs: RegistryNode[] }) {
  const dots = dotsFor(hubs);
  let grey = 0;
  const placed = dots.map((dot) => {
    if (dot.s < 2) {
      const slot = grey;
      grey += 1;
      const ang = (slot * Math.PI * 2) / 7;
      const ring = 18;
      return {
        ...dot,
        x: CX + ring * Math.cos(ang),
        y: CY + ring * Math.sin(ang),
      };
    }
    const at = polar(dot.h, dot.s);
    return { ...dot, x: at.x, y: at.y };
  });

  const guides = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
    const outer = polar(deg, 100);
    const inner = polar(deg, 94);
    return { deg, ...{ x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y } };
  });

  const labels: Array<[number, string]> = [
    [0, "Red"],
    [60, "Yellow"],
    [120, "Green"],
    [180, "Cyan"],
    [240, "Blue"],
    [300, "Magenta"],
  ];

  return (
    <div className="relative aspect-square w-full max-w-[480px]">
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          left: "18.75%",
          top: "18.75%",
          width: "62.5%",
          height: "62.5%",
          background:
            "radial-gradient(circle, #808080 0%, rgba(128, 128, 128, 0) 72%), conic-gradient(from 90deg, hsl(0 100% 50%), hsl(330 100% 50%), hsl(300 100% 50%), hsl(270 100% 50%), hsl(240 100% 50%), hsl(210 100% 50%), hsl(180 100% 50%), hsl(150 100% 50%), hsl(120 100% 50%), hsl(90 100% 50%), hsl(60 100% 50%), hsl(30 100% 50%), hsl(0 100% 50%))",
        }}
      />
      <svg
        viewBox="0 0 480 480"
        className="relative z-[1] h-full w-full"
        role="img"
        aria-label="Hub colours on a hue and saturation wheel"
      >
        <circle cx={CX} cy={CY} r={RIM} fill="none" stroke="#1a1a1a" strokeOpacity={0.25} />
        <circle cx={CX} cy={CY} r={RIM / 2} fill="none" stroke="#1a1a1a" strokeOpacity={0.2} />
        {guides.map((mark) => (
          <line
            key={mark.deg}
            x1={mark.x1}
            y1={mark.y1}
            x2={mark.x2}
            y2={mark.y2}
            stroke="#1a1a1a"
            strokeOpacity={0.35}
          />
        ))}
        {labels.map(([deg, name]) => {
          const at = polar(deg, 122);
          return (
            <text
              key={name}
              x={at.x}
              y={at.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#3c3c3b"
              fontSize={13}
            >
              {name}
            </text>
          );
        })}
        {placed.map((dot) => {
          const label = `${dot.name} ${dot.hex}${dot.pendingDelete ? " (to delete)" : ""}`;
          return (
            <circle
              key={dot.id}
              cx={dot.x}
              cy={dot.y}
              r={dot.hub ? 11 : 7}
              fill={dot.hex}
              stroke="#ffffff"
              strokeWidth={dot.hub ? 2.5 : 1.5}
              opacity={dot.pendingDelete ? 0.45 : 1}
              aria-label={label}
            >
              <title suppressHydrationWarning>{label}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
