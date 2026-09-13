import { memo, useState, useEffect, useRef } from "react";
import { X, Server } from "lucide-react";
import { getDefaultHost } from "../hooks/useTelemetry";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current host value. */
  host: string;
  /** Persists new host and triggers reconnect. */
  onSave: (host: string) => void;
}

/**
 * Overlay modal for configuring the backend server address.
 * Tap-outside-to-dismiss, Enter-to-save, auto-focus on open.
 */
export const SettingsModal = memo(function SettingsModal({
  isOpen,
  onClose,
  host,
  onSave,
}: SettingsModalProps) {
  const [value, setValue] = useState(host);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local state & focus when modal opens.
  useEffect(() => {
    if (isOpen) {
      setValue(host);
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen, host]);

  if (!isOpen) return null;

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed) {
      onSave(trimmed);
      onClose();
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Card */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-[90vw] max-w-sm space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
            <Server size={16} />
            <span>Server Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800
                       transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Host input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Host address
            </label>
            <button
              type="button"
              onClick={() => setValue(getDefaultHost())}
              className="text-[11px] text-cyan-400/90 hover:text-cyan-300 transition-colors"
            >
              Auto-detect IP
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="192.168.0.10:8000"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100
                       text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50
                       focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-xl
                     font-medium text-sm hover:bg-cyan-500/25 active:scale-[0.98] transition-all
                     min-h-[48px]"
        >
          Save &amp; Reconnect
        </button>
      </div>
    </div>
  );
});
