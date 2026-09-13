# DeskLink: Fedora Telemetry & Control Kiosk (Daemon)

Please refer to the main repository documentation at [../README.md](../README.md) for full architecture diagrams, frontend build steps, and tablet/Ubuntu setup guides.

## Quick Start (Backend)

### 1. Install Dependencies
- **Fedora**: `sudo dnf install -y python3 python3-pip playerctl`
- **Ubuntu / Debian**: `sudo apt update && sudo apt install -y python3 python3-pip python3-venv playerctl pulseaudio-utils`
- **Arch**: `sudo pacman -S python python-pip playerctl`

```bash
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run

#### Unified Server (API + Built Frontend)
```bash
.venv/bin/python3 app.py
```
Serves the unified telemetry WebSocket, album art proxy, UDP auto-discovery beacon, and the built React frontend at `http://0.0.0.0:8000`.

#### Full Stack Dev Mode (Single Command with Concurrently)
```bash
cd ../desk-gadget-ui
npm run dev:all   # or: npm start
```
Spawns both the Python API daemon and Vite dev server (`--host`) together.

### 3. Autostart via systemd User Service
```bash
mkdir -p ~/.config/systemd/user
cp desk-gadget.service ~/.config/systemd/user/desklink.service
systemctl --user daemon-reload
systemctl --user enable --now desklink.service
```
