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
app.use(express.json({ limit: '5mb' }));

const DEFAULT_AES_KEY = 'AES-NOTARIAL-SECRET-2025';
const PBKDF2_ITERATIONS = 10000;

function serverVigenereEncrypt(plaintext, key) {
  const cleanKey = (key || 'NOTARISNUSA').toUpperCase().replace(/[^A-Z]/g, '') || 'NOTARIS';
  let result = '';
  let keyIndex = 0;
  for (let i = 0; i < plaintext.length; i++) {
    const code = plaintext.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      result += String.fromCharCode(((code - 65 + shift) % 26) + 65);
      keyIndex++;
    } else if (code >= 97 && code <= 122) {
      const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      result += String.fromCharCode(((code - 97 + shift) % 26) + 97);
      keyIndex++;
    } else {
      result += plaintext[i];
    }
  }
  return result;
}

function serverAes256GcmEncrypt(plaintext, passphrase = DEFAULT_AES_KEY) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const dk = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', dk, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, tag]);
  return `AESGCM1:${salt.toString('base64')}:${iv.toString('base64')}:${combined.toString('base64')}`;
}

function serverChaCha20Poly1305Encrypt(plaintext, passphrase = DEFAULT_AES_KEY) {
  const salt = crypto.randomBytes(16);
  const nonce = crypto.randomBytes(12);
  const dk = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  const cipher = crypto.createCipheriv('chacha20-poly1305', dk, nonce, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `CHACHA1:${salt.toString('base64')}:${nonce.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`;
}

function serverSuperEncrypt(plaintext, classicalKey = 'NOTARISNUSA', modernKey = DEFAULT_AES_KEY) {
  const classical = serverVigenereEncrypt(plaintext, classicalKey);
  return serverAes256GcmEncrypt(classical, modernKey);
}

function hashPasswordForStorage(sha256Hex) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(sha256Hex, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyStoredPassword(inputSha256Hex, storedHash) {
  if (!storedHash || !inputSha256Hex) return false;
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hex] = parts;
    const derived = crypto.scryptSync(inputSha256Hex, salt, 64);
    const expected = Buffer.from(hex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }
  return storedHash === inputSha256Hex;
}

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
    created_at TEXT NOT NULL,
    notary_notes TEXT,
    document_id TEXT
  );

  CREATE TABLE IF NOT EXISTS security_tokens (
    id TEXT PRIMARY KEY,
    owner_username TEXT NOT NULL,
    serial_number TEXT UNIQUE NOT NULL,
    token_label TEXT NOT NULL,
    public_key_hash TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    revoked_at TEXT,
    revoked_reason TEXT
  );
`);

// Add columns if table already existed without them
try { db.exec(`ALTER TABLE client_requests ADD COLUMN notary_notes TEXT`); } catch {}
try { db.exec(`ALTER TABLE client_requests ADD COLUMN document_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN photo_url TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN face_descriptor TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_verified INTEGER DEFAULT 1`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN client_signed_by TEXT`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN client_signed_at TEXT`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN client_signature_hash TEXT`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN client_public_key TEXT`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN notary_signed_by TEXT`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN notary_signed_at TEXT`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN notary_signature_hash TEXT`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN notary_public_key TEXT`); } catch {}
try { db.exec(`ALTER TABLE documents ADD COLUMN notary_auth_method TEXT`); } catch {}

// Seed default photo for admin notary if empty
try {
  const adminRow = db.prepare("SELECT photo_url FROM users WHERE username = 'admin'").get();
  if (adminRow && !adminRow.photo_url) {
    db.prepare(`
      UPDATE users
      SET photo_url = ?, face_descriptor = ?
      WHERE username = 'admin'
    `).run(
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      'SHA256-BIO-NATASHA-DEMO-DESCRIPTOR-9901'
    );
  }
} catch {}

// Seed default security token for admin if empty
try {
  const tokenCountStmt = db.prepare('SELECT COUNT(*) as count FROM security_tokens');
  const tokenRow = tokenCountStmt.get();
  if (tokenRow.count === 0) {
    const insertTok = db.prepare(`
      INSERT INTO security_tokens (id, owner_username, serial_number, token_label, public_key_hash, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertTok.run(
      'tok-notary-01',
      'admin',
      'FIPS-NATASHA-2026-9901',
      'Flashdisk Dongle Notaris Natasha S.H.',
      'a78f24b0789d2c20a67e9f3b1456ca01ef2b8901cb4d8e90a5b6c7d8e9f01234',
      'ACTIVE',
      new Date().toISOString()
    );
  }
} catch {}

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

  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, name, nik, email, phone, kyc_verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-client-3',
    'hendra',
    hashPasswordForStorage('e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446'),
    'client',
    'Dr. Hendra Wijaya, Sp.A.',
    '3172081507780004',
    'hendra.wijaya@medikacenter.id',
    '+62 818-0912-3456',
    0,
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
  const checkHendra = db.prepare('SELECT id FROM users WHERE username = ?');
  if (!checkHendra.get('hendra')) {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, name, nik, email, phone, kyc_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'usr-client-3',
      'hendra',
      hashPasswordForStorage('e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446'),
      'client',
      'Dr. Hendra Wijaya, Sp.A.',
      '3172081507780004',
      'hendra.wijaya@medikacenter.id',
      '+62 818-0912-3456',
      0,
      new Date().toISOString()
    );
  }
}

// Helper for genuine initial seed payloads
function buildRealSeedDocs() {
  const cipher1 = serverAes256GcmEncrypt(
    'AKTA SERTIFIKAT HAK MILIK SHM-01428/JKT: Sebidang tanah seluas 780 m2 di Jalan Cendana No. 14, Menteng, Jakarta Pusat atas nama pemegang hak sah Budi Santoso senilai Rp 12,8 Miliar.'
  );
  const cipher2 = serverChaCha20Poly1305Encrypt(
    'AKTA WASIAT RAHASIA WST-2025-0087: Pembagian aset keluarga dan dana amanah pendidikan anak atas nama Rina Hartono, disimpan tersegel dalam pengawasan Notaris Natasha S.H., M.Kn.'
  );
  const cipher3 = serverSuperEncrypt(
    'AKTA SAHAM PERSEROAN SK-ARU/104/25: Kepemilikan 4.200 lembar saham Seri A PT Arunika Kapital Nusantara atas nama Dimas Pratama dengan hak dividen penuh senilai Rp 4,2 Miliar.'
  );
  const cipher4 = serverAes256GcmEncrypt(
    'SERTIFIKAT HGB-00991/BKS: Bangunan gudang logistik industri seluas 2.400 m2 di Kawasan Industri Jababeka, Cikarang, atas nama PT Wahana Logistik senilai Rp 8,4 Miliar.'
  );
  const cipher5 = serverAes256GcmEncrypt(
    'SERTIFIKAT SHM-02041/JKS: Rumah tinggal permanen di Pondok Indah Blok C-12, Jakarta Selatan atas nama pemilik sah Rina Hartono senilai Rp 7,6 Miliar.'
  );
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  return [
    {
      id: 'SHM-01428/JKT',
      title: 'Tanah Kavling Menteng',
      client: 'Budi Santoso',
      type: 'Sertifikat Tanah',
      value: 'Rp 12,8 M',
      status: 'Terverifikasi',
      encrypted_content: cipher1,
      algorithm: 'AES-256-GCM',
      sha256_hash: sha(cipher1),
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'WST-2025-0087',
      title: 'Wasiat Keluarga Hartono',
      client: 'Rina Hartono',
      type: 'Surat Wasiat',
      value: 'Rahasia',
      status: 'Menunggu tanda tangan',
      encrypted_content: cipher2,
      algorithm: 'ChaCha20-Poly1305',
      sha256_hash: sha(cipher2),
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'SK-ARU/104/25',
      title: 'Kepemilikan Saham PT Arunika',
      client: 'Dimas Pratama',
      type: 'Kepemilikan Saham',
      value: 'Rp 4,2 M',
      status: 'Terverifikasi',
      encrypted_content: cipher3,
      algorithm: 'Super-Encrypted (Vigenere + AES)',
      sha256_hash: sha(cipher3),
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'HGB-00991/BKS',
      title: 'Gudang Industri Cikarang',
      client: 'PT Wahana Logistik',
      type: 'Sertifikat Tanah',
      value: 'Rp 8,4 M',
      status: 'Dalam peninjauan',
      encrypted_content: cipher4,
      algorithm: 'AES-256-GCM',
      sha256_hash: sha(cipher4),
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      client_signed_by: 'PT Wahana Logistik',
      client_signed_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      client_signature_hash: sha(`CLIENT_SIGN|HGB-00991/BKS|${sha(cipher4)}|PT Wahana Logistik`),
    },
    {
      id: 'SHM-02041/JKS',
      title: 'Rumah Tinggal Pondok Indah',
      client: 'Rina Hartono',
      type: 'Sertifikat Tanah',
      value: 'Rp 7,6 M',
      status: 'Terverifikasi',
      encrypted_content: cipher5,
      algorithm: 'AES-256-GCM',
      sha256_hash: sha(cipher5),
      created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    },
  ];
}

// Seed default documents if empty, and upgrade legacy placeholder seed ciphertexts if present
const countStmt = db.prepare('SELECT COUNT(*) as count FROM documents');
const row = countStmt.get();
const realSeeds = buildRealSeedDocs();

for (const seed of realSeeds) {
  if (row.count > 0) {
    try {
      const existing = db.prepare('SELECT encrypted_content, client_signature_hash, status FROM documents WHERE id = ?').get(seed.id);
      if (existing && typeof existing.encrypted_content === 'string' && existing.encrypted_content.startsWith('U2FsdGVkX1')) {
        db.prepare('UPDATE documents SET encrypted_content = ?, sha256_hash = ? WHERE id = ?').run(
          seed.encrypted_content,
          seed.sha256_hash,
          seed.id
        );
      }
      if (existing && seed.id === 'HGB-00991/BKS' && existing.status === 'Dalam peninjauan' && !existing.client_signature_hash) {
        db.prepare(`
          UPDATE documents SET client_signed_by = ?, client_signed_at = ?, client_signature_hash = ? WHERE id = ?
        `).run(
          seed.client_signed_by,
          seed.client_signed_at,
          seed.client_signature_hash,
          seed.id
        );
      }
    } catch {}
  }
}

if (row.count === 0) {
  const insertDoc = db.prepare(`
    INSERT INTO documents (
      id, title, client, type, value, status, encrypted_content, algorithm, sha256_hash, created_at,
      client_signed_by, client_signed_at, client_signature_hash
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const doc of realSeeds) {
    insertDoc.run(
      doc.id,
      doc.title,
      doc.client,
      doc.type,
      doc.value,
      doc.status,
      doc.encrypted_content,
      doc.algorithm,
      doc.sha256_hash,
      doc.created_at,
      doc.client_signed_by || null,
      doc.client_signed_at || null,
      doc.client_signature_hash || null
    );
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
    const stmt = db.prepare('SELECT id, username, role, name, nik, email, phone, photo_url, face_descriptor, COALESCE(kyc_verified, 1) as kyc_verified, created_at FROM users ORDER BY created_at DESC');
    const users = stmt.all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (Super Admin create user)
app.post('/api/users', (req, res) => {
  try {
    const {
      username,
      password,
      password_hash,
      role = 'client',
      name,
      nik = '',
      email = '',
      phone = '',
      photo_url = '',
      face_descriptor = '',
      kyc_verified = 1
    } = req.body;

    if (!username || (!password && !password_hash) || !name) {
      return res.status(400).json({ error: 'Username, kata sandi, dan nama lengkap wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: `Username "${cleanUsername}" sudah terdaftar.` });
    }

    const rawSha = password_hash || crypto.createHash('sha256').update(password).digest('hex');
    const finalHash = hashPasswordForStorage(rawSha);
    const id = `usr-${role}-${Date.now()}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, name, nik, email, phone, photo_url, face_descriptor, kyc_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      cleanUsername,
      finalHash,
      role,
      name.trim(),
      nik.trim(),
      email.trim(),
      phone.trim(),
      photo_url || '',
      face_descriptor || '',
      kyc_verified ? 1 : 0,
      now
    );

    // Audit log
    try {
      const insertLog = db.prepare(`
        INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLog.run(`log-${Date.now()}`, `Pendaftaran Pengguna Baru (${role.toUpperCase()})`, `${name} (@${cleanUsername})`, 'green', now, '');
    } catch {}

    res.status(201).json({
      id,
      username: cleanUsername,
      role,
      name: name.trim(),
      nik: nik.trim(),
      email: email.trim(),
      phone: phone.trim(),
      photo_url: photo_url || '',
      face_descriptor: face_descriptor || '',
      kyc_verified: kyc_verified ? 1 : 0,
      created_at: now
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/kyc (Notaris approves client KYC)
app.put('/api/users/:id/kyc', (req, res) => {
  try {
    const { id } = req.params;
    const { verified = true } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const kycVal = verified ? 1 : 0;
    db.prepare('UPDATE users SET kyc_verified = ? WHERE id = ?').run(kycVal, id);

    const now = new Date().toISOString();
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `log-${Date.now()}`,
        'Verifikasi KYC Klien Disetujui',
        `${user.name} (NIK: ${user.nik || '-'})`,
        'green',
        now,
        crypto.createHash('sha256').update(`KYC_VERIFIED|${user.id}|${user.nik || ''}|${now}`).digest('hex')
      );
    } catch {}

    const updated = db.prepare('SELECT id, username, role, name, nik, email, phone, photo_url, face_descriptor, COALESCE(kyc_verified, 1) as kyc_verified, created_at FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id (Super Admin update user)
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, nik = '', email = '', phone = '', password, photo_url, face_descriptor, kyc_verified } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const finalPhoto = photo_url !== undefined ? photo_url : (user.photo_url || '');
    const finalDesc = face_descriptor !== undefined ? face_descriptor : (user.face_descriptor || '');
    const finalKyc = kyc_verified !== undefined ? (kyc_verified ? 1 : 0) : (user.kyc_verified ?? 1);

    if (password && password.trim()) {
      const shaHex = crypto.createHash('sha256').update(password.trim()).digest('hex');
      const newHash = hashPasswordForStorage(shaHex);
      db.prepare(`
        UPDATE users
        SET name = ?, role = ?, nik = ?, email = ?, phone = ?, password_hash = ?, photo_url = ?, face_descriptor = ?, kyc_verified = ?
        WHERE id = ?
      `).run(name || user.name, role || user.role, nik, email, phone, newHash, finalPhoto, finalDesc, finalKyc, id);
    } else {
      db.prepare(`
        UPDATE users
        SET name = ?, role = ?, nik = ?, email = ?, phone = ?, photo_url = ?, face_descriptor = ?, kyc_verified = ?
        WHERE id = ?
      `).run(name || user.name, role || user.role, nik, email, phone, finalPhoto, finalDesc, finalKyc, id);
    }

    const updated = db.prepare('SELECT id, username, role, name, nik, email, phone, photo_url, face_descriptor, COALESCE(kyc_verified, 1) as kyc_verified, created_at FROM users WHERE id = ?').get(id);
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
    const storedHash = hashPasswordForStorage(password_hash);
    const kycInitial = role === 'client' ? 0 : 1;

    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, name, nik, email, phone, kyc_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(id, cleanUsername, storedHash, role, name.trim(), nik.trim(), email.trim(), phone.trim(), kycInitial, now);

    res.status(201).json({
      id,
      username: cleanUsername,
      role,
      name: name.trim(),
      nik: nik.trim(),
      email: email.trim(),
      phone: phone.trim(),
      kyc_verified: kycInitial,
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

    if (!user || !verifyStoredPassword(password_hash, user.password_hash)) {
      return res.status(401).json({ error: 'Username atau kata sandi tidak sesuai.' });
    }

    // Auto-upgrade legacy unsalted SHA-256 passwords to salted scrypt on login
    if (user.password_hash && !user.password_hash.startsWith('scrypt:')) {
      try {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
          hashPasswordForStorage(password_hash),
          user.id
        );
      } catch {}
    }

    if (role && user.role !== role && user.role !== 'superadmin') {
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
        phone: user.phone,
        photo_url: user.photo_url || '',
        face_descriptor: user.face_descriptor || '',
        kyc_verified: user.kyc_verified ?? 1
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

// POST /api/documents/:id/sign (Dual-Signature: Client consent -> Notary final seal)
app.post('/api/documents/:id/sign', (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const {
      signerRole,
      signerName,
      username,
      passwordHash,
      authMethod,
      signatureHash,
      publicKey
    } = req.body;

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
    }

    if (!signerRole || !signerName) {
      return res.status(400).json({ error: 'Peran dan nama penandatangan wajib diisi.' });
    }

    const now = new Date().toISOString();

    if (signerRole === 'client') {
      if (doc.status !== 'Menunggu tanda tangan') {
        return res.status(400).json({
          error: `Dokumen berstatus "${doc.status}" tidak lagi menunggu tanda tangan klien.`
        });
      }

      if (username && passwordHash) {
        const userRow = db
          .prepare('SELECT password_hash FROM users WHERE username = ?')
          .get(username.trim().toLowerCase());
        if (userRow && !verifyStoredPassword(passwordHash, userRow.password_hash)) {
          return res.status(401).json({
            error: 'Kata sandi konfirmasi akun klien tidak sesuai.'
          });
        }
      }

      const clientSigHash =
        signatureHash ||
        crypto
          .createHash('sha256')
          .update(`CLIENT_SIGN|${doc.id}|${doc.sha256_hash}|${signerName}|${now}`)
          .digest('hex');

      db.prepare(`
        UPDATE documents
        SET status = 'Dalam peninjauan',
            client_signed_by = ?,
            client_signed_at = ?,
            client_signature_hash = ?,
            client_public_key = ?
        WHERE id = ?
      `).run(signerName, now, clientSigHash, publicKey || null, id);

      // Sync linked client_requests if any
      try {
        db.prepare(`
          UPDATE client_requests
          SET status = 'Menunggu Pengesahan Notaris',
              notary_notes = ?
          WHERE document_id = ?
        `).run(
          `Draf akta telah ditandatangani oleh klien (${signerName}). Menunggu pengesahan akhir Notaris.`,
          id
        );
      } catch {}

      try {
        db.prepare(`
          INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          `log-${Date.now()}`,
          'Tanda Tangan Persetujuan Klien',
          `${doc.title} · ${signerName} (Menunggu Pengesahan Notaris)`,
          'blue',
          now,
          clientSigHash
        );
      } catch {}

      const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
      return res.json({
        success: true,
        document: updatedDoc,
        message: 'Tanda tangan persetujuan klien berhasil dibubuhkan. Menunggu pengesahan akhir Notaris.'
      });
    }

    if (signerRole === 'admin') {
      if (doc.status === 'Terverifikasi') {
        return res.status(400).json({ error: 'Dokumen ini sudah terverifikasi dan tersegel.' });
      }
      if (doc.status === 'Menunggu tanda tangan') {
        return res.status(400).json({
          error: 'Dokumen ini masih menunggu tanda tangan persetujuan dari klien terlebih dahulu.'
        });
      }

      const finalMethod = authMethod || 'USB Dongle Token';
      const notarySigHash =
        signatureHash ||
        crypto
          .createHash('sha256')
          .update(`NOTARY_SEAL|${doc.id}|${doc.sha256_hash}|${doc.client_signature_hash || ''}|${signerName}|${now}`)
          .digest('hex');

      db.prepare(`
        UPDATE documents
        SET status = 'Terverifikasi',
            notary_signed_by = ?,
            notary_signed_at = ?,
            notary_signature_hash = ?,
            notary_public_key = ?,
            notary_auth_method = ?
        WHERE id = ?
      `).run(signerName, now, notarySigHash, publicKey || null, finalMethod, id);

      // Sync linked client_requests if any
      try {
        db.prepare(`
          UPDATE client_requests
          SET status = 'Selesai & Tersegel'
          WHERE document_id = ?
        `).run(id);
      } catch {}

      try {
        db.prepare(`
          INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          `log-${Date.now()}`,
          'Pengesahan & Segel Akhir Notaris',
          `${doc.title} · ${doc.client} (${finalMethod})`,
          'green',
          now,
          notarySigHash
        );
      } catch {}

      const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
      return res.json({
        success: true,
        document: updatedDoc,
        message: 'Dokumen resmi disahkan dan disegel oleh Notaris.'
      });
    }

    return res.status(400).json({ error: 'Peran penandatangan tidak valid.' });
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

    // Audit log
    try {
      const insertLog = db.prepare(`
        INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLog.run(`log-${Date.now()}`, 'Permohonan Layanan Masuk', `${title} · ${client_name}`, 'amber', now, '');
    } catch {}

    res.status(201).json({ id, client_name, title, category, notes, status: 'Menunggu Peninjauan', created_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/requests/:id (Update status and/or notary notes)
app.put('/api/requests/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, notary_notes } = req.body;

    const existing = db.prepare('SELECT * FROM client_requests WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Permintaan tidak ditemukan.' });
    }

    const newStatus = status || existing.status;
    const newNotes = notary_notes !== undefined ? notary_notes : (existing.notary_notes || '');

    db.prepare(`
      UPDATE client_requests
      SET status = ?, notary_notes = ?
      WHERE id = ?
    `).run(newStatus, newNotes, id);

    const now = new Date().toISOString();
    try {
      let tone = 'blue';
      if (newStatus === 'Selesai & Tersegel') tone = 'green';
      if (newStatus === 'Ditolak') tone = 'wine';

      const insertLog = db.prepare(`
        INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLog.run(`log-${Date.now()}`, `Status Permohonan: ${newStatus}`, `${existing.title} · ${existing.client_name}`, tone, now, '');
    } catch {}

    const updated = db.prepare('SELECT * FROM client_requests WHERE id = ?').get(id);
    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/requests/:id/sign (Notary signs request & issues draft for client or official verified deed)
app.post('/api/requests/:id/sign', (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      client,
      type = 'Akta Notaris',
      value = 'Rahasia',
      encrypted_content,
      algorithm = 'AES-256-GCM',
      sha256_hash,
      notary_notes = 'Telah diverifikasi dan ditandatangani secara digital oleh Notaris Natasha S.H., M.Kn.',
      signatureMode = 'dual',
      notaryName = 'Natasha S.H., M.Kn.',
      authMethod = 'USB Dongle Token'
    } = req.body;

    const request = db.prepare('SELECT * FROM client_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Permintaan tidak ditemukan.' });
    }

    const docId = `AKT-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const finalHash = sha256_hash || crypto.createHash('sha256').update(encrypted_content || id).digest('hex');
    const isDual = signatureMode !== 'direct';

    const docStatus = isDual ? 'Menunggu tanda tangan' : 'Terverifikasi';
    const reqStatus = isDual ? 'Menunggu TTD Klien' : 'Selesai & Tersegel';
    const notarySigHash = isDual
      ? null
      : crypto
          .createHash('sha256')
          .update(`NOTARY_SEAL|${docId}|${finalHash}|${notaryName}|${now}`)
          .digest('hex');

    // 1. Insert draft or official deed into documents table
    const insertDoc = db.prepare(`
      INSERT INTO documents (
        id, title, client, type, value, status, encrypted_content, algorithm, sha256_hash, created_at,
        notary_signed_by, notary_signed_at, notary_signature_hash, notary_auth_method
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertDoc.run(
      docId,
      title || request.title,
      client || request.client_name,
      type,
      value,
      docStatus,
      encrypted_content || 'U2FsdGVkX1+NotarizedEncryptedDeed==',
      algorithm,
      finalHash,
      now,
      isDual ? null : notaryName,
      isDual ? null : now,
      notarySigHash,
      isDual ? null : authMethod
    );

    // 2. Update client request status
    const finalNotaryNotes = isDual
      ? `Draf akta resmi (${docId}) telah diterbitkan oleh Notaris. Silakan tinjau dan bubuhkan tanda tangan digital persetujuan Anda.`
      : notary_notes;

    db.prepare(`
      UPDATE client_requests
      SET status = ?, notary_notes = ?, document_id = ?
      WHERE id = ?
    `).run(reqStatus, finalNotaryNotes, docId, id);

    // 3. Insert audit log
    try {
      const insertLog = db.prepare(`
        INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLog.run(
        `log-${Date.now()}`,
        isDual ? 'Penerbitan Draf Akta (Menunggu TTD Klien)' : 'Pengesahan & Tanda Tangan Akta',
        `${title || request.title} · ${client || request.client_name}`,
        isDual ? 'amber' : 'green',
        now,
        finalHash
      );
    } catch {}

    const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    const updatedReq = db.prepare('SELECT * FROM client_requests WHERE id = ?').get(id);

    res.status(201).json({
      success: true,
      document: updatedDoc,
      request: updatedReq,
      message: isDual
        ? `Draf akta (${docId}) dikirim ke klien untuk TTD Tahap 1.`
        : 'Akta resmi berhasil ditandatangani dan disegel ke dalam brankas.'
    });
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

// ================= SECURITY TOKEN (USB DONGLE) ENDPOINTS =================

// GET /api/tokens
app.get('/api/tokens', (req, res) => {
  try {
    const { username } = req.query;
    let tokens;
    if (username) {
      const stmt = db.prepare('SELECT * FROM security_tokens WHERE owner_username = ? ORDER BY created_at DESC');
      tokens = stmt.all(username);
    } else {
      const stmt = db.prepare('SELECT * FROM security_tokens ORDER BY created_at DESC');
      tokens = stmt.all();
    }
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tokens (Issue new token)
app.post('/api/tokens', (req, res) => {
  try {
    const { owner_username, serial_number, token_label, public_key_hash } = req.body;
    if (!owner_username || !serial_number) {
      return res.status(400).json({ error: 'Username dan serial number wajib diisi.' });
    }

    const id = `tok-${Date.now()}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO security_tokens (id, owner_username, serial_number, token_label, public_key_hash, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
    `);
    stmt.run(id, owner_username, serial_number, token_label || 'Flashdisk USB Token', public_key_hash || '', now);

    // Audit log
    try {
      const insertLog = db.prepare(`
        INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLog.run(`log-${Date.now()}`, 'Penerbitan Token USB Dongle Baru', `${token_label || 'Dongle'} (${serial_number}) · ${owner_username}`, 'green', now, public_key_hash || '');
    } catch {}

    const created = db.prepare('SELECT * FROM security_tokens WHERE id = ?').get(id);
    res.status(201).json({ success: true, token: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tokens/revoke (Revoke lost or compromised token)
app.post('/api/tokens/revoke', (req, res) => {
  try {
    const { serial_number, reason = 'Dongle fisik dilaporkan hilang / dicuri' } = req.body;
    if (!serial_number) {
      return res.status(400).json({ error: 'Serial number token wajib diisi.' });
    }

    const token = db.prepare('SELECT * FROM security_tokens WHERE serial_number = ?').get(serial_number);
    if (!token) {
      return res.status(404).json({ error: 'Token dengan serial tersebut tidak ditemukan.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE security_tokens
      SET status = 'REVOKED', revoked_at = ?, revoked_reason = ?
      WHERE serial_number = ?
    `).run(now, reason, serial_number);

    // Emergency Audit log
    try {
      const insertLog = db.prepare(`
        INSERT INTO audit_logs (id, action, detail, tone, timestamp, block_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLog.run(`log-${Date.now()}`, 'PENCABUTAN DARURAT TOKEN DONGLE', `Token ${serial_number} DIBLOKIR: ${reason}`, 'wine', now, token.public_key_hash);
    } catch {}

    const updated = db.prepare('SELECT * FROM security_tokens WHERE serial_number = ?').get(serial_number);
    res.json({
      success: true,
      message: `Token ${serial_number} berhasil DIBLOKIR / DICABUT dari sistem.`,
      token: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[ArsipNusa Vault] SQLite Express Server berjalan di http://localhost:${PORT}`);
});
