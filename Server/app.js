const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const multer = require('multer');
const helmet = require('helmet');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname,'tags.db');
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'adminpass';

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

db.prepare(`CREATE TABLE IF NOT EXISTS tags (
  phone TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (phone, tag)
)`).run();

const stmtGetTags = db.prepare('SELECT tag FROM tags WHERE phone = ? ORDER BY tag');
const stmtInsertTag = db.prepare('INSERT OR IGNORE INTO tags (phone, tag) VALUES (?, ?)');
const stmtDeleteTag = db.prepare('DELETE FROM tags WHERE phone = ? AND tag = ?');

const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());
app.use(express.static(path.join(__dirname,'public')));

// Basic Auth
app.use((req,res,next)=>{
  if(!req.path.startsWith('/api')) return next();
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Basic ')){
    res.setHeader('WWW-Authenticate','Basic realm="Internal Tags"');
    return res.status(401).json({error:'Authentication required'});
  }
  const token = Buffer.from(auth.split(' ')[1],'base64').toString();
  const password = token.split(':')[1] || '';
  if(password === BASIC_AUTH_PASSWORD) return next();
  res.setHeader('WWW-Authenticate','Basic realm="Internal Tags"');
  return res.status(403).json({error:'Forbidden'});
});

// --- API ---
// GET /api/tags?phone=...
app.get('/api/tags',(req,res)=>{
  const phone=(req.query.phone||'').trim();
  if(!phone) return res.status(400).json({error:'phone required'});
  const rows = stmtGetTags.all(phone).map(r=>r.tag);
  res.json({phone, tags: rows});
});

// POST /api/tags
app.post('/api/tags',(req,res)=>{
  const {phone, tag} = req.body;
  if(!phone || !tag) return res.status(400).json({error:'phone and tag required'});
  const info = stmtInsertTag.run(phone.trim(), tag.trim());
  res.json({phone, tag, created: info.changes>0});
});

// DELETE /api/tags
app.delete('/api/tags',(req,res)=>{
  const {phone, tag} = req.body;
  if(!phone || !tag) return res.status(400).json({error:'phone and tag required'});
  const info = stmtDeleteTag.run(phone.trim(), tag.trim());
  res.json({phone, tag, deleted: info.changes>0});
});

// Search
app.get('/api/search',(req,res)=>{
  const q = (req.query.q||'').trim().toLowerCase();
  if(!q) return res.status(400).json({error:'q required'});
  const rows = db.prepare('SELECT phone, tag FROM tags').all();
  const map = new Map();
  for(const r of rows){
    if(!map.has(r.phone)) map.set(r.phone,new Set());
    map.get(r.phone).add(r.tag);
  }
  const results=[];
  for(const [phone,tags] of map.entries()){
    const arr = Array.from(tags);
    const hay = (phone+' '+arr.join(' ')).toLowerCase();
    if(hay.includes(q)) results.push({phone, tags: arr});
  }
  res.json(results);
});

// CSV import
const upload = multer({storage: multer.memoryStorage()});
app.post('/api/import', upload.single('csv'), (req,res)=>{
  if(!req.file) return res.status(400).json({error:'csv file required'});
  const lines = req.file.buffer.toString('utf8').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const insert = db.prepare('INSERT OR IGNORE INTO tags(phone, tag) VALUES (?,?)');
  const insertMany = db.transaction(entries=>{ for(const [p,t] of entries) insert.run(p,t); });
  const entries=[];
  for(const line of lines){
    const [p,tagsStr]=line.split(';'); if(!p) continue;
    const tags=(tagsStr||'').split(',').map(x=>x.trim()).filter(Boolean);
    for(const t of tags) entries.push([p,t]);
  }
  insertMany(entries);
  res.json({imported: entries.length});
});

// CSV export
app.get('/api/export',(req,res)=>{
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="phone-tags.csv"');
  const rows=db.prepare('SELECT phone,GROUP_CONCAT(tag,",") as tags FROM tags GROUP BY phone').all();
  const csv = rows.map(r=>`${r.phone};${r.tags}`).join('\n');
  res.send(csv);
});

// Health
app.get('/health',(req,res)=>res.json({ok:true}));

app.listen(PORT,()=>console.log(`Server running at http://localhost:${PORT}`));
  
