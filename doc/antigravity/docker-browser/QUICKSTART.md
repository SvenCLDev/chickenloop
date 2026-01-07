# Quick Reference: Docker Chrome for Antigravity

## Start Everything

```bash
# After reboot or fresh start
colima start
docker start chrome-vnc
# Ensure the proxy inside works (if it stopped)
docker exec -d chrome-vnc socat TCP-LISTEN:9223,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9222
```

## First Time Setup (The "Robust" Method)

This setup uses `socat` to forward the Chrome DevTools Protocol (CDP) from the internal `127.0.0.1` to `0.0.0.0`, allowing host access.

```bash
# 1. Start Docker runtime
colima start

# 2. Run Container (Note: Port 9222 mapped to 9223!)
docker run -d --name chrome-vnc \
  -p 9222:9223 \
  -p 7900:7900 \
  --shm-size=2g \
  -e SE_VNC_NO_PASSWORD=1 \
  --user root \
  seleniarm/standalone-chromium:latest

# 3. Install Socat (Takes ~30s)
docker exec chrome-vnc bash -c "apt-get update -qq && apt-get install -y -qq socat"

# 4. Start Chrome + Proxy
docker exec chrome-vnc bash -c "DISPLAY=:99 chromium --no-sandbox --disable-gpu --remote-debugging-port=9222 --disable-dev-shm-usage &"
sleep 5
docker exec -d chrome-vnc socat TCP-LISTEN:9223,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9222
```

## Check Status

```bash
# Check if container runs
docker ps --filter name=chrome-vnc

# Check CDP (Must return JSON)
curl http://localhost:9222/json/version
```

## View Browser (noVNC)

Open: **http://localhost:7900** → Click "Connect"

## Troubleshooting

```bash
# Connection Refused on 9222?
# The proxy might have died. Restart it:
docker exec -d chrome-vnc socat TCP-LISTEN:9223,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9222

# Docker not running?
colima start
```
