import { memo, type ReactNode } from "react";

interface GaugeProps {
  /** 0–100 percentage value. */
  value: number;
  /** Label shown below the arc. */
  label: string;
  /** Unit text inside the arc (default: "%"). */
  unit?: string;
  /** Optional icon beside the label. */
  icon?: ReactNode;
}

/* SVG arc geometry — 270° sweep starting at bottom-left. */
const R = 45;
const STROKE = 7;
const CX = 60;
const CY = 60;
const CIRC = 2 * Math.PI * R; // full circumference
const ARC = CIRC * (270 / 360); // 270° arc length
const START_ROT = 135; // rotation so arc opens at the bottom

function colorForValue(v: number): string {
  if (v >= 80) return "#ef4444"; // red-500
  if (v >= 60) return "#eab308"; // yellow-500
  return "#06b6d4"; // cyan-500
}

/**
 * SVG circular-arc gauge with smooth CSS transitions.
 * Colour shifts cyan → yellow → red as value climbs.
 */
export const Gauge = memo(function Gauge({
  value,
  label,
  unit = "%",
  icon,
}: GaugeProps) {
  const clamped = Math.max(0, Math.min(value, 100));
  const offset = ARC * (1 - clamped / 100);
  const color = colorForValue(clamped);

  return (
    <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
      {/* Circle container with HTML overlay */}
      <div className="relative w-full max-w-[110px] sm:max-w-[125px] aspect-square flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="w-full h-full block">
          {/* Background track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#27272a"
            strokeWidth={STROKE}
            strokeDasharray={`${ARC} ${CIRC}`}
            strokeLinecap="round"
            transform={`rotate(${START_ROT} ${CX} ${CY})`}
          />

          {/* Filled arc */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={`${ARC} ${CIRC}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(${START_ROT} ${CX} ${CY})`}
            style={{
              transition: "stroke-dashoffset 0.6s ease, stroke 0.6s ease",
            }}
          />
        </svg>

        {/* Rock-solid HTML text overlay (never clips or misaligns on tablet WebViews) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-0.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 tabular-nums leading-none">
            {Math.round(clamped)}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-sans mt-0.5 leading-none">
            {unit}
          </span>
        </div>
      </div>

      {/* Label + Icon */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
    </div>
  );
});
