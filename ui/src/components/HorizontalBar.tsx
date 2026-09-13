import { memo, type ReactNode } from "react";

interface HorizontalBarProps {
  icon: ReactNode;
  label: string;
  value: number | null;
  min?: number;
  max: number;
  unit: string;
  emptyText?: string;
}

/**
 * Returns a dynamic color matching the current position in the blue -> yellow -> red spectrum.
 * Blue (cool / low) -> Yellow (warm / medium) -> Red (hot / high).
 */
function getProgressColor(ratio: number): string {
  const r = Math.max(0, Math.min(1, ratio));

  if (r < 0.5) {
    // 0.0 -> 0.5: Blue (#3b82f6) to Yellow (#eab308)
    const t = r / 0.5;
    const red = Math.round(59 + t * (234 - 59));
    const green = Math.round(130 + t * (179 - 130));
    const blue = Math.round(246 + t * (8 - 246));
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    // 0.5 -> 1.0: Yellow (#eab308) to Red (#ef4444)
    const t = (r - 0.5) / 0.5;
    const red = Math.round(234 + t * (239 - 234));
    const green = Math.round(179 + t * (68 - 179));
    const blue = Math.round(8 + t * (68 - 8));
    return `rgb(${red}, ${green}, ${blue})`;
  }
}

/**
 * Horizontal progress bar with blue -> yellow -> red color progression,
 * displaying icon, label, current numeric value, unit, and calibrated horizontal bar.
 */
export const HorizontalBar = memo(function HorizontalBar({
  icon,
  label,
  value,
  min = 0,
  max,
  unit,
  emptyText = "—",
}: HorizontalBarProps) {
  const isAvailable = value !== null && !isNaN(value);
  const numericVal = isAvailable ? value! : min;
  const clampedVal = Math.min(Math.max(numericVal, min), max);
  const ratio = max > min ? (clampedVal - min) / (max - min) : 0;
  const percentage = Math.round(ratio * 100);

  const activeColor = isAvailable ? getProgressColor(ratio) : "#71717a";

  return (
    <div className="flex flex-col justify-center p-2 sm:px-3 sm:py-2 bg-zinc-900/70 rounded-xl border border-zinc-800/60 min-w-0 overflow-hidden shadow-inner">
      {/* Header: Icon + Label on left, Numeric Value on right */}
      <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="shrink-0 text-zinc-400" style={{ color: isAvailable ? activeColor : undefined }}>
            {icon}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">
            {label}
          </span>
        </div>

        <div className="text-xs sm:text-sm font-bold font-mono tabular-nums shrink-0" style={{ color: isAvailable ? activeColor : "#71717a" }}>
          {isAvailable ? (
            <>
              {value}
              <span className="text-[10px] sm:text-xs text-zinc-500 font-normal ml-0.5">
                {unit}
              </span>
            </>
          ) : (
            emptyText
          )}
        </div>
      </div>

      {/* Track & Filled Progress Bar with Blue -> Yellow -> Red gradient */}
      <div className="relative w-full h-2 sm:h-2.5 bg-zinc-950/80 rounded-full overflow-hidden p-0.5 border border-zinc-800/50">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out relative"
          style={{
            width: `${percentage}%`,
            background: isAvailable
              ? "linear-gradient(90deg, #3b82f6 0%, #06b6d4 25%, #eab308 60%, #ef4444 100%)"
              : "#3f3f46",
            boxShadow: isAvailable ? `0 0 8px ${activeColor}55` : "none",
          }}
        >
          {/* Subtle glowing leading edge */}
          {isAvailable && percentage > 4 && (
            <div className="absolute right-0 top-0 bottom-0 w-1.5 rounded-full bg-white/90 shadow-sm" />
          )}
        </div>
      </div>

      {/* Scale indicators: min and max bounds */}
      <div className="flex justify-between items-center mt-1 text-[8px] sm:text-[9px] font-mono text-zinc-500 leading-none">
        <span className="text-blue-400/80">{min}{unit}</span>
        <span className="text-amber-400/80">{Math.round((min + max) / 2)}{unit}</span>
        <span className="text-red-400/80">{max}{unit}</span>
      </div>
    </div>
  );
});
