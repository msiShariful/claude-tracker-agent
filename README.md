# Claude Tracker Agent

Lightweight background agent that reads Claude Code's local `~/.claude/usage.db` and syncs new turns to your claude-tracker server.

## Setup

```bash
npm install
cp config.example.json config.json
# Edit config.json — set tracker_url, api_key, device_id, device_name
node agent.js   # test manually
```

## Run as daemon

```bash
npm run install-daemon
pm2 save
pm2 startup   # follow the printed command for auto-start on reboot
```

## How it works

1. Opens `~/.claude/usage.db` in read-only mode
2. Runs `PRAGMA table_info(turns)` to detect available columns dynamically
3. Fetches only new rows (`rowid > last_rowid`) — never re-sends old data
4. POSTs up to 500 turns at a time to `/api/track` with your API key
5. Saves the new `last_rowid` to `.last-sync-state.json`
6. Repeats every `sync_interval_minutes`
