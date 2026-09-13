import { memo } from "react";
import type { ConnectionState } from "../types/telemetry";

interface ConnectionBadgeProps {
  state: ConnectionState;
  /** Opens the settings modal when clicked. */
  onClick?: () => void;
}

const CFG: Record<
  ConnectionState,
  { dot: string; bg: string; label: string; pulse: boolean }
> = {
  connected: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-400/20",
    label: "Live",
    pulse: false,
  },
  reconnecting: {
    dot: "bg-amber-400",
    bg: "bg-amber-400/20",
    label: "Reconnecting",
    pulse: true,
  },
  offline: {
    dot: "bg-red-500",
    bg: "bg-red-500/20",
    label: "Offline",
    pulse: false,
  },
};

/**
 * Coloured dot + status label.
 * Green = live, amber (pulsing) = reconnecting, red = offline.
 */
export const ConnectionBadge = memo(function ConnectionBadge({
  state,
  onClick,
}: ConnectionBadgeProps) {
  const c = CFG[state];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        ${c.bg} border border-zinc-800/50 transition-all duration-300
        hover:border-zinc-600 min-h-[32px]
      `}
    >
      <span
        className={`w-2 h-2 rounded-full ${c.dot} ${c.pulse ? "animate-pulse-glow" : ""}`}
      />
      <span className="text-zinc-300">{c.label}</span>
    </button>
  );
});
