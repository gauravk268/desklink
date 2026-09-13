"""Telemetry collector — gathers system metrics into a single dict.

All sensor reads are wrapped in try/except so absent hardware
(e.g. desktops without fan headers) returns safe defaults.
"""

from __future__ import annotations

import glob
import hashlib
import json
import logging
import re
import subprocess
import time
from pathlib import Path
from typing import Any

import psutil

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Bytes → megabytes helper
# ---------------------------------------------------------------------------
_MB = 1 << 20  # 1 MiB


def _bytes_to_mb(b: float) -> float:
    return round(b / _MB, 2)


class Collector:
    """Collects system telemetry with safe fallbacks."""

    def __init__(self) -> None:
        # Prime the non-blocking CPU percent counter so the first real
        # call returns a meaningful value.
        psutil.cpu_percent(interval=None)

        # Seed delta counters
        self._prev_net = psutil.net_io_counters()
        self._prev_disk = psutil.disk_io_counters()
        self._prev_time: float = time.monotonic()

        self._current_art: str = ""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_current_art_url(self) -> str:
        """Return the raw art URL/path for the currently playing track."""
        return self._current_art

    def snapshot(self) -> dict[str, Any]:
        """Return the full telemetry payload as a JSON-serialisable dict."""
        now = time.monotonic()
        dt = max(now - self._prev_time, 1e-6)  # guard against zero

        payload: dict[str, Any] = {
            "ts": time.time(),
            "cpu_percent": self._cpu(),
            "mem_percent": self._mem(),
            **self._net_throughput(dt),
            **self._disk_throughput(dt),
            "cpu_temp_c": self._cpu_temp(),
            "fan_rpm": self._fan_speeds(),
            "media": self._media_status(),
            "volume": self._get_volume(),
        }

        self._prev_time = now
        return payload

    # ------------------------------------------------------------------
    # CPU & Memory
    # ------------------------------------------------------------------

    @staticmethod
    def _cpu() -> float:
        return psutil.cpu_percent(interval=None)

    @staticmethod
    def _mem() -> float:
        return psutil.virtual_memory().percent

    # ------------------------------------------------------------------
    # Network throughput (delta)
    # ------------------------------------------------------------------

    def _net_throughput(self, dt: float) -> dict[str, float]:
        try:
            cur = psutil.net_io_counters()
            sent = _bytes_to_mb((cur.bytes_sent - self._prev_net.bytes_sent) / dt)
            recv = _bytes_to_mb((cur.bytes_recv - self._prev_net.bytes_recv) / dt)
            self._prev_net = cur
            return {"net_send_mbps": sent, "net_recv_mbps": recv}
        except Exception:
            log.debug("net_io_counters unavailable", exc_info=True)
            return {"net_send_mbps": 0.0, "net_recv_mbps": 0.0}

    # ------------------------------------------------------------------
    # Disk I/O throughput (delta)
    # ------------------------------------------------------------------

    def _disk_throughput(self, dt: float) -> dict[str, float]:
        try:
            cur = psutil.disk_io_counters()
            if cur is None:
                return {"disk_read_mbps": 0.0, "disk_write_mbps": 0.0}
            read = _bytes_to_mb((cur.read_bytes - self._prev_disk.read_bytes) / dt)
            write = _bytes_to_mb((cur.write_bytes - self._prev_disk.write_bytes) / dt)
            self._prev_disk = cur
            return {"disk_read_mbps": read, "disk_write_mbps": write}
        except Exception:
            log.debug("disk_io_counters unavailable", exc_info=True)
            return {"disk_read_mbps": 0.0, "disk_write_mbps": 0.0}

    # ------------------------------------------------------------------
    # CPU temperature
    # ------------------------------------------------------------------

    @staticmethod
    def _cpu_temp() -> float | None:
        """Return CPU package temp in °C or None if unavailable."""
        # Attempt 1: psutil
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                for key in ("coretemp", "k10temp"):
                    if key in temps and temps[key]:
                        return temps[key][0].current
                # Fall through to first available sensor
                first_key = next(iter(temps))
                if temps[first_key]:
                    return temps[first_key][0].current
        except Exception:
            log.debug("sensors_temperatures() failed", exc_info=True)

        # Attempt 2: sysfs hwmon fallback
        try:
            for path in sorted(glob.glob("/sys/class/hwmon/hwmon*/temp*_input")):
                raw = Path(path).read_text().strip()
                if raw:
                    # sysfs reports millidegrees Celsius
                    return round(int(raw) / 1000.0, 1)
        except Exception:
            log.debug("hwmon temp fallback failed", exc_info=True)

        return None

    # ------------------------------------------------------------------
    # Fan speeds
    # ------------------------------------------------------------------

    @staticmethod
    def _fan_speeds() -> list[dict[str, Any]]:
        """Return a list of ``{"label": …, "rpm": …}`` dicts."""
        # Attempt 1: psutil
        try:
            fans = psutil.sensors_fans()
            if fans:
                result: list[dict[str, Any]] = []
                for _chip, entries in fans.items():
                    for entry in entries:
                        result.append({"label": entry.label or "fan", "rpm": entry.current})
                if result:
                    return result
        except Exception:
            log.debug("sensors_fans() failed", exc_info=True)

        # Attempt 2: sysfs hwmon fallback
        try:
            result = []
            for path in sorted(glob.glob("/sys/class/hwmon/hwmon*/fan*_input")):
                raw = Path(path).read_text().strip()
                if raw:
                    result.append({"label": Path(path).stem, "rpm": int(raw)})
            if result:
                return result
        except Exception:
            log.debug("hwmon fan fallback failed", exc_info=True)

        return []

    # ------------------------------------------------------------------
    # Media status (MPRIS2 via playerctl)
    # ------------------------------------------------------------------

    def _media_status(self) -> dict[str, str]:
        fallback = {"title": "", "artist": "", "status": "Stopped", "art_url": ""}
        try:
            proc = subprocess.run(
                [
                    "playerctl",
                    "metadata",
                    "--format",
                    "{{status}}\t{{artist}}\t{{title}}\t{{mpris:artUrl}}",
                ],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if proc.returncode == 0 and proc.stdout.strip():
                line = proc.stdout.strip().splitlines()[0]
                parts = line.split("\t")
                status = parts[0].strip() if len(parts) > 0 and parts[0].strip() else "Stopped"
                artist = parts[1].strip() if len(parts) > 1 else ""
                title = parts[2].strip() if len(parts) > 2 else ""
                raw_art = parts[3].strip() if len(parts) > 3 else ""

                self._current_art = raw_art
                art_url = ""
                if raw_art.startswith("http://") or raw_art.startswith("https://"):
                    art_url = raw_art
                elif raw_art:
                    # Stable hash so browser caches and does not blink every second
                    art_hash = hashlib.md5(f"{raw_art}:{title}:{artist}".encode("utf-8")).hexdigest()[:10]
                    art_url = f"/api/art?v={art_hash}"

                return {
                    "title": title,
                    "artist": artist,
                    "status": status,
                    "art_url": art_url,
                }
            else:
                self._current_art = ""
                # Fallback check if a player is at least running / paused
                st = subprocess.run(
                    ["playerctl", "status"],
                    capture_output=True,
                    text=True,
                    timeout=1,
                )
                if st.returncode == 0 and st.stdout.strip():
                    return {
                        "title": "Active Playback",
                        "artist": "",
                        "status": st.stdout.strip().splitlines()[0],
                        "art_url": "",
                    }
        except FileNotFoundError:
            log.debug("playerctl not installed")
        except subprocess.TimeoutExpired:
            log.debug("playerctl timed out")
        except Exception:
            log.debug("playerctl output parse error", exc_info=True)

        self._current_art = ""
        return fallback

    # ------------------------------------------------------------------
    # Audio Volume
    # ------------------------------------------------------------------

    @staticmethod
    def _get_volume() -> int:
        """Return system output volume level (0-100)."""
        try:
            res = subprocess.run(
                ["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"],
                capture_output=True,
                text=True,
                timeout=1,
            )
            if res.returncode == 0:
                m = re.search(r"Volume:\s*([0-9.]+)", res.stdout)
                if m:
                    return int(round(float(m.group(1)) * 100))
        except Exception:
            pass

        try:
            res = subprocess.run(
                ["pactl", "get-sink-volume", "@DEFAULT_SINK@"],
                capture_output=True,
                text=True,
                timeout=1,
            )
            if res.returncode == 0:
                m = re.search(r"(\d+)%", res.stdout)
                if m:
                    return int(m.group(1))
        except Exception:
            pass

        return 50
