#!/usr/bin/env python3
"""Desk-Gadget server — Flask + WebSocket entry point.

Exposes ``ws://0.0.0.0:8000/ws`` for streaming telemetry and
accepting control commands from the Android companion app.
"""

from __future__ import annotations

import json
import logging
import time

import mimetypes
import os
import signal
import sys
from urllib.parse import unquote

from flask import Flask, redirect, send_file
from flask_sock import Sock
from simple_websocket import ConnectionClosed

from collector import Collector
from config import TELEMETRY_INTERVAL, WS_HOST, WS_PORT
from controller import Controller
from discovery import start_discovery_beacon, stop_discovery_beacon

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application setup
# ---------------------------------------------------------------------------
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../ui/dist"))
app = Flask(__name__, static_folder=DIST_DIR, static_url_path="")
sock = Sock(app)

collector = Collector()
controller = Controller(collector)


# ---------------------------------------------------------------------------
# Frontend static routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    """Serve the single-page application entry point."""
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_path):
        return send_file(index_path)
    return "Desk Gadget Server Running. Frontend not yet built.", 200


# ---------------------------------------------------------------------------
# Album Art endpoint
# ---------------------------------------------------------------------------
@app.route("/api/art")
def media_art():
    """Serve the album art image of the current playing track."""
    raw_art = collector.get_current_art_url()
    if not raw_art:
        return "", 404

    if raw_art.startswith("file://"):
        file_path = unquote(raw_art[7:])
        if os.path.isfile(file_path):
            mime_type = mimetypes.guess_type(file_path)[0] or "image/png"
            response = send_file(file_path, mimetype=mime_type)
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Cache-Control"] = "no-cache, max-age=0"
            return response
    elif os.path.isfile(raw_art):
        mime_type = mimetypes.guess_type(raw_art)[0] or "image/png"
        response = send_file(raw_art, mimetype=mime_type)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Cache-Control"] = "no-cache, max-age=0"
        return response
    elif raw_art.startswith("http://") or raw_art.startswith("https://"):
        return redirect(raw_art)

    return "", 404


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------
@sock.route("/ws")
def ws_handler(ws):  # noqa: ANN001, ANN201 — flask-sock signature
    """Handle a single WebSocket client.

    Uses a tight loop that:
    1. Attempts a non-blocking receive (``timeout`` ≈ 50 ms) to pick
       up any incoming command messages.
    2. Checks whether 1 s has elapsed; if so, sends a telemetry snapshot.

    This avoids spawning a second thread per client while keeping the
    connection responsive to both directions.
    """
    log.info("Client connected: %s", ws.environ.get("REMOTE_ADDR", "?"))
    next_send = time.monotonic()

    try:
        while True:
            # --- Receive phase (non-blocking) ---
            try:
                raw = ws.receive(timeout=0.05)
            except ConnectionClosed:
                break

            if raw is not None:
                _handle_command(ws, raw)

            # --- Send phase ---
            now = time.monotonic()
            if now >= next_send:
                payload = collector.snapshot()
                ws.send(json.dumps(payload))
                next_send = now + TELEMETRY_INTERVAL

    except ConnectionClosed:
        pass
    except Exception:
        log.exception("Unexpected error in WebSocket handler")
    finally:
        log.info("Client disconnected: %s", ws.environ.get("REMOTE_ADDR", "?"))


def _handle_command(ws, raw: str) -> None:  # noqa: ANN001
    """Parse and dispatch a command message, then send back the result."""
    try:
        msg = json.loads(raw)
        command = msg.get("command", "")
        value = msg.get("value", msg.get("volume"))
    except (json.JSONDecodeError, AttributeError):
        ws.send(json.dumps({"ok": False, "error": "invalid JSON"}))
        return

    log.info("Command received: %s (value=%s)", command, value)
    result = controller.dispatch(command, value=value)
    log.info("Command result: %s", result)
    ws.send(json.dumps(result))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    def _shutdown_handler(signum, frame):  # noqa: ANN001
        log.info("Received signal %d, shutting down cleanly...", signum)
        stop_discovery_beacon()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown_handler)
    signal.signal(signal.SIGTERM, _shutdown_handler)

    start_discovery_beacon()
    log.info("Starting desklink server on %s:%d", WS_HOST, WS_PORT)
    try:
        app.run(host=WS_HOST, port=WS_PORT)
    except (KeyboardInterrupt, SystemExit):
        stop_discovery_beacon()
        log.info("Server terminated.")
