const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'animevault-change-this-secret';

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(uploadsDir));

// ===== Database =====
const db = new Database(path.join(dataDir, 'animevault.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    used_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (used_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS anime (
    mal_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
    title TEXT, title_japanese TEXT, title_english TEXT,
    title_chinese TEXT,
    image TEXT, synopsis TEXT, score REAL, episodes INTEGER,
    year INTEGER, genres TEXT, status TEXT,
    user_rating INTEGER DEFAULT 0, user_notes TEXT,
    added_at TEXT, updated_at TEXT,
    PRIMARY KEY (mal_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS merch (
    id TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
    anime_id INTEGER, anime_name TEXT,
    name TEXT, category TEXT, photo_path TEXT,
    price REAL, purchase_date TEXT, notes TEXT, created_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS merch_photos (
    id TEXT PRIMARY KEY, merch_id TEXT NOT NULL,
    photo_path TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (merch_id) REFERENCES merch(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
    name TEXT NOT NULL, color TEXT DEFAULT '#7c3aed',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Safe ALTER TABLE migrations
const migrations = [
  'ALTER TABLE anime ADD COLUMN watch_start TEXT',
  'ALTER TABLE anime ADD COLUMN watch_end TEXT',
  'ALTER TABLE anime ADD COLUMN airing_day TEXT',
  'ALTER TABLE anime ADD COLUMN tags TEXT DEFAULT "[]"',
  'ALTER TABLE anime ADD COLUMN title_chinese TEXT',
  'ALTER TABLE merch ADD COLUMN current_value REAL',
  'ALTER TABLE merch ADD COLUMN is_wishlist INTEGER DEFAULT 0',
  'ALTER TABLE merch ADD COLUMN target_price REAL',
  'ALTER TABLE merch ADD COLUMN tags TEXT DEFAULT "[]"',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch {}
}

// ===== Auth =====
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).userId;
    req.user = db.prepare('SELECT id,username,created_at FROM users WHERE id=?').get(req.userId);
    if (!req.user) return res.status(401).json({ error: '用户不存在' });
    next();
  }
  catch { return res.status(401).json({ error: 'Token无效' }); }
}

function requireAdmin(req, res, next) {
  if (req.user?.username !== 'admin') return res.status(403).json({ error: '只有 admin 可以生成邀请码' });
  next();
}

function generateInviteCode() {
  for (let i = 0; i < 5; i++) {
    const code = 'AV-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const exists = db.prepare('SELECT id FROM invite_codes WHERE code=?').get(code);
    if (!exists) return code;
  }
  return 'AV-' + Date.now().toString(36).toUpperCase();
}

app.post('/api/auth/register', (req, res) => {
  const { username, password, inviteCode } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (password.length < 4) return res.status(400).json({ error: '密码至少4位' });
  if (db.prepare('SELECT id FROM users WHERE username=?').get(username))
    return res.status(409).json({ error: '用户名已存在' });
  const adminExists = db.prepare('SELECT id FROM users WHERE username=?').get('admin');
  const isBootstrapAdmin = !adminExists && username === 'admin';
  let invite = null;
  if (!isBootstrapAdmin) {
    const normalizedCode = String(inviteCode || '').trim().toUpperCase();
    if (!normalizedCode) return res.status(400).json({ error: '注册需要邀请码' });
    invite = db.prepare('SELECT * FROM invite_codes WHERE code=?').get(normalizedCode);
    if (!invite) return res.status(400).json({ error: '邀请码无效' });
    if (invite.used_at) return res.status(400).json({ error: '邀请码已被使用' });
    if (Date.parse(invite.expires_at) <= Date.now()) return res.status(400).json({ error: '邀请码已过期，请联系 admin 重新生成' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const createUser = db.transaction(() => {
    const r = db.prepare('INSERT INTO users(username,password_hash) VALUES(?,?)').run(username, hash);
    if (invite) {
      const used = db.prepare('UPDATE invite_codes SET used_at=?, used_by=? WHERE id=? AND used_at IS NULL')
        .run(new Date().toISOString(), r.lastInsertRowid, invite.id);
      if (used.changes !== 1) throw new Error('邀请码已被使用');
    }
    return r.lastInsertRowid;
  });
  try {
    const userId = createUser();
    res.json({ token: jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' }), username });
  } catch (e) {
    res.status(400).json({ error: e.message || '注册失败' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: '用户名或密码错误' });
  res.json({ token: jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' }), username: user.username });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/change-password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: '当前密码和新密码不能为空' });
  if (newPassword.length < 4) return res.status(400).json({ error: '新密码至少4位' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: '当前密码错误' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.userId);
  res.json({ ok: true });
});

app.post('/api/admin/invite-code', auth, requireAdmin, (req, res) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM invite_codes WHERE expires_at <= ? OR used_at IS NOT NULL').run(nowIso);
  const code = generateInviteCode();
  db.prepare('INSERT INTO invite_codes(code,created_by,created_at,expires_at) VALUES(?,?,?,?)')
    .run(code, req.userId, nowIso, expiresAt);
  res.json({ code, expiresAt, ttlSeconds: 300 });
});

// ===== Anime =====
function rowToAnime(r) {
  return { malId: r.mal_id, title: r.title, titleJapanese: r.title_japanese,
    titleEnglish: r.title_english, titleChinese: r.title_chinese,
    image: r.image, synopsis: r.synopsis,
    score: r.score, episodes: r.episodes, year: r.year,
    genres: r.genres ? JSON.parse(r.genres) : [],
    status: r.status, userRating: r.user_rating, userNotes: r.user_notes,
    addedAt: r.added_at, updatedAt: r.updated_at,
    watchStart: r.watch_start, watchEnd: r.watch_end,
    airingDay: r.airing_day, tags: r.tags ? JSON.parse(r.tags) : [] };
}

app.get('/api/anime', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM anime WHERE user_id=?').all(req.userId).map(rowToAnime));
});

app.get('/api/anime/:malId', auth, (req, res) => {
  const r = db.prepare('SELECT * FROM anime WHERE mal_id=? AND user_id=?').get(+req.params.malId, req.userId);
  res.json(r ? rowToAnime(r) : null);
});

app.put('/api/anime/:malId', auth, (req, res) => {
  const a = req.body;
  db.prepare(`INSERT INTO anime
    (mal_id,user_id,title,title_japanese,title_english,title_chinese,image,synopsis,score,episodes,year,genres,status,user_rating,user_notes,added_at,updated_at,watch_start,watch_end,airing_day,tags)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(mal_id,user_id) DO UPDATE SET
    title=excluded.title,title_japanese=excluded.title_japanese,title_english=excluded.title_english,
    title_chinese=excluded.title_chinese,image=excluded.image,synopsis=excluded.synopsis,score=excluded.score,episodes=excluded.episodes,
    year=excluded.year,genres=excluded.genres,status=excluded.status,user_rating=excluded.user_rating,
    user_notes=excluded.user_notes,updated_at=excluded.updated_at,watch_start=excluded.watch_start,
    watch_end=excluded.watch_end,airing_day=excluded.airing_day,tags=excluded.tags`).run(
    +req.params.malId, req.userId, a.title, a.titleJapanese, a.titleEnglish,
    a.titleChinese || '', a.image, a.synopsis, a.score, a.episodes, a.year,
    JSON.stringify(a.genres || []), a.status, a.userRating || 0, a.userNotes || '',
    a.addedAt || new Date().toISOString(), a.updatedAt || new Date().toISOString(),
    a.watchStart || null, a.watchEnd || null, a.airingDay || null,
    JSON.stringify(a.tags || [])
  );
  res.json({ ok: true });
});

app.delete('/api/anime/:malId', auth, (req, res) => {
  const mid = +req.params.malId;
  // Delete merch photos from disk
  const merchRows = db.prepare('SELECT id,photo_path FROM merch WHERE anime_id=? AND user_id=?').all(mid, req.userId);
  for (const m of merchRows) {
    if (m.photo_path) try { fs.unlinkSync(path.join(__dirname, m.photo_path)); } catch {}
    const photos = db.prepare('SELECT photo_path FROM merch_photos WHERE merch_id=?').all(m.id);
    photos.forEach(p => { try { fs.unlinkSync(path.join(__dirname, p.photo_path)); } catch {} });
    db.prepare('DELETE FROM merch_photos WHERE merch_id=?').run(m.id);
  }
  db.prepare('DELETE FROM merch WHERE anime_id=? AND user_id=?').run(mid, req.userId);
  db.prepare('DELETE FROM anime WHERE mal_id=? AND user_id=?').run(mid, req.userId);
  res.json({ ok: true });
});

// ===== Merch =====
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(file.originalname) || '.jpg'}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function rowToMerch(r) {
  const photos = db.prepare('SELECT id,photo_path,sort_order FROM merch_photos WHERE merch_id=? ORDER BY sort_order').all(r.id);
  return { id: r.id, animeId: r.anime_id, animeName: r.anime_name,
    name: r.name, category: r.category, photo: r.photo_path,
    photos: photos.map(p => ({ id: p.id, path: p.photo_path })),
    price: r.price, purchaseDate: r.purchase_date, notes: r.notes,
    createdAt: r.created_at, currentValue: r.current_value,
    isWishlist: r.is_wishlist, targetPrice: r.target_price,
    tags: r.tags ? JSON.parse(r.tags) : [] };
}

app.get('/api/merch', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM merch WHERE user_id=?').all(req.userId).map(rowToMerch));
});

app.get('/api/merch/anime/:animeId', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM merch WHERE anime_id=? AND user_id=?').all(+req.params.animeId, req.userId).map(rowToMerch));
});

app.post('/api/merch', auth, upload.array('photos', 10), (req, res) => {
  const m = req.body;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const files = req.files || [];
  const primaryPhoto = files.length > 0 ? `/uploads/${files[0].filename}` : '';
  db.prepare(`INSERT INTO merch(id,user_id,anime_id,anime_name,name,category,photo_path,price,purchase_date,notes,created_at,current_value,is_wishlist,target_price,tags)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, req.userId, +m.animeId, m.animeName, m.name, m.category,
    primaryPhoto, parseFloat(m.price) || 0, m.purchaseDate || null, m.notes || '',
    new Date().toISOString(), parseFloat(m.currentValue) || null,
    m.isWishlist === 'true' || m.isWishlist === '1' ? 1 : 0,
    parseFloat(m.targetPrice) || null, m.tags || '[]'
  );
  // Save all photos to merch_photos
  const insertPhoto = db.prepare('INSERT INTO merch_photos(id,merch_id,photo_path,sort_order) VALUES(?,?,?,?)');
  files.forEach((f, i) => {
    insertPhoto.run(Date.now().toString(36) + Math.random().toString(36).slice(2,8), id, `/uploads/${f.filename}`, i);
  });
  res.json({ ok: true, id });
});

// Add more photos to existing merch
app.post('/api/merch/:id/photos', auth, upload.array('photos', 10), (req, res) => {
  const merch = db.prepare('SELECT id FROM merch WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!merch) return res.status(404).json({ error: '未找到' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM merch_photos WHERE merch_id=?').get(req.params.id);
  let order = (maxOrder?.m || 0) + 1;
  const insertPhoto = db.prepare('INSERT INTO merch_photos(id,merch_id,photo_path,sort_order) VALUES(?,?,?,?)');
  (req.files || []).forEach(f => {
    insertPhoto.run(Date.now().toString(36) + Math.random().toString(36).slice(2,8), req.params.id, `/uploads/${f.filename}`, order++);
  });
  res.json({ ok: true });
});

app.delete('/api/merch/:id', auth, (req, res) => {
  const r = db.prepare('SELECT * FROM merch WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!r) return res.json({ ok: true });
  if (r.photo_path) try { fs.unlinkSync(path.join(__dirname, r.photo_path)); } catch {}
  const photos = db.prepare('SELECT photo_path FROM merch_photos WHERE merch_id=?').all(req.params.id);
  photos.forEach(p => { try { fs.unlinkSync(path.join(__dirname, p.photo_path)); } catch {} });
  db.prepare('DELETE FROM merch_photos WHERE merch_id=?').run(req.params.id);
  db.prepare('DELETE FROM merch WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

app.delete('/api/merch-photo/:photoId', auth, (req, res) => {
  const p = db.prepare('SELECT mp.* FROM merch_photos mp JOIN merch m ON mp.merch_id=m.id WHERE mp.id=? AND m.user_id=?').get(req.params.photoId, req.userId);
  if (!p) return res.json({ ok: true });
  try { fs.unlinkSync(path.join(__dirname, p.photo_path)); } catch {}
  db.prepare('DELETE FROM merch_photos WHERE id=?').run(req.params.photoId);
  res.json({ ok: true });
});

// ===== Tags =====
app.get('/api/tags', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM tags WHERE user_id=?').all(req.userId));
});

app.post('/api/tags', auth, (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: '标签名不能为空' });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  db.prepare('INSERT INTO tags(id,user_id,name,color) VALUES(?,?,?,?)').run(id, req.userId, name, color || '#7c3aed');
  res.json({ ok: true, id, name, color: color || '#7c3aed' });
});

app.delete('/api/tags/:id', auth, (req, res) => {
  db.prepare('DELETE FROM tags WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

// ===== Export / Import / Clear =====
app.get('/api/export', auth, (req, res) => {
  const anime = db.prepare('SELECT * FROM anime WHERE user_id=?').all(req.userId).map(rowToAnime);
  const merch = db.prepare('SELECT * FROM merch WHERE user_id=?').all(req.userId).map(rowToMerch);
  const tags = db.prepare('SELECT * FROM tags WHERE user_id=?').all(req.userId);
  res.json({ anime, merch, tags, exportedAt: new Date().toISOString() });
});

app.post('/api/import', auth, (req, res) => {
  const { anime, merch } = req.body;
  const ia = db.prepare(`INSERT INTO anime
    (mal_id,user_id,title,title_japanese,title_english,title_chinese,image,synopsis,score,episodes,year,genres,status,user_rating,user_notes,added_at,updated_at,watch_start,watch_end,airing_day,tags)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(mal_id,user_id) DO UPDATE SET
    title=excluded.title,title_japanese=excluded.title_japanese,title_english=excluded.title_english,
    title_chinese=excluded.title_chinese,image=excluded.image,synopsis=excluded.synopsis,score=excluded.score,episodes=excluded.episodes,
    year=excluded.year,genres=excluded.genres,status=excluded.status,user_rating=excluded.user_rating,
    user_notes=excluded.user_notes,updated_at=excluded.updated_at,watch_start=excluded.watch_start,
    watch_end=excluded.watch_end,airing_day=excluded.airing_day,tags=excluded.tags`);
  const im = db.prepare(`INSERT OR REPLACE INTO merch
    (id,user_id,anime_id,anime_name,name,category,photo_path,price,purchase_date,notes,created_at,current_value,is_wishlist,target_price,tags)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  db.transaction(() => {
    for (const a of (anime || [])) {
      ia.run(a.malId || a.mal_id, req.userId, a.title, a.titleJapanese || a.title_japanese,
        a.titleEnglish || a.title_english, a.titleChinese || a.title_chinese || '', a.image, a.synopsis, a.score, a.episodes, a.year,
        typeof a.genres === 'string' ? a.genres : JSON.stringify(a.genres || []),
        a.status, a.userRating || a.user_rating || 0, a.userNotes || a.user_notes || '',
        a.addedAt || a.added_at || new Date().toISOString(), a.updatedAt || a.updated_at || new Date().toISOString(),
        a.watchStart || a.watch_start || null, a.watchEnd || a.watch_end || null,
        a.airingDay || a.airing_day || null, typeof a.tags === 'string' ? a.tags : JSON.stringify(a.tags || []));
    }
    for (const m of (merch || [])) {
      im.run(m.id, req.userId, m.animeId || m.anime_id, m.animeName || m.anime_name,
        m.name, m.category, m.photo || m.photo_path || '', m.price || 0,
        m.purchaseDate || m.purchase_date || null, m.notes || '', m.createdAt || m.created_at || new Date().toISOString(),
        m.currentValue || m.current_value || null, m.isWishlist || m.is_wishlist || 0,
        m.targetPrice || m.target_price || null, typeof m.tags === 'string' ? m.tags : JSON.stringify(m.tags || []));
    }
  })();
  res.json({ ok: true });
});

app.delete('/api/clear', auth, (req, res) => {
  const rows = db.prepare('SELECT id,photo_path FROM merch WHERE user_id=?').all(req.userId);
  rows.forEach(m => {
    if (m.photo_path) try { fs.unlinkSync(path.join(__dirname, m.photo_path)); } catch {}
    db.prepare('SELECT photo_path FROM merch_photos WHERE merch_id=?').all(m.id)
      .forEach(p => { try { fs.unlinkSync(path.join(__dirname, p.photo_path)); } catch {} });
    db.prepare('DELETE FROM merch_photos WHERE merch_id=?').run(m.id);
  });
  db.prepare('DELETE FROM merch WHERE user_id=?').run(req.userId);
  db.prepare('DELETE FROM anime WHERE user_id=?').run(req.userId);
  db.prepare('DELETE FROM tags WHERE user_id=?').run(req.userId);
  res.json({ ok: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🚀 AnimeVault running at http://localhost:${PORT}`));
