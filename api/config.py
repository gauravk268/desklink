"""Centralized configuration constants for the desk-gadget daemon."""

# WebSocket server
WS_HOST = "0.0.0.0"
WS_PORT = 8000

# UDP auto-discovery
UDP_HOST = "0.0.0.0"
UDP_PORT = 9999
DISCOVERY_MAGIC = "WHO_IS_DESK_SERVER"
SERVER_NAME = "fedora-desk"

# Telemetry
TELEMETRY_INTERVAL = 1.0  # seconds between broadcasts
