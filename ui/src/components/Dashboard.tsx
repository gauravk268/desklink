import { memo, useState, useEffect } from "react";
import {
  Cpu,
  MemoryStick,
  Thermometer,
  Fan,
  HardDrive,
  Settings,
  Maximize,
  Minimize,
  ArrowUpDown,
} from "lucide-react";

import { useTelemetry, useMetrics } from "../hooks/useTelemetry";
import { useWakeLock } from "../hooks/useWakeLock";
import { AnalogMeter } from "./AnalogMeter";
import { HorizontalBar } from "./HorizontalBar";
import { RateGraph } from "./RateGraph";
import { MediaControls } from "./MediaControls";
import { VolumeSlider } from "./VolumeSlider";
import { ConnectionBadge } from "./ConnectionBadge";
import { SettingsModal } from "./SettingsModal";

// ---------------------------------------------------------------------------
// Panel A — Analog CPU & RAM meters with numeric on top, temp, fan
// ---------------------------------------------------------------------------
const SystemPanel = memo(function SystemPanel() {
  const m = useMetrics();

  return (
    <div className="flex flex-col justify-between h-full gap-2 min-h-0">
      {/* Dual Analog Meters with Numeric Values on Top */}
      <div className="flex items-center justify-around gap-2 flex-1 min-h-0">
        <AnalogMeter
          value={m.cpu_percent}
          label="CPU"
          icon={<Cpu size={14} className="text-cyan-400" />}
        />
        <AnalogMeter
          value={m.mem_percent}
          label="RAM"
          icon={<MemoryStick size={14} className="text-cyan-400" />}
        />
      </div>

      {/* Temp & Fan Horizontal Bars stacked in a single column (top/bottom) */}
      <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
        <HorizontalBar
          icon={<Thermometer size={14} />}
          label="CPU Temp"
          value={m.cpu_temp_c !== null ? Math.round(m.cpu_temp_c) : null}
          min={20}
          max={100}
          unit="°C"
        />
        <HorizontalBar
          icon={<Fan size={14} />}
          label="Fan"
          value={m.fan_rpm.length > 0 && m.fan_rpm[0]?.rpm ? m.fan_rpm[0].rpm : null}
          min={0}
          max={5000}
          unit="RPM"
        />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Panel B — Top: Network Rate Graph | Bottom: Storage I/O Rate Graph
// ---------------------------------------------------------------------------
const IOPanel = memo(function IOPanel() {
  const m = useMetrics();

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0 justify-between">
      {/* Top Graph: Network Traffic */}
      <div className="flex-1 min-h-0">
        <RateGraph
          title="Network"
          icon={<ArrowUpDown size={13} className="text-cyan-400" />}
          channel1={{
            label: "↑",
            value: m.net_send_mbps,
            color: "#22d3ee",
            strokeColor: "#06b6d4",
          }}
          channel2={{
            label: "↓",
            value: m.net_recv_mbps,
            color: "#60a5fa",
            strokeColor: "#3b82f6",
          }}
        />
      </div>

      {/* Bottom Graph: Storage I/O */}
      <div className="flex-1 min-h-0">
        <RateGraph
          title="Storage I/O"
          icon={<HardDrive size={13} className="text-emerald-400" />}
          channel1={{
            label: "R",
            value: m.disk_read_mbps,
            color: "#34d399",
            strokeColor: "#10b981",
          }}
          channel2={{
            label: "W",
            value: m.disk_write_mbps,
            color: "#fbbf24",
            strokeColor: "#f59e0b",
          }}
        />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Dashboard root
// ---------------------------------------------------------------------------
export function Dashboard() {
  const { connectionState, media, volume, setVolume, sendCommand, host, setHost } =
    useTelemetry();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state with browser / ESC key / gestures
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Browser blocked or not supported on this platform
    }
  };

  // Acquire screen wake-lock for kiosk mode.
  useWakeLock();

  return (
    <div className="h-full w-full min-h-screen min-h-[100dvh] max-h-screen max-h-[100dvh] p-2.5 flex flex-col gap-2.5 overflow-hidden portrait:overflow-y-auto">
      {/* ---- Header bar ---- */}
      <div className="flex items-center justify-between shrink-0">
        <ConnectionBadge
          state={connectionState}
          onClick={() => setSettingsOpen(true)}
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/80
                       active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80
                       active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ---- 3-panel responsive grid (landscape 3-col, portrait 1-col scrollable) ---- */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 landscape:grid-cols-3 gap-2.5 min-h-0 portrait:min-h-max">
        {/* Panel A — System (Analog Meters + Stats) */}
        <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-3 backdrop-blur-sm overflow-hidden min-h-[180px]">
          <SystemPanel />
        </div>

        {/* Panel B — I/O (Top: Network Graph, Bottom: Storage Graph) */}
        <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-3 backdrop-blur-sm overflow-hidden min-h-[180px]">
          <IOPanel />
        </div>

        {/* Panel C — Media & Volume Slider */}
        <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-3 backdrop-blur-sm overflow-hidden flex flex-col justify-between min-h-[180px] gap-3">
          <MediaControls media={media} sendCommand={sendCommand} />
          <VolumeSlider volume={volume} onVolumeChange={setVolume} />
        </div>
      </div>

      {/* ---- Settings overlay ---- */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        host={host}
        onSave={setHost}
      />
    </div>
  );
}
