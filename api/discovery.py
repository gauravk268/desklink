"""UDP auto-discovery beacon for the desk-gadget server.

An Android client broadcasts ``WHO_IS_DESK_SERVER`` on UDP port 9999;
this module replies with a JSON payload containing the server name and
WebSocket port so the client can auto-connect.
"""

from __future__ import annotations

import json
import logging
import socket
import threading

from config import DISCOVERY_MAGIC, SERVER_NAME, UDP_HOST, UDP_PORT, WS_PORT

log = logging.getLogger(__name__)

# Module-level shutdown event so the beacon thread can be stopped cleanly.
_shutdown = threading.Event()


def _beacon_loop() -> None:
    """Blocking loop — runs inside a daemon thread."""
    response = json.dumps({"server": SERVER_NAME, "ws_port": WS_PORT}).encode("utf-8")

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.settimeout(2.0)  # allow periodic shutdown-flag checks
    sock.bind((UDP_HOST, UDP_PORT))

    log.info("Discovery beacon listening on UDP %s:%d", UDP_HOST, UDP_PORT)

    while not _shutdown.is_set():
        try:
            data, addr = sock.recvfrom(1024)
        except socket.timeout:
            continue
        except OSError:
            if _shutdown.is_set():
                break
            log.exception("UDP recv error")
            continue

        message = data.decode("utf-8", errors="replace").strip()
        if message == DISCOVERY_MAGIC:
            log.info("Discovery request from %s:%d", *addr)
            try:
                sock.sendto(response, addr)
            except OSError:
                log.exception("Failed to send discovery response to %s:%d", *addr)

    sock.close()
    log.info("Discovery beacon stopped")


def start_discovery_beacon() -> threading.Thread:
    """Spawn the discovery beacon as a daemon thread and return it."""
    thread = threading.Thread(target=_beacon_loop, name="udp-discovery", daemon=True)
    thread.start()
    return thread


def stop_discovery_beacon() -> None:
    """Signal the beacon thread to shut down."""
    _shutdown.set()
