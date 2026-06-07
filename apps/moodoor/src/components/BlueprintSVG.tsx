/**
 * BlueprintSVG — renders the deterministic polar blueprint JSON as a line-art
 * "blueprint" preview. Pure function of its input: identical blueprint -> identical
 * SVG. This is the customer-facing craft signal that clicks through to the hero render.
 */
import type { Blueprint } from "@/lib/composition";

const ZS_RADIAL: Record<string, number> = {
  structural: -14,
  focal: -2,
  secondary: 8,
  bridge: 4,
  greenery: 16,
  accent: 24,
  texture: 20,
  filler: 12,
};

const ROLE_MARKER: Record<string, number> = {
  structural: 9,
  focal: 11,
  secondary: 7,
  bridge: 6,
  greenery: 5,
  accent: 4,
  texture: 4,
  filler: 4,
};

export default function BlueprintSVG({
  blueprint,
  size = 320,
}: {
  blueprint: Blueprint;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const ring = size * 0.34;
  const { s, e } = blueprint.arcConfig;

  // Flatten every stem into a sequence so we can spread them evenly along the arc.
  type Stem = { role: string; color: string };
  const stems: Stem[] = [];
  for (const slot of blueprint.slots) {
    const color = slot.item?.color || "#4a6741";
    for (let i = 0; i < slot.stemCount; i++) stems.push({ role: slot.role, color });
  }
  const n = Math.max(1, stems.length);

  const markers = stems.map((stem, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angDeg = s + (e - s) * t;
    const ang = (angDeg * Math.PI) / 180;
    const r = ring + (ZS_RADIAL[stem.role] ?? 8);
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang);
    const mr = ROLE_MARKER[stem.role] ?? 5;
    return { x, y, mr, color: stem.color, key: i };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={`Blueprint preview, ${blueprint.formula} composition, ${blueprint.totalStems} stems`}
    >
      {/* guide ring */}
      <circle cx={cx} cy={cy} r={ring} fill="none" stroke="#d8d3c8" strokeWidth={1} strokeDasharray="2 4" />
      <circle cx={cx} cy={cy} r={ring + 24} fill="none" stroke="#e6e2d9" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={ring - 18} fill="none" stroke="#e6e2d9" strokeWidth={1} />

      {/* connecting placement line through the arc */}
      <polyline
        points={markers.map((m) => `${m.x.toFixed(1)},${m.y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke="#b9b2a4"
        strokeWidth={0.75}
      />

      {/* stems */}
      {markers.map((m) => (
        <g key={m.key}>
          <circle cx={m.x} cy={m.y} r={m.mr} fill={m.color} opacity={0.92} />
          <circle cx={m.x} cy={m.y} r={m.mr} fill="none" stroke="#3a5233" strokeWidth={0.5} opacity={0.5} />
        </g>
      ))}
    </svg>
  );
}
