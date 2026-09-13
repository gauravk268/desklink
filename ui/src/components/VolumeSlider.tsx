import { memo, useState } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";

interface VolumeSliderProps {
  volume: number;
  onVolumeChange: (vol: number) => void;
}

/**
 * Touch-friendly volume slider with live percentage readout and mute toggle.
 * Replaces the legacy caffeine switch.
 */
export const VolumeSlider = memo(function VolumeSlider({
  volume,
  onVolumeChange,
}: VolumeSliderProps) {
  const [prevVolume, setPrevVolume] = useState(volume || 50);

  function handleMuteToggle() {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume > 0 ? prevVolume : 50);
    }
  }

  const Icon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
          Volume
        </span>
        <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums">
          {volume}%
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Mute toggle button */}
        <button
          type="button"
          onClick={handleMuteToggle}
          className="p-2 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/80
                     active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
          aria-label={volume === 0 ? "Unmute" : "Mute"}
        >
          <Icon size={18} />
        </button>

        {/* Custom Touch Slider Bar */}
        <div className="relative flex-1 flex items-center py-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400
                       focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${volume}%, #27272a ${volume}%, #27272a 100%)`,
            }}
            aria-label="Volume slider"
          />
        </div>
      </div>
    </div>
  );
});
