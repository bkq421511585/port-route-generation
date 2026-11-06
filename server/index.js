import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadDb, saveDb, nextId } from './db.js';
import { seedPorts, seedItineraries } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));

// ---------- helpers ----------
function cleanPort(body, id) {
  const p = {
    name: String(body.name || '').trim(),
    enName: String(body.enName || '').trim(),
    type: body.type === 'home' ? 'home' : 'visit',
    country: String(body.country || '').trim(),
    lat: Number(body.lat),
    lng: Number(body.lng),
    remark: String(body.remark || '').trim(),
    alias: Array.isArray(body.alias)
      ? body.alias.map((s) => String(s).trim()).filter(Boolean)
      : String(body.alias || '').split(/[,，、]/).map((s) => s.trim()).filter(Boolean),
  };
  if (id) p.id = id;
  return p;
}

// ---------- ports ----------
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/ports', (req, res) => {
  const db = loadDb();
  let list = db.ports;
  const kw = String(req.query.kw || '').trim().toLowerCase();
  const type = req.query.type;
  if (type) list = list.filter((p) => p.type === type);
  if (kw) {
    list = list.filter((p) =>
      [p.name, p.enName, p.country, p.remark, ...(p.alias || [])].some((f) =>
        String(f || '').toLowerCase().includes(kw)
      )
    );
  }
  res.json({ ports: list, total: list.length, all: db.ports.length });
});

app.post('/api/ports', (req, res) => {
  const db = loadDb();
  const p = cleanPort(req.body);
  if (!p.name) return res.status(400).json({ error: '港口名称不能为空' });
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
    return res.status(400).json({ error: '经度 / 纬度必须是数字' });
  }
  if (db.ports.some((x) => x.name === p.name)) {
    return res.status(400).json({ error: `港口「${p.name}」已存在` });
  }
  p.id = nextId();
  db.ports.push(p);
  saveDb();
  res.json({ port: p });
});

app.put('/api/ports/:id', (req, res) => {
  const db = loadDb();
  const id = Number(req.params.id);
  const idx = db.ports.findIndex((x) => x.id === id);
  if (idx < 0) return res.status(404).json({ error: '港口不存在' });
  const p = cleanPort(req.body, id);
  if (!p.name) return res.status(400).json({ error: '港口名称不能为空' });
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
    return res.status(400).json({ error: '经度 / 纬度必须是数字' });
  }
  if (db.ports.some((x) => x.id !== id && x.name === p.name)) {
    return res.status(400).json({ error: `港口「${p.name}」已存在` });
  }
  db.ports[idx] = p;
  saveDb();
  res.json({ port: p });
});

app.delete('/api/ports/:id', (req, res) => {
  const db = loadDb();
  const id = Number(req.params.id);
  const idx = db.ports.findIndex((x) => x.id === id);
  if (idx < 0) return res.status(404).json({ error: '港口不存在' });
  const [removed] = db.ports.splice(idx, 1);
  saveDb();
  res.json({ ok: true, name: removed.name });
});

// 恢复默认港口数据（母港优先）
app.post('/api/ports/reset', (req, res) => {
  const db = loadDb();
  db.ports = seedPorts.map((p, i) => ({ ...p, id: i + 1 }));
  db.seq = Math.max(db.seq, seedPorts.length + 1);
  saveDb();
  res.json({ ok: true, total: db.ports.length });
});

// ---------- itineraries ----------
app.get('/api/itineraries', (req, res) => {
  const db = loadDb();
  res.json({ itineraries: [...db.itineraries].reverse() });
});

app.post('/api/itineraries', (req, res) => {
  const db = loadDb();
  const name = String(req.body.name || '').trim();
  const code = String(req.body.code || '').trim();
  if (!code) return res.status(400).json({ error: '行程代码不能为空' });
  const it = { id: nextId(), name: name || code, code, createdAt: new Date().toISOString() };
  db.itineraries.push(it);
  saveDb();
  res.json({ itinerary: it });
});

app.delete('/api/itineraries/:id', (req, res) => {
  const db = loadDb();
  const id = Number(req.params.id);
  const idx = db.itineraries.findIndex((x) => x.id === id);
  if (idx < 0) return res.status(404).json({ error: '航线不存在' });
  db.itineraries.splice(idx, 1);
  saveDb();
  res.json({ ok: true });
});

// ---------- 首次启动自动写入默认数据（母港优先） ----------
{
  const db = loadDb();
  if (db.ports.length === 0) {
    db.ports = seedPorts.map((p, i) => ({ ...p, id: i + 1 }));
    db.seq = Math.max(db.seq, seedPorts.length + 1);
    saveDb();
    console.log(`[cruise-admin] 已写入默认港口数据 ${db.ports.length} 个（母港优先）`);
  }
  if (db.itineraries.length === 0) {
    db.itineraries = seedItineraries.map((it, i) => ({
      ...it,
      id: db.seq++,
      createdAt: new Date().toISOString(),
    }));
    saveDb();
    console.log(`[cruise-admin] 已写入默认示例航线 ${db.itineraries.length} 条`);
  }
}

// ---------- static (production build) ----------
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const PORT = process.env.PORT || 5175;
app.listen(PORT, () => {
  console.log(`[cruise-admin] API 服务已启动: http://localhost:${PORT}`);
});
