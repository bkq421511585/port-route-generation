import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let cache = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadDb() {
  ensureDir();
  if (cache) return cache;
  if (!fs.existsSync(DB_FILE)) {
    cache = { ports: [], itineraries: [], seq: 1 };
    saveDb();
    return cache;
  }
  try {
    cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    cache = { ports: [], itineraries: [], seq: 1 };
  }
  cache.ports ??= [];
  cache.itineraries ??= [];
  cache.seq ??= 1;
  return cache;
}

export function saveDb() {
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function nextId() {
  const db = loadDb();
  return db.seq++;
}
