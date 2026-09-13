import { memo, type ReactNode } from "react";

interface AnalogMeterProps {
  /** 0–100 percentage value. */
  value: number;
  /** Label shown on top (e.g. "CPU", "RAM"). */
  label: string;
  /** Unit suffix (default: "%"). */
  unit?: string;
  /** Optional icon beside the label. */
  icon?: ReactNode;
}

/**
 * Analog dial meter with physical needle pointer and numeric value shown prominently on top.
 */
export const AnalogMeter = memo(function AnalogMeter({
  value,
  label,
  unit = "%",
  icon,
}: AnalogMeterProps) {
  const clamped = Math.max(0, Math.min(Math.round(value), 100));

  // Needle angle: -100 deg (0%) to +100 deg (100%) -> 200 deg sweep
  const minAngle = -100;
  const maxAngle = 100;
  const needleAngle = minAngle + (clamped / 100) * (maxAngle - minAngle);

  // Dynamic color matching the value
  const valueColor =
    clamped >= 80 ? "#ef4444" : clamped >= 60 ? "#eab308" : "#06b6d4";

  // Dial geometry
  const CX = 75;
  const CY = 72;
  const R = 54;

  // Major tick marks (0, 25, 50, 75, 100)
  const ticks = [0, 25, 50, 75, 100].map((t) => {
    const angleDeg = minAngle + (t / 100) * (maxAngle - minAngle);
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const x1 = CX + (R - 8) * Math.cos(rad);
    const y1 = CY + (R - 8) * Math.sin(rad);
    const x2 = CX + R * Math.cos(rad);
    const y2 = CY + R * Math.sin(rad);
    return { val: t, x1, y1, x2, y2 };
  });

  return (
    <div className="flex flex-col items-center justify-between w-full h-full min-w-0 flex-1 p-1">
      {/* 1. Numeric Value Shown on Top */}
      <div className="flex flex-col items-center justify-center shrink-0 mb-0.5">
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span
            className="text-2xl sm:text-3xl font-bold font-mono tabular-nums leading-none tracking-tight transition-colors duration-300"
            style={{ color: valueColor }}
          >
            {clamped}
          </span>
          <span className="text-xs text-zinc-500 font-sans font-medium">
            {unit}
          </span>
        </div>
      </div>

      {/* 2. Analog Meter Dial Face */}
      <div className="relative w-full max-w-[130px] aspect-[4/3] flex items-center justify-center">
        <svg viewBox="0 0 150 100" className="w-full h-full overflow-visible">
          <defs>
            {/* Warning gradient arc */}
            <linearGradient id="meter-arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="60%" stopColor="#22d3ee" />
              <stop offset="78%" stopColor="#eab308" />
              <stop offset="95%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Background scale arc */}
          <path
            d="M 23.8 62.6 A 54 54 0 1 1 126.2 62.6"
            fill="none"
            stroke="#27272a"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Calibrated colored arc */}
          <path
            d="M 23.8 62.6 A 54 54 0 1 1 126.2 62.6"
            fill="none"
            stroke="url(#meter-arc-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Major tick lines */}
          {ticks.map((t) => (
            <line
              key={t.val}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.val >= 80 ? "#ef4444" : "#71717a"}
              strokeWidth={t.val === 0 || t.val === 100 ? "2" : "1.5"}
              strokeLinecap="round"
            />
          ))}

          {/* Scale Labels: 0, 50, 100 */}
          <text
            x="20"
            y="76"
            fontSize="8"
            fill="#71717a"
            fontFamily="monospace"
            textAnchor="middle"
          >
            0
          </text>
          <text
            x="75"
            y="28"
            fontSize="8"
            fill="#71717a"
            fontFamily="monospace"
            textAnchor="middle"
          >
            50
          </text>
          <text
            x="130"
            y="76"
            fontSize="8"
            fill="#ef4444"
            fontFamily="monospace"
            textAnchor="middle"
          >
            100
          </text>

          {/* Rotating Analog Needle */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            {/* Needle line */}
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - R + 6}
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Tail */}
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY + 10}
              stroke="#71717a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Center Pivot Hub / Cap */}
          <circle cx={CX} cy={CY} r="6" fill="#18181b" stroke="#71717a" strokeWidth="2" />
          <circle cx={CX} cy={CY} r="2.5" fill="#f43f5e" />
        </svg>
      </div>
    </div>
  );
});
