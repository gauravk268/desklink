/** Reading from a single fan sensor. */
export interface FanReading {
  label: string;
  rpm: number;
}

/** MPRIS2 media player status. */
export interface MediaStatus {
  title: string;
  artist: string;
  status: string;
  art_url?: string;
}

/** Complete telemetry payload as sent by the Flask backend. */
export interface TelemetryData {
  ts: number;
  cpu_percent: number;
  mem_percent: number;
  net_send_mbps: number;
  net_recv_mbps: number;
  disk_read_mbps: number;
  disk_write_mbps: number;
  cpu_temp_c: number | null;
  fan_rpm: FanReading[];
  media: MediaStatus;
  volume: number;
}

/** High-frequency numeric metrics extracted from TelemetryData. */
export interface MetricsData {
  cpu_percent: number;
  mem_percent: number;
  net_send_mbps: number;
  net_recv_mbps: number;
  disk_read_mbps: number;
  disk_write_mbps: number;
  cpu_temp_c: number | null;
  fan_rpm: FanReading[];
}

/** WebSocket connection lifecycle states. */
export type ConnectionState = "connected" | "reconnecting" | "offline";
