# Agent Instructions: Using Docker Chrome Browser

This document provides instructions for AI agents (like Antigravity's Gemini agent) on how to use the Docker-based Chrome browser.

---

## Prerequisites Check

Before using browser features, verify the Docker browser is running correctly:

```bash
# 1. Check if container is running
docker ps --filter name=chrome-vnc

# 2. Verify CDP endpoint is accessible AND returns valid JSON
# (Crucial: Just connecting isn't enough, must get JSON back)
curl -s http://localhost:9222/json/version | grep "Browser"
```

**If `curl` fails or hangs:**
The sidecar proxy likely died or isn't running. Do NOT just restart the container. Run the "Proxy Fix" command below.

---

## How the Setup Works

1. **Host Port 9222** ➔ **Container Port 9223** (socat proxy)
2. **Container Port 9223** ➔ **Internal Port 9222** (Chrome CDP)
3. **Host Port 7900** ➔ **Internal Port 7900** (noVNC)

We use `socat` because Chromium binds strictly to 127.0.0.1 on Linux, making it unreachable directly.

---

## Troubleshooting for Agents

### Setup Script (The "Fix-All")

If you detect issues (connection refused, empty reply), run this entire block to reset the proxy and browser state:

```bash
# Start container (if stopped)
docker start chrome-vnc

# Start Chrome (if not running)
docker exec chrome-vnc bash -c "pgrep chromium || (DISPLAY=:99 chromium --no-sandbox --disable-gpu --remote-debugging-port=9222 --disable-dev-shm-usage &)"

# Restart Proxy
docker exec chrome-vnc pkill socat
docker exec -d chrome-vnc socat TCP-LISTEN:9223,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9222

# Verify
sleep 2 && curl -s http://localhost:9222/json/version
```

### Full Rebuild (Last Resort)

If the container is broken (e.g., missing `socat` or permissions), rebuild it:

```bash
docker stop chrome-vnc && docker rm chrome-vnc
docker run -d --name chrome-vnc -p 9222:9223 -p 7900:7900 --shm-size=2g -e SE_VNC_NO_PASSWORD=1 --user root seleniarm/standalone-chromium:latest
sleep 5
docker exec chrome-vnc bash -c "apt-get update -qq && apt-get install -y -qq socat"
docker exec chrome-vnc bash -c "DISPLAY=:99 chromium --no-sandbox --disable-gpu --remote-debugging-port=9222 --disable-dev-shm-usage &"
sleep 5
docker exec -d chrome-vnc socat TCP-LISTEN:9223,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9222
```

---

## Visual Debugging

To see what the browser is doing:

1. Open http://localhost:7900 in a browser
2. Click "Connect"
3. Watch the Chromium desktop in real-time

This is useful for debugging complex interactions or verifying visual layout.
