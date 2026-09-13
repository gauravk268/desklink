import { memo, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface RateGraphProps {
  title: string;
  icon?: ReactNode;
  channel1: {
    label: string;
    value: number; // in MB/s
    color: string;
    strokeColor: string;
  };
  channel2: {
    label: string;
    value: number; // in MB/s
    color: string;
    strokeColor: string;
  };
}

interface Point {
  x: number;
  y: number;
}

const MAX_HISTORY = 30;

/**
 * Creates a smooth SVG path (Cubic Bezier Spline) through an array of (x, y) coordinates.
 */
function getSmoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  if (points.length === 1) return `M ${first.x.toFixed(1)},${first.y.toFixed(1)}`;

  let d = `M ${first.x.toFixed(1)},${first.y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = (i > 0 ? points[i - 1] : points[i])!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = (i !== points.length - 2 ? points[i + 2] : p2)!;

    // Catmull-Rom to Cubic Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Real-time scrolling dual-rate line & area graph with smooth Bézier splines.
 * Displays two channels (e.g. Upload vs Download, or Read vs Write).
 */
export const RateGraph = memo(function RateGraph({
  title,
  icon,
  channel1,
  channel2,
}: RateGraphProps) {
  const [history, setHistory] = useState<{ v1: number; v2: number }[]>(() =>
    Array(MAX_HISTORY).fill({ v1: 0, v2: 0 }),
  );

  const historyRef = useRef(history);
  historyRef.current = history;

  // Append new telemetry rates to rolling history buffer
  useEffect(() => {
    setHistory((prev) => {
      const next = [...prev.slice(1), { v1: channel1.value, v2: channel2.value }];
      return next;
    });
  }, [channel1.value, channel2.value]);

  // Compute dynamic peak scale for Y-axis (minimum 0.5 MB/s to prevent division by 0)
  const maxRecorded = Math.max(
    ...history.flatMap((p) => [p.v1, p.v2]),
    0.5,
  );
  const peakY = Math.ceil(maxRecorded * 1.25 * 10) / 10; // 25% headroom

  const W = 300;
  const H = 75;
  const padX = 2;
  const padY = 6;
  const graphH = H - padY * 2;
  const graphW = W - padX * 2;

  function toPointList(points: number[]): Point[] {
    return points.map((val, idx) => {
      const x = padX + (idx / (MAX_HISTORY - 1)) * graphW;
      const normalized = Math.min(1, Math.max(0, val / peakY));
      const y = H - padY - normalized * graphH;
      return { x, y };
    });
  }

  const v1Points = history.map((p) => p.v1);
  const v2Points = history.map((p) => p.v2);

  const v1Coords = toPointList(v1Points);
  const v2Coords = toPointList(v2Points);

  const v1Path = getSmoothPath(v1Coords);
  const v2Path = getSmoothPath(v2Coords);

  const bottomY = (H - padY).toFixed(1);
  const startX = padX.toFixed(1);
  const endX = (W - padX).toFixed(1);

  const v1Area = `${v1Path} L ${endX},${bottomY} L ${startX},${bottomY} Z`;
  const v2Area = `${v2Path} L ${endX},${bottomY} L ${startX},${bottomY} Z`;

  const id1 = `grad-${title.replace(/\s+/g, "")}-1`;
  const id2 = `grad-${title.replace(/\s+/g, "")}-2`;

  return (
    <div className="flex flex-col justify-between h-full bg-zinc-900/80 border border-zinc-800/70 rounded-xl p-2.5 min-h-0 overflow-hidden shadow-inner">
      {/* Graph Header: Title + Current Rates */}
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex items-center gap-1.5 text-zinc-400">
          {icon}
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            {title}
          </span>
        </div>

        {/* Live Channel Badges */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="tabular-nums" style={{ color: channel1.color }}>
            <span className="text-[9px] opacity-75 mr-0.5">{channel1.label}</span>
            {channel1.value.toFixed(2)}
            <span className="text-[9px] text-zinc-500 ml-0.5">MB/s</span>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="tabular-nums" style={{ color: channel2.color }}>
            <span className="text-[9px] opacity-75 mr-0.5">{channel2.label}</span>
            {channel2.value.toFixed(2)}
            <span className="text-[9px] text-zinc-500 ml-0.5">MB/s</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 w-full min-h-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <defs>
            <linearGradient id={id1} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={channel1.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={channel1.color} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={id2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={channel2.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={channel2.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line
            x1="0"
            y1={H - padY}
            x2={W}
            y2={H - padY}
            stroke="#27272a"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={H / 2}
            x2={W}
            y2={H / 2}
            stroke="#27272a"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="0"
            y1={padY}
            x2={W}
            y2={padY}
            stroke="#27272a"
            strokeWidth="1"
            strokeDasharray="2 4"
          />

          {/* Smooth Area Fills */}
          <path d={v1Area} fill={`url(#${id1})`} />
          <path d={v2Area} fill={`url(#${id2})`} />

          {/* Smooth Lines */}
          <path
            d={v1Path}
            fill="none"
            stroke={channel1.strokeColor}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={v2Path}
            fill="none"
            stroke={channel2.strokeColor}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {/* Max Scale Indicator Badge positioned on top-left */}
        <span className="absolute top-1 left-1 text-[8px] font-mono text-zinc-500 bg-zinc-950/80 px-1 py-0.5 rounded pointer-events-none border border-zinc-800/40">
          max {peakY.toFixed(1)} MB/s
        </span>
      </div>
    </div>
  );
});
