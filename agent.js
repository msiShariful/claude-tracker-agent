import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH     = new URL('./config.json', import.meta.url).pathname;
const STATE_PATH      = new URL('./.last-sync-state.json', import.meta.url).pathname;
const USAGE_DB_PATH   = path.join(os.homedir(), '.claude', 'usage.db');
const BATCH_LIMIT     = 500;

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('config.json not found. Copy config.example.json and fill in your values.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { last_rowid: 0 };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function detectColumns(db) {
  const rows = db.prepare('PRAGMA table_info(turns)').all();
  return rows.map(r => r.name);
}

function buildSelect(cols) {
  const known = [
    'rowid', 'session_id', 'model',
    'input_tokens', 'output_tokens',
    'cache_creation_input_tokens', 'cache_read_input_tokens',
    'recorded_at',
  ];
  const selected = known.filter(c => c === 'rowid' || cols.includes(c));
  return selected.join(', ');
}

async function sync() {
  const config = loadConfig();
  const state  = loadState();

  if (!fs.existsSync(USAGE_DB_PATH)) {
    console.log(`[${new Date().toISOString()}] usage.db not found at ${USAGE_DB_PATH} — skipping`);
    return;
  }

  const db   = new Database(USAGE_DB_PATH, { readonly: true });
  const cols = detectColumns(db);
  console.log(`[${new Date().toISOString()}] Detected columns: ${cols.join(', ')}`);

  const select = buildSelect(cols);
  const rows   = db.prepare(
    `SELECT ${select} FROM turns WHERE rowid > ? ORDER BY rowid ASC LIMIT ?`
  ).all(state.last_rowid, BATCH_LIMIT);

  db.close();

  if (rows.length === 0) {
    console.log(`[${new Date().toISOString()}] No new rows — up to date`);
    return;
  }

  const turns = rows.map(r => ({
    id:                    String(r.rowid),
    session_id:            r.session_id ?? null,
    model:                 r.model ?? 'unknown',
    input_tokens:          r.input_tokens ?? 0,
    output_tokens:         r.output_tokens ?? 0,
    cache_creation_tokens: r.cache_creation_input_tokens ?? 0,
    cache_read_tokens:     r.cache_read_input_tokens ?? 0,
    recorded_at:           r.recorded_at ?? new Date().toISOString(),
  }));

  const res = await fetch(`${config.tracker_url}/api/track`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    config.api_key,
    },
    body: JSON.stringify({
      device_id:   config.device_id,
      device_name: config.device_name,
      hostname:    os.hostname(),
      platform:    os.platform(),
      turns,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[${new Date().toISOString()}] Sync failed: ${res.status} ${text}`);
    return;
  }

  const json = await res.json();
  const newRowid = rows[rows.length - 1].rowid;
  saveState({ last_rowid: newRowid });

  console.log(`[${new Date().toISOString()}] Synced ${json.inserted} new turns (rowid up to ${newRowid})`);
}

async function main() {
  const config = loadConfig();
  const intervalMs = (config.sync_interval_minutes ?? 5) * 60 * 1000;

  console.log(`Claude Tracker Agent starting — device: ${config.device_id}`);
  console.log(`Syncing to: ${config.tracker_url} every ${config.sync_interval_minutes ?? 5} min`);

  await sync();
  setInterval(sync, intervalMs);
}

main().catch(err => { console.error(err); process.exit(1); });
