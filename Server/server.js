const express = require('express');
const path = require('path');
const db = require('./db');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: true }));

// rate limit untuk mencegah scraping
const limiter = rateLimit({ windowMs: 60*1000, max: 60 });
app.use(limiter);

// serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// helper: normalisasi phone (sederhana)
function normalizePhone(input){
  if(!input) return '';
  let s = input.trim();
  s = s.replace(/[^
\d+]/g,'');
  // jika mulai 0 -> ubah ke +62 (opsional, kamu bisa ubah sesuai kebutuhan)
  if(s.startsWith('0')) s = '+62' + s.slice(1);
  return s;
}

// GET tags
app.get('/api/tags', (req, res) => {
  try{
    const raw = req.query.phone || '';
    const phone = normalizePhone(raw);
    if(!phone) return res.status(400).json({ error: 'phone required' });

    const stmt = db.prepare('SELECT id, tag, created_at, report_count FROM tags WHERE phone = ? ORDER BY created_at DESC');
    const rows = stmt.all(phone);
    res.json({ phone, tags: rows });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST add tag
app.post('/api/tags', (req, res) => {
  try{
    const phone = normalizePhone(req.body.phone || '');
    const tag = (req.body.tag || '').trim();
    if(!phone || !tag) return res.status(400).json({ error: 'phone and tag required' });

    // basic rate-limit by IP could be added; for demo we just insert
    const insert = db.prepare('INSERT INTO tags (phone, tag) VALUES (?, ?)');
    const info = insert.run(phone, tag);
    res.json({ ok: true, id: info.lastInsertRowid });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST report tag
app.post('/api/report', (req, res) => {
  try{
    const id = Number(req.body.id);
    if(!id) return res.status(400).json({ error: 'id required' });
    const upd = db.prepare('UPDATE tags SET report_count = report_count + 1 WHERE id = ?');
    const info = upd.run(id);
    if(info.changes === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
