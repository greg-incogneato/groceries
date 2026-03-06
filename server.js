const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'reflections.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- File I/O ---

function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeStore(entries) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

// --- API Routes ---

// GET all entries, newest-first
app.get('/api/reflections', (req, res) => {
  const entries = readStore();
  entries.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  res.json(entries);
});

// GET single entry
app.get('/api/reflections/:id', (req, res) => {
  const entries = readStore();
  const entry = entries.find(e => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

// POST create entry
app.post('/api/reflections', (req, res) => {
  const { weekStart, wentWell = '', blocked = '', differently = '', proud = '', nextWeekFocus = '' } = req.body;
  if (!weekStart) return res.status(400).json({ error: 'weekStart is required' });

  const entries = readStore();
  const existing = entries.find(e => e.weekStart === weekStart);
  if (existing) {
    return res.status(409).json({ error: 'Entry for this week already exists', existingId: existing.id });
  }

  const now = new Date().toISOString();
  const entry = {
    id: Date.now().toString(),
    weekStart,
    createdAt: now,
    updatedAt: now,
    wentWell,
    blocked,
    differently,
    proud,
    nextWeekFocus,
  };

  entries.push(entry);
  writeStore(entries);
  res.status(201).json(entry);
});

// PUT update entry
app.put('/api/reflections/:id', (req, res) => {
  const entries = readStore();
  const idx = entries.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const allowed = ['wentWell', 'blocked', 'differently', 'proud', 'nextWeekFocus'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) entries[idx][field] = req.body[field];
  });
  entries[idx].updatedAt = new Date().toISOString();

  writeStore(entries);
  res.json(entries[idx]);
});

// DELETE entry
app.delete('/api/reflections/:id', (req, res) => {
  const entries = readStore();
  const idx = entries.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  entries.splice(idx, 1);
  writeStore(entries);
  res.status(204).send();
});

// QR code page (shows network URL as a QR code via a free API)
app.get('/qr', (req, res) => {
  const networkIp = getNetworkIp();
  const url = `http://${networkIp}:${PORT}`;
  res.send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Open on Phone</title>
<style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;
justify-content:center;min-height:100vh;margin:0;background:#f9f7f4;color:#2d2d2d;gap:1.5rem;}
img{border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.12);}
p{font-size:1.1rem;margin:0;}code{background:#e8e4df;padding:.2rem .5rem;border-radius:4px;}</style>
</head>
<body>
<h2>Open on Your Phone</h2>
<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}" width="220" height="220" alt="QR Code">
<p>Or type: <code>${url}</code></p>
<p style="font-size:.85rem;color:#888;">Both devices must be on the same WiFi network.</p>
</body></html>`);
});

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// --- Start ---

app.listen(PORT, '0.0.0.0', () => {
  const networkIp = getNetworkIp();
  console.log(`\nWeekly Reflection running:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${networkIp}:${PORT}  ← open on your phone`);
  console.log(`  QR code: http://localhost:${PORT}/qr\n`);
});
