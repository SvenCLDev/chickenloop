# Docker Browser Setup for Antigravity IDE

This directory contains documentation for running a Docker-based Chrome browser with VNC support for Antigravity IDE.

## Overview

Antigravity IDE can use a remote Chrome browser running in Docker via the Chrome DevTools Protocol (CDP). This setup provides:

- **Headless Chrome** for automated testing and agent browser tasks
- **VNC/noVNC interface** for visual debugging and monitoring
- **Isolated browser environment** that doesn't interfere with your local Chrome

## Architecture

```
┌─────────────────────────┐      ┌──────────────────────────────┐
│   Antigravity IDE       │      │   Docker Container           │
│                         │      │   (seleniarm/chromium)       │
│  ┌───────────────────┐  │      │                              │
│  │ Chrome DevTools   │◄─┼──CDP─┼──► Port 9222: Chrome CDP     │
│  │ MCP Server        │  │      │                              │
│  └───────────────────┘  │      │   Port 7900: noVNC (web)     │
│                         │      │   Port 5900: VNC (client)    │
└─────────────────────────┘      └──────────────────────────────┘
```

## Quick Start

```bash
# 1. Start Docker runtime (Colima on macOS)
colima start

# 2. Start Chrome with VNC
docker run -d --name chrome-vnc \
  -p 9222:9222 \
  -p 7900:7900 \
  --shm-size=2g \
  -e SE_VNC_NO_PASSWORD=1 \
  seleniarm/standalone-chromium:latest

# 3. Access noVNC at http://localhost:7900
```

## Files in This Directory

| File | Purpose |
|------|---------|
| [SETUP.md](./SETUP.md) | Complete setup instructions |
| [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) | Instructions for AI agents |
| [QUICKSTART.md](./QUICKSTART.md) | Quick reference commands |

## Requirements

- Docker (via Colima, Docker Desktop, or OrbStack)
- Node.js v20.19+ (for chrome-devtools-mcp)
- Antigravity IDE

## MCP Configuration

Add this to `~/.gemini/antigravity/mcp_config.json`:

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
