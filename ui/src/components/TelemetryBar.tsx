import { memo, useRef, type ReactNode } from "react";

interface TelemetryBarProps {
  /** Metric label (e.g. "Upload"). */
  label: string;
  /** Current value in the bar's unit. */
  value: number;
  /** Unit label shown after the number (default: "MB/s"). */
  unit?: string;
  /** Bar fill colour (CSS colour string). */
  color?: string;
  /** Optional leading icon. */
  icon?: ReactNode;
}

/**
 * Horizontal throughput bar with auto-ratcheting max scale.
 *
 * The `maxRef` ratchets upward (with 20 % headroom) but never shrinks,
 * so the bar width stays stable even when traffic drops back to zero.
 */
export const TelemetryBar = memo(function TelemetryBar({
  label,
  value,
  unit = "MB/s",
  color = "#06b6d4",
  icon,
}: TelemetryBarProps) {
  const maxRef = useRef(1);

  // Ratchet max up, never down within the session.
  if (value > maxRef.current) {
    maxRef.current = Math.max(value * 1.2, 1);
  }

  const pct = Math.min((value / maxRef.current) * 100, 100);

  return (
    <div className="space-y-1">
      {/* Label + numeric readout */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-zinc-400">
          {icon}
          <span>{label}</span>
        </div>
        <span className="tabular-nums text-zinc-300">
          {value.toFixed(2)}{" "}
          <span className="text-zinc-600">{unit}</span>
        </span>
      </div>

      {/* Bar track */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: pct > 5 ? `0 0 8px ${color}60` : "none",
          }}
        />
      </div>
    </div>
  );
});
