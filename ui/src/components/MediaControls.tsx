import { memo, useState } from "react";
import { SkipBack, Play, Pause, SkipForward, Music, Maximize2, X } from "lucide-react";
import type { MediaStatus } from "../types/telemetry";

interface MediaControlsProps {
  media: MediaStatus;
  sendCommand: (cmd: string) => void;
}

/**
 * Now-playing display with album art + Prev / Play-Pause / Next buttons.
 * Clicking the album art opens a large view modal.
 *
 * All touch targets are ≥ 48×48 px for reliable dock tapping.
 * Buttons include `active:scale-95` press feedback.
 */
export const MediaControls = memo(function MediaControls({
  media,
  sendCommand,
}: MediaControlsProps) {
  const isPlaying = media.status === "Playing";
  const [imgError, setImgError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const hasArt = Boolean(media.art_url && !imgError);

  return (
    <>
      <div className="space-y-3">
        {/* Track info + Album art */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => hasArt && setIsZoomed(true)}
            disabled={!hasArt}
            className={`relative w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center shadow-md transition-all group ${
              hasArt ? "cursor-pointer hover:border-cyan-500/50 active:scale-95" : ""
            }`}
            aria-label={hasArt ? "View album artwork full size" : "No artwork"}
          >
            {hasArt ? (
              <>
                <img
                  src={media.art_url}
                  alt={media.title || "Album Art"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={16} className="text-white drop-shadow" />
                </div>
              </>
            ) : (
              <Music size={20} className="text-zinc-600" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-100 truncate leading-tight">
              {media.title || "No Track"}
            </p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {media.artist || "—"}
            </p>
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => sendCommand("media_prev")}
            className="p-3 rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-zinc-100
                       hover:bg-zinc-700/80 active:scale-95 transition-all duration-150
                       min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Previous track"
          >
            <SkipBack size={20} />
          </button>

          <button
            type="button"
            onClick={() => sendCommand("media_play_pause")}
            className="p-4 rounded-xl text-cyan-400 active:scale-95 transition-all duration-150
                       border border-cyan-500/30 bg-cyan-500/15 hover:bg-cyan-500/25
                       min-w-[56px] min-h-[56px] flex items-center justify-center
                       shadow-[0_0_20px_rgba(6,182,212,0.12)]"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            type="button"
            onClick={() => sendCommand("media_next")}
            className="p-3 rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-zinc-100
                       hover:bg-zinc-700/80 active:scale-95 transition-all duration-150
                       min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Next track"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Large Image Lightbox Modal */}
      {isZoomed && hasArt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-sm w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-zinc-800/90 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors z-10 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>

            {/* Full-size image */}
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-inner flex items-center justify-center">
              <img
                src={media.art_url}
                alt={media.title || "Album Art"}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Track Info Banner */}
            <div className="text-center w-full px-2">
              <h3 className="text-base font-semibold text-zinc-100 truncate">
                {media.title || "Unknown Track"}
              </h3>
              <p className="text-xs text-cyan-400 truncate mt-0.5">
                {media.artist || "Unknown Artist"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
