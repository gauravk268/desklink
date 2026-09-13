import { memo, type ReactNode } from "react";

interface StatCardProps {
  /** Lucide icon or emoji. */
  icon: ReactNode;
  /** Compact label (e.g. "CPU Temp"). */
  label: string;
  /** Formatted value string or number. */
  value: string | number;
  /** Optional unit suffix (e.g. "°C", "RPM"). */
  unit?: string;
}

/**
 * Compact stat tile — icon + label + monospaced value.
 * Uses `tabular-nums` for fixed-width digits to prevent layout shifts.
 */
export const StatCard = memo(function StatCard({
  icon,
  label,
  value,
  unit,
}: StatCardProps) {
  return (
    <div className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 bg-zinc-900/60 rounded-lg border border-zinc-800/50 min-w-0 overflow-hidden">
      <div className="text-cyan-400 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider leading-tight truncate">
          {label}
        </div>
        <div className="text-xs sm:text-sm font-semibold tabular-nums text-zinc-100 transition-all duration-300 truncate">
          {value}
          {unit && <span className="text-zinc-500 ml-0.5 text-xs font-normal">{unit}</span>}
        </div>
      </div>
    </div>
  );
});
