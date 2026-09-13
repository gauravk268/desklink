"""System controller — executes commands received over the WebSocket.

Each handler returns a result dict ``{"ok": True/False, …}`` that is
sent back to the requesting client.
"""

from __future__ import annotations

import logging
import subprocess
from typing import Any

from collector import Collector

log = logging.getLogger(__name__)


class Controller:
    """Dispatches incoming command strings to the appropriate handler."""

    # Map of command name → method_name
    _COMMANDS: dict[str, str] = {
        "media_play_pause": "_media_play_pause",
        "media_next": "_media_next",
        "media_prev": "_media_prev",
        "set_volume": "_set_volume",
    }

    def __init__(self, collector: Collector) -> None:
        self._collector = collector

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def dispatch(self, command: str, **kwargs: Any) -> dict[str, Any]:
        """Route *command* to its handler and return the result dict."""
        method_name = self._COMMANDS.get(command)
        if method_name is None:
            return {"ok": False, "error": f"unknown command: {command!r}"}

        handler = getattr(self, method_name)
        try:
            if command == "set_volume":
                handler(kwargs.get("value"))
            else:
                handler()
            return {"ok": True, "command": command}
        except Exception as exc:
            log.exception("Command %r failed", command)
            return {"ok": False, "command": command, "error": str(exc)}

    # ------------------------------------------------------------------
    # Media controls
    # ------------------------------------------------------------------

    @staticmethod
    def _playerctl(*args: str) -> None:
        """Run a playerctl command.  Non-zero exit is normal (no player)."""
        result = subprocess.run(
            ["playerctl", *args],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            stderr = result.stderr.strip()
            log.warning("playerctl %s exited %d: %s", args, result.returncode, stderr)

    @staticmethod
    def _media_play_pause() -> None:
        Controller._playerctl("play-pause")

    @staticmethod
    def _media_next() -> None:
        Controller._playerctl("next")

    @staticmethod
    def _media_prev() -> None:
        Controller._playerctl("previous")

    # ------------------------------------------------------------------
    # Volume control
    # ------------------------------------------------------------------

    @staticmethod
    def _set_volume(value: Any = None) -> None:
        """Set output volume level (0-100)."""
        if value is None:
            return
        try:
            pct = float(value)
        except (ValueError, TypeError):
            return

        # Normalize to 0.0 - 1.5 range (1.0 = 100%)
        pct_float = min(max(pct / 100.0 if pct > 1.0 else pct, 0.0), 1.5)

        # 1. Try wpctl (PipeWire / WirePlumber default on modern Linux)
        try:
            res = subprocess.run(
                ["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", f"{pct_float:.2f}"],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if res.returncode == 0:
                return
        except Exception:
            pass

        # 2. Try pactl (PulseAudio fallback)
        try:
            pct_int = int(round(pct_float * 100))
            res = subprocess.run(
                ["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{pct_int}%"],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if res.returncode == 0:
                return
        except Exception:
            pass

        # 3. Try playerctl volume as secondary fallback
        try:
            subprocess.run(
                ["playerctl", "volume", f"{pct_float:.2f}"],
                capture_output=True,
                text=True,
                timeout=2,
            )
        except Exception:
            pass
