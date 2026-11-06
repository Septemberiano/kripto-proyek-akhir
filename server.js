import cors from 'cors';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'vault.sqlite');
const db = new DatabaseSync(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    nik TEXT,
    email TEXT,
    phone TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT DEFAULT 'Rahasia',
    status TEXT DEFAULT 'Terverifikasi',
    encrypted_content TEXT NOT NULL,
    algorithm TEXT DEFAULT 'AES-256-GCM',
    sha256_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    tone TEXT DEFAULT 'green',
    timestamp TEXT NOT NULL,
    block_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS client_requests (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Menunggu Peninjauan',
    created_at TEXT NOT NULL
  );
`);

// Seed default users if empty
const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
const userRow = userCountStmt.get();

if (userRow.count === 0) {
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, name, nik, email, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // SHA256 of superadmin123: e34f92a20532a873cb3184398070b4b82a8fa29cf48572c203dc5f0fa6158231
  insertUser.run(
    'usr-superadmin-1',
    'superadmin',
    'e34f92a20532a873cb3184398070b4b82a8fa29cf48572c203dc5f0fa6158231',
    'superadmin',
    'Ahmad Fauzi (Sysadmin)',
    '3171000000000001',
    'superadmin@arsipnusa.id',
    '+62 811-0000-999',
    new Date().toISOString()
  );

  // SHA256 of admin123: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
  insertUser.run(
    'usr-admin-1',
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'admin',
    'Natasha S.H., M.Kn.',
    '3171012345670001',
    'notaris@arsipnusa.id',
    '+62 21-555-8900',
    new Date().toISOString()
  );

  // SHA256 of user123: e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446
  insertUser.run(
    'usr-client-1',
    'rina',
    'e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446',
    'client',
    'Rina Hartono',
    '3174094508900001',
    'rina.hartono@familytrust.co.id',
    '+62 812-4456-7890',
    new Date().toISOString()
  );

  insertUser.run(
    'usr-client-2',
    'budi',
    'e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446',
    'client',
    'Budi Santoso',
    '3171051204850003',
    'budi.santoso@mentengcapital.id',
    '+62 811-9283-102',
    new Date().toISOString()
  );
} else {
  // Ensure superadmin exists even if database already has users
  const checkSuper = db.prepare('SELECT id FROM users WHERE username = ?');
  if (!checkSuper.get('superadmin')) {
    const insertSuper = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, name, nik, email, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSuper.run(
      'usr-superadmin-1',
      'superadmin',
      'e34f92a20532a873cb3184398070b4b82a8fa29cf48572c203dc5f0fa6158231',
      'superadmin',
      'Ahmad Fauzi (Sysadmin)',
      '3171000000000001',
      'superadmin@arsipnusa.id',
      '+62 811-0000-999',
      new Date().toISOString()
    );
  }
}

// Seed default documents if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM documents');
const row = countStmt.get();

if (row.count === 0) {
  const insertDoc = db.prepare(`
    INSERT INTO documents (id, title, client, type, value, status, encrypted_content, algorithm, sha256_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialDocs = [
    [
      'SHM-01428/JKT',
      'Tanah Kavling Menteng',
      'Budi Santoso',
      'Sertifikat Tanah',
      'Rp 12,8 M',
      'Terverifikasi',
      'U2FsdGVkX1+v3qgH9/T4K9pW2bA7Q9qL8sE9F2D3...== [Encrypted with AES-256-GCM]',
      'AES-256-GCM',
      'a78f24b0789d2c20a67e9f3b1456ca01ef2b8901cb4d8e90a5b6c7d8e9f01234',
      new Date(Date.now() - 3600000 * 24).toISOString()
    ],
    [
      'WST-2025-0087',
      'Wasiat Keluarga Hartono',
      'Rina Hartono',
      'Surat Wasiat',
      'Rahasia',
      'Menunggu tanda tangan',
      'U2FsdGVkX1+3K8eF92aB1qL7wE9D0c8A4f7...== [Encrypted with ChaCha20-Poly1305]',
      'ChaCha20-Poly1305',
      '3e94b7c12f08a99476bdf23485743bcae7102837461829405627192837465012',
      new Date(Date.now() - 3600000 * 5).toISOString()
    ],
    [
      'SK-ARU/104/25',
      'Kepemilikan Saham PT Arunika',
      'Dimas Pratama',
      'Kepemilikan Saham',
      'Rp 4,2 M',
      'Terverifikasi',
      'U2FsdGVkX1/98mN4k5L8p2QwE7RtYuIoP3...== [Encrypted with Super Encryption]',
      'Super-Encrypted (Vigenere + AES)',
      '9c52b83748291048572019384756102938475610293847561029384756102938',
      new Date(Date.now() - 3600000 * 12).toISOString()
    ],
    [
      'HGB-00991/BKS',
      'Gudang Industri Cikarang',
      'PT Wahana Logistik',
      'Sertifikat Tanah',
      'Rp 8,4 M',
      'Dalam peninjauan',
      'U2FsdGVkX1+81nQ3jK9xV4pL1qA7zC8...== [Encrypted with AES-256-GCM]',
      'AES-256-GCM',
      'f47ac10b58cc4372a5670e02b2c3d479a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d',
      new Date(Date.now() - 3600000 * 2).toISOString()
    ],
    [
      'SHM-02041/JKS',
      'Rumah Tinggal Pondok Indah',
      'Rina Hartono',
      'Sertifikat Tanah',
      'Rp 7,6 M',
      'Terverifikasi',
      'U2FsdGVkX1+9K8sP2qR4tU6vW8eF92aB1qL7wE9D0c8A4f7...== [Encrypted with AES-256-GCM]',
      'AES-256-GCM',
      '5b2a1c098e7d6f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a',
      new Date(Date.now() - 3600000 * 36).toISOString()
    ]
  ];

  for (const doc of initialDocs) {
    insertDoc.run(...doc);
  }

  const insertLog = db.prepare(`
    INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertLog.run(
    'log-1',
    'Inisialisasi Vault Notaris',
    'Genesis Block dibuat dengan enkripsi AES-256',
    'wine',
    new Date(Date.now() - 3600000 * 48).toISOString(),
    '0000000000000000000000000000000000000000000000000000000000000000'
  );
  insertLog.run(
    'log-2',
    'Akta kepemilikan diperbarui',
    'Tanah Kavling Menteng · SHM 01428/JKT',
    'green',
    new Date(Date.now() - 3600000 * 1).toISOString(),
    'a78f24b0789d2c20a67e9f3b1456ca01ef2b8901cb4d8e90a5b6c7d8e9f01234'
  );
  insertLog.run(
    'log-3',
    'Tanda tangan digital diminta',
    'Wasiat Keluarga Hartono · WST-2025-0087',
    'amber',
    new Date(Date.now() - 3600000 * 3).toISOString(),
    '3e94b7c12f08a99476bdf23485743bcae7102837461829405627192837465012'
  );
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'sqlite', timestamp: new Date().toISOString() });
});

// ================= USER & AUTH ENDPOINTS =================

// GET /api/users
app.get('/api/users', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, username, role, name, nik, email, phone, created_at FROM users ORDER BY created_at DESC');
    const users = stmt.all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (Super Admin create user)
app.post('/api/users', (req, res) => {
  try {
    const { username, password, password_hash, role = 'client', name, nik = '', email = '', phone = '' } = req.body;

    if (!username || (!password && !password_hash) || !name) {
      return res.status(400).json({ error: 'Username, kata sandi, dan nama lengkap wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: `Username "${cleanUsername}" sudah terdaftar.` });
    }

    const finalHash = password_hash || crypto.createHash('sha256').update(password).digest('hex');
    const id = `usr-${role}-${Date.now()}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, name, nik, email, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(id, cleanUsername, finalHash, role, name.trim(), nik.trim(), email.trim(), phone.trim(), now);

    res.status(201).json({
      id,
      username: cleanUsername,
      role,
      name: name.trim(),
      nik: nik.trim(),
      email: email.trim(),
      phone: phone.trim(),
      created_at: now
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id (Super Admin update user)
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, nik = '', email = '', phone = '', password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    if (password && password.trim()) {
      const newHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
      db.prepare(`
        UPDATE users
        SET name = ?, role = ?, nik = ?, email = ?, phone = ?, password_hash = ?
        WHERE id = ?
      `).run(name || user.name, role || user.role, nik, email, phone, newHash, id);
    } else {
      db.prepare(`
        UPDATE users
        SET name = ?, role = ?, nik = ?, email = ?, phone = ?
        WHERE id = ?
      `).run(name || user.name, role || user.role, nik, email, phone, id);
    }

    const updated = db.prepare('SELECT id, username, role, name, nik, email, phone, created_at FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id (Super Admin delete user)
app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    if (user.username === 'superadmin') {
      return res.status(403).json({ error: 'Akun Super Administrator utama tidak boleh dihapus.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true, message: `Pengguna ${user.name} (${user.username}) berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/stats (Super Admin System & Database Stats)
app.get('/api/system/stats', (req, res) => {
  try {
    const usersAll = db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all();
    const userStats = { total: 0, superadmin: 0, admin: 0, client: 0 };
    for (const r of usersAll) {
      if (r.role in userStats) {
        userStats[r.role] = r.count;
      }
      userStats.total += r.count;
    }

    const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get();
    const verifiedDocs = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'Terverifikasi'").get();
    const pendingDocs = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'Menunggu tanda tangan'").get();
    const reviewDocs = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'Dalam peninjauan'").get();

    const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();
    const reqCount = db.prepare('SELECT COUNT(*) as count FROM client_requests').get();

    let dbSize = 40;
    try {
      const stats = fs.statSync(dbPath);
      dbSize = Math.round(stats.size / 1024);
    } catch {
      dbSize = 40;
    }

    res.json({
      users: userStats,
      documents: {
        total: docCount.count,
        verified: verifiedDocs.count,
        pending: pendingDocs.count,
        review: reviewDocs.count
      },
      auditLogsCount: auditCount.count,
      clientRequestsCount: reqCount.count,
      databaseSizeKb: dbSize,
      databaseStatus: 'Online (SQLite Sync Mode)',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/register
app.post('/api/users/register', (req, res) => {
  try {
    const { username, password_hash, role = 'client', name, nik = '', email = '', phone = '' } = req.body;

    if (!username || !password_hash || !name) {
      return res.status(400).json({ error: 'Username, password, dan nama lengkap wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if username already exists
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = ?');
    const existing = checkStmt.get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: `Username "${cleanUsername}" sudah digunakan. Silakan pilih username lain.` });
    }

    const id = `usr-${role}-${Date.now()}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, name, nik, email, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(id, cleanUsername, password_hash, role, name.trim(), nik.trim(), email.trim(), phone.trim(), now);

    res.status(201).json({
      id,
      username: cleanUsername,
      role,
      name: name.trim(),
      nik: nik.trim(),
      email: email.trim(),
      phone: phone.trim(),
      created_at: now
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/login
app.post('/api/users/login', (req, res) => {
  try {
    const { username, password_hash, role } = req.body;

    if (!username || !password_hash) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(cleanUsername);

    if (!user || user.password_hash !== password_hash) {
      return res.status(401).json({ error: 'Username atau kata sandi tidak sesuai.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        error: `Akun ini terdaftar sebagai "${user.role.toUpperCase()}", tidak dapat masuk melalui portal "${role.toUpperCase()}".`
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        nik: user.nik,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DOCUMENT ENDPOINTS =================

// GET /api/documents
app.get('/api/documents', (req, res) => {
  try {
    const { client } = req.query;
    let docs;
    if (client) {
      const stmt = db.prepare('SELECT * FROM documents WHERE client LIKE ? ORDER BY created_at DESC');
      docs = stmt.all(`%${client}%`);
    } else {
      const stmt = db.prepare('SELECT * FROM documents ORDER BY created_at DESC');
      docs = stmt.all();
    }
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents
app.post('/api/documents', (req, res) => {
  try {
    const {
      title,
      client,
      type = 'Akta Notaris',
      value = 'Rahasia',
      status = 'Terverifikasi',
      encrypted_content,
      algorithm = 'AES-256-GCM',
      sha256_hash
    } = req.body;

    if (!title || !client || !encrypted_content) {
      return res.status(400).json({ error: 'Title, client, dan encrypted_content wajib diisi' });
    }

    const id = `AKT-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const finalHash = sha256_hash || `hash_${Date.now().toString(16)}`;

    const insertStmt = db.prepare(`
      INSERT INTO documents (id, title, client, type, value, status, encrypted_content, algorithm, sha256_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(id, title, client, type, value, status, encrypted_content, algorithm, finalHash, now);

    // Also record audit log
    const insertLog = db.prepare(`
      INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertLog.run(`log-${Date.now()}`, `Dokumen baru terenkripsi`, `${title} · ${client}`, 'blue', now, finalHash);

    const newDoc = {
      id,
      title,
      client,
      type,
      value,
      status,
      encrypted_content,
      algorithm,
      sha256_hash: finalHash,
      created_at: now
    };

    res.status(201).json(newDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CLIENT REQUESTS ENDPOINTS =================

// GET /api/requests
app.get('/api/requests', (req, res) => {
  try {
    const { client } = req.query;
    let requests;
    if (client) {
      const stmt = db.prepare('SELECT * FROM client_requests WHERE client_name LIKE ? ORDER BY created_at DESC');
      requests = stmt.all(`%${client}%`);
    } else {
      const stmt = db.prepare('SELECT * FROM client_requests ORDER BY created_at DESC');
      requests = stmt.all();
    }
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/requests
app.post('/api/requests', (req, res) => {
  try {
    const { client_name, title, category = 'Pendaftaran Aset', notes = '' } = req.body;
    if (!client_name || !title) {
      return res.status(400).json({ error: 'Nama klien dan judul permintaan wajib diisi.' });
    }

    const id = `REQ-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO client_requests (id, client_name, title, category, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, client_name, title, category, notes, 'Menunggu Peninjauan', now);

    res.status(201).json({ id, client_name, title, category, notes, status: 'Menunggu Peninjauan', created_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit-logs
app.get('/api/audit-logs', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    const logs = stmt.all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit-logs
app.post('/api/audit-logs', (req, res) => {
  try {
    const { action, detail, tone = 'blue', block_hash = '' } = req.body;
    const id = `log-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, action, detail, tone, timestamp, block_hash);

    res.status(201).json({ id, action, detail, tone, timestamp, block_hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[ArsipNusa Vault] SQLite Express Server berjalan di http://localhost:${PORT}`);
});
