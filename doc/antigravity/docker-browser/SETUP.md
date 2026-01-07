# Complete Setup Guide: Docker Browser for Antigravity

This guide covers the full setup process for running a Docker-based Chrome browser with VNC for Antigravity IDE.

## Prerequisites

### 1. Docker Runtime

On macOS (Apple Silicon), we use **Colima** and the **Seleniarm** images.

```bash
# Install via Homebrew
brew install colima docker docker-compose

# Start Colima
colima start
```

### 2. Verify Docker is Running

```bash
docker info
```

---

## Step 1: Start Chrome Container (Robust Method)

**The Problem:** Chromium on Linux often forces the remote debugging port (9222) to bind to `127.0.0.1` inside the container for security, ignoring requests to bind to `0.0.0.0`. This makes it unreachable from the host.

**The Solution:** We run a `socat` proxy inside the container that listens on `0.0.0.0:9223` and forwards traffic to the internal `127.0.0.1:9222`.

### 1. Run the Container

Note we map host port **9222** to container port **9223**.

```bash
docker run -d --name chrome-vnc \
  -p 9222:9223 \
  -p 7900:7900 \
  --shm-size=2g \
  -e SE_VNC_NO_PASSWORD=1 \
  --user root \
  seleniarm/standalone-chromium:latest
```

**Ports Explained:**
| Host Port | Cont. Port | Service | Description |
|-----------|------------|---------|-------------|
| 9222 | 9223 | socat proxy | Forwards to internal Chrome CDP |
| 7900 | 7900 | noVNC | Visual browser interface |

### 2. Install Proxy Tools

The image is minimal, so we install `socat`.

```bash
docker exec chrome-vnc bash -c "apt-get update -qq && apt-get install -y -qq socat"
```

### 3. Start Chrome & Proxy

We manually start Chromium pointing to the X11 display, then start the proxy.

```bash
# Start Chromium
docker exec chrome-vnc bash -c "DISPLAY=:99 chromium --no-sandbox --disable-gpu --remote-debugging-port=9222 --disable-dev-shm-usage &"

# Wait a moment for Chrome to optimize
sleep 5

# Start socat proxy (9223 -> 9222)
docker exec -d chrome-vnc socat TCP-LISTEN:9223,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9222
```

---

## Step 2: Verify Chrome is Accessible

**Critical Step**: Ensure you receive a JSON response.

```bash
curl http://localhost:9222/json/version
```

Expected output:
```json
{
  "Browser": "Chrome/...",
  "webSocketDebuggerUrl": "ws://localhost:9222/devtools/browser/..."
}
```

If this hangs or fails with "Empty reply", the `socat` proxy is likely not running. See Troubleshooting.

---

## Step 3: Configure Antigravity MCP

Edit `~/.gemini/antigravity/mcp_config.json`. Since we mapped host `9222`, the config remains standard:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--browser-url=http://127.0.0.1:9222"
      ],
      "env": {}
    }
  }
}
```

**Restart Antigravity** after saving.

---

## Step 4: Access VNC Interface

Open in any browser: **http://localhost:7900**

1. Click "Connect"
2. You'll see the Chromium desktop
3. Use this to visually monitor what the browser is doing.

---

## Container Management

### Stop/Start

If you stop the container, the `socat` process will die. When restarting, you often need to restart the proxy.

```bash
docker start chrome-vnc
# Re-run proxy
docker exec -d chrome-vnc socat TCP-LISTEN:9223,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9222
```

### Full Reset

If in doubt, destroy and recreate:

```bash
docker stop chrome-vnc && docker rm chrome-vnc
# Then repeat Step 1 (Run, Install, Start)
```

---

## Troubleshooting

### "Empty reply from server" or Connection Refused
The `socat` proxy is likely down.

**Check:**
```bash
docker exec chrome-vnc ps aux | grep socat
```

**Fix:**
```bash
docker exec -d chrome-vnc socat TCP-LISTEN:9223,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9222
```

### Docker "connection refused"
Colima isn't running.
```bash
colima start
```

### VNC works but MCP fails
Port mapping is wrong or Chrome isn't listening on 9222 internally.
1. Check internal Chrome: `docker exec chrome-vnc curl localhost:9222/json/version`
2. Check internal Proxy: `docker exec chrome-vnc curl localhost:9223/json/version`
3. Check host: `curl localhost:9222/json/version`
