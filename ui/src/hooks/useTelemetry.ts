/**
 * WebSocket telemetry hook with split-state architecture.
 *
 * High-frequency metrics (CPU, RAM, net, disk) live in an external store
 * consumed via `useSyncExternalStore` — only components that call
 * `useMetrics()` re-render at 1 Hz.
 *
 * Low-frequency state (media, caffeine) lives in regular `useState` and
 * only triggers re-renders when values actually change.
 *
 * Reconnection uses exponential back-off: 1 s → 2 s → 4 s → … → 30 s cap.
 */

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import type { TelemetryData, MetricsData, MediaStatus, ConnectionState } from "../types/telemetry";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// const DEFAULT_HOST = "fedora-pc.local:8000";
const LS_KEY = "desk-gadget-host";
const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

export function getDefaultHost(): string {
  if (typeof window !== "undefined" && window.location.hostname) {
    const h = window.location.hostname;
    if (h !== "localhost" && h !== "127.0.0.1") {
      return `${h}:8000`;
    }
  }
  return "localhost:8000";
}

// ---------------------------------------------------------------------------
// External metrics store (module-level singleton)
// ---------------------------------------------------------------------------

const defaultMetrics: MetricsData = {
  cpu_percent: 0,
  mem_percent: 0,
  net_send_mbps: 0,
  net_recv_mbps: 0,
  disk_read_mbps: 0,
  disk_write_mbps: 0,
  cpu_temp_c: null,
  fan_rpm: [],
};

type Listener = () => void;

let _metricsSnapshot: MetricsData = defaultMetrics;
const _metricsListeners = new Set<Listener>();

function metricsSubscribe(listener: Listener): () => void {
  _metricsListeners.add(listener);
  return () => {
    _metricsListeners.delete(listener);
  };
}

function metricsGetSnapshot(): MetricsData {
  return _metricsSnapshot;
}

function metricsEmit(next: MetricsData): void {
  _metricsSnapshot = next;
  _metricsListeners.forEach((l) => l());
}

/**
 * Subscribe to the high-frequency metrics store.
 * Components calling this re-render at ~1 Hz.
 */
export function useMetrics(): MetricsData {
  return useSyncExternalStore(metricsSubscribe, metricsGetSnapshot);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultMedia: MediaStatus = { title: "", artist: "", status: "Stopped" };

function readHost(): string {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && saved.trim()) {
      const val = saved.trim();
      // If tablet or phone loaded on remote IP (e.g. 192.168.x), discard stale 'localhost' or '.local'
      if (
        typeof window !== "undefined" &&
        window.location.hostname &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1" &&
        (val.includes("localhost") || val.includes(".local"))
      ) {
        localStorage.removeItem(LS_KEY);
      } else {
        return val;
      }
    }
  } catch {
    /* ignore */
  }
  return getDefaultHost();
}

function writeHost(host: string): void {
  try {
    localStorage.setItem(LS_KEY, host);
  } catch {
    /* quota or private-mode — ignore */
  }
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export interface UseTelemetryReturn {
  connectionState: ConnectionState;
  media: MediaStatus;
  volume: number;
  setVolume: (volume: number) => void;
  sendCommand: (command: string, extra?: Record<string, unknown>) => void;
  host: string;
  setHost: (host: string) => void;
}

export function useTelemetry(): UseTelemetryReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("offline");
  const [media, setMedia] = useState<MediaStatus>(defaultMedia);
  const [volume, setVolumeState] = useState(50);
  const [host, setHostState] = useState(readHost);

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  // Stable callback to push commands over the open socket.
  const sendCommand = useCallback(
    (command: string, extra?: Record<string, unknown>) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command, ...extra }));
      }
    },
    [],
  );

  // Control volume with immediate optimistic UI update.
  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(Math.round(val), 100));
    setVolumeState(clamped);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: "set_volume", value: clamped }));
    }
  }, []);

  // Persist + state-update for host.
  const setHost = useCallback((next: string) => {
    writeHost(next);
    setHostState(next);
  }, []);

  // --- WebSocket lifecycle effect (re-runs when host changes) ---
  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      setConnectionState("reconnecting");

      let targetHost = host.trim();
      if (!targetHost.includes(":")) {
        targetHost = `${targetHost}:8000`;
      }

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${targetHost}/ws`;

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        backoffRef.current = INITIAL_BACKOFF_MS;
        setConnectionState("connected");
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data as string);
        } catch {
          return; // ignore malformed frames
        }

        // ---- Command-response frames (carry `ok` field) ----
        if ("ok" in data) {
          if (!data.ok) {
            console.warn("[desk-gadget] command failed:", data.error, data);
          }
          return;
        }

        // ---- Telemetry frames ----
        if (!("ts" in data)) return;
        const td = data as unknown as TelemetryData;

        // high-frequency store update
        metricsEmit({
          cpu_percent: td.cpu_percent,
          mem_percent: td.mem_percent,
          net_send_mbps: td.net_send_mbps,
          net_recv_mbps: td.net_recv_mbps,
          disk_read_mbps: td.disk_read_mbps,
          disk_write_mbps: td.disk_write_mbps,
          cpu_temp_c: td.cpu_temp_c,
          fan_rpm: td.fan_rpm,
        });

        // low-frequency React state (only if changed)
        const rawArt = td.media.art_url || "";
        const resolvedArt =
          rawArt.startsWith("/") ? `http://${host}${rawArt}` : rawArt;
        const nextMedia: MediaStatus = {
          ...td.media,
          art_url: resolvedArt,
        };

        setMedia((prev) => {
          if (
            prev.title === nextMedia.title &&
            prev.artist === nextMedia.artist &&
            prev.status === nextMedia.status &&
            prev.art_url === nextMedia.art_url
          ) {
            return prev; // same reference ⇒ no re-render
          }
          return nextMedia;
        });

        if (typeof td.volume === "number") {
          setVolumeState((prev) => (Math.abs(prev - td.volume) > 1 ? td.volume : prev));
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        wsRef.current = null;
        setConnectionState("reconnecting");
        scheduleReconnect();
      };

      ws.onerror = () => {
        // `onclose` fires automatically after `onerror`.
        ws.close();
      };
    }

    function scheduleReconnect() {
      if (!mountedRef.current) return;
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);
      timerRef.current = setTimeout(connect, delay);
    }

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnectionState("offline");
    };
  }, [host]);

  return { connectionState, media, volume, setVolume, sendCommand, host, setHost };
}
