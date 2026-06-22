# Claude Tracker Agent

> Lightweight background daemon that syncs **Claude Code** token usage from your local `~/.claude/usage.db` to a [Claude Tracker](https://github.com/msiShariful/claude-tracker) server.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-read--only-003B57?logo=sqlite&logoColor=white)
![PM2](https://img.shields.io/badge/daemon-PM2-2B037A)
![License](https://img.shields.io/badge/License-MIT-yellow)

This is the **collector** half of the Claude Tracker project. It runs on each machine where you use Claude Code, reads the local usage database, and forwards new token-usage records to your central [claude-tracker](https://github.com/msiShariful/claude-tracker) dashboard. Run it on as many devices as you like — each reports in with its own `device_id`.

## Features

- 📊 **Incremental sync** — tracks the last synced `rowid` in `.last-sync-state.json` and only sends new rows, never re-sending old data.
- 🔍 **Schema-aware** — detects available columns at runtime via `PRAGMA table_info(turns)`, so it adapts to changes in Claude Code's `usage.db`.
- 📦 **Batched** — sends up to 500 turns per request to `/api/track`.
- 🔒 **Read-only** — opens `usage.db` in read-only mode; never writes to or locks your Claude Code data.
- ⏱️ **Scheduled** — re-syncs every `sync_interval_minutes` (default 5).
- 🚀 **Daemonizable** — one command to run it under PM2 with auto-start on reboot.

## How It Works

1. Opens `~/.claude/usage.db` in read-only mode.
2. Runs `PRAGMA table_info(turns)` to detect available columns dynamically.
3. Fetches only new rows (`rowid > last_rowid`) — never re-sends old data.
4. POSTs up to 500 turns at a time to `<tracker_url>/api/track` with your API key in the `x-api-key` header.
5. Saves the new `last_rowid` to `.last-sync-state.json`.
6. Repeats every `sync_interval_minutes`.

## Prerequisites

- **Node.js 18+**
- **Claude Code** installed locally (so `~/.claude/usage.db` exists)
- A running **[Claude Tracker](https://github.com/msiShariful/claude-tracker)** server and its API key

## Installation

```bash
git clone https://github.com/msiShariful/claude-tracker-agent.git
cd claude-tracker-agent
npm install
cp config.example.json config.json
# Edit config.json — see Configuration below
```

## Configuration

Edit `config.json` (copied from `config.example.json`):

| Key | Description |
|-----|-------------|
| `tracker_url` | Base URL of your Claude Tracker server (use `https://`). |
| `api_key` | Shared secret; must match the server's `TRACKER_API_KEY`. |
| `device_id` | Stable unique identifier for this machine (e.g. `sharif-macbook-m4`). |
| `device_name` | Human-friendly display name shown on the dashboard. |
| `sync_interval_minutes` | How often to sync, in minutes (default `5`). |

> `config.json` is gitignored — keep your real API key out of version control. Only `config.example.json` (with placeholders) is committed.

## Usage

**Run once (test manually):**

```bash
node agent.js
# or
npm start
```

**Run as a daemon with PM2:**

```bash
npm run install-daemon   # pm2 start agent.js --name claude-tracker-agent
pm2 save
pm2 startup              # follow the printed command for auto-start on reboot
```

Useful PM2 commands: `pm2 logs claude-tracker-agent`, `pm2 restart claude-tracker-agent`, `pm2 stop claude-tracker-agent`.

## State File

The agent writes `.last-sync-state.json` (gitignored) to remember the last synced `rowid`. Delete it to force a full re-sync from the beginning.

## Security

This agent reads token-usage metadata only (model, token counts, timestamps) — not prompt or response content — and opens the database read-only. Keep `config.json` private and always sync over HTTPS. See [SECURITY.md](SECURITY.md) for the full policy and how to report vulnerabilities.

## Related

- 🖥️ **[claude-tracker](https://github.com/msiShariful/claude-tracker)** — the Next.js + SQLite dashboard server this agent reports to.

## Contributing

Issues and pull requests are welcome. Please open an issue to discuss substantial changes before submitting a PR.

## License

Released under the [MIT License](LICENSE).
