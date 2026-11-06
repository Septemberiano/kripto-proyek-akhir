import type { AuditLogItem, DocumentItem, UserSession, RegisterPayload, ClientRequestItem } from '../types';
import { sha256 } from '../utils/crypto';

const API_BASE_URL = 'http://localhost:5000/api';
const LOCAL_STORAGE_DOCS_KEY = 'arsipnusa_documents_vault';
const LOCAL_STORAGE_LOGS_KEY = 'arsipnusa_audit_logs_vault';
const LOCAL_STORAGE_USERS_KEY = 'arsipnusa_users_vault';
const LOCAL_STORAGE_REQUESTS_KEY = 'arsipnusa_requests_vault';

// Fallback seed documents
const DEFAULT_SEED_DOCUMENTS: DocumentItem[] = [
  {
    id: 'SHM-01428/JKT',
    title: 'Tanah Kavling Menteng',
    client: 'Budi Santoso',
    type: 'Sertifikat Tanah',
    value: 'Rp 12,8 M',
    status: 'Terverifikasi',
    encrypted_content: 'U2FsdGVkX1+v3qgH9/T4K9pW2bA7Q9qL8sE9F2D3v8xL3p9== [Encrypted with AES-256-GCM]',
    algorithm: 'AES-256-GCM',
    sha256_hash: 'a78f24b0789d2c20a67e9f3b1456ca01ef2b8901cb4d8e90a5b6c7d8e9f01234',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'WST-2025-0087',
    title: 'Wasiat Keluarga Hartono',
    client: 'Rina Hartono',
    type: 'Surat Wasiat',
    value: 'Rahasia',
    status: 'Menunggu tanda tangan',
    encrypted_content: 'U2FsdGVkX1+3K8eF92aB1qL7wE9D0c8A4f7m8sP2qR4tU6v== [Encrypted with ChaCha20-Poly1305]',
    algorithm: 'ChaCha20-Poly1305',
    sha256_hash: '3e94b7c12f08a99476bdf23485743bcae7102837461829405627192837465012',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'SK-ARU/104/25',
    title: 'Kepemilikan Saham PT Arunika',
    client: 'Dimas Pratama',
    type: 'Kepemilikan Saham',
    value: 'Rp 4,2 M',
    status: 'Terverifikasi',
    encrypted_content: 'U2FsdGVkX1/98mN4k5L8p2QwE7RtYuIoP3aD2sF4gH6jK8l== [Super-Encrypted: Vigenere + AES]',
    algorithm: 'Super-Encrypted (Vigenere + AES)',
    sha256_hash: '9c52b83748291048572019384756102938475610293847561029384756102938',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'HGB-00991/BKS',
    title: 'Gudang Industri Cikarang',
    client: 'PT Wahana Logistik',
    type: 'Sertifikat Tanah',
    value: 'Rp 8,4 M',
    status: 'Dalam peninjauan',
    encrypted_content: 'U2FsdGVkX1+81nQ3jK9xV4pL1qA7zC8wE2rT4yU6iO8pA1s== [Encrypted with AES-256-GCM]',
    algorithm: 'AES-256-GCM',
    sha256_hash: 'f47ac10b58cc4372a5670e02b2c3d479a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'SHM-02041/JKS',
    title: 'Rumah Tinggal Pondok Indah',
    client: 'Rina Hartono',
    type: 'Sertifikat Tanah',
    value: 'Rp 7,6 M',
    status: 'Terverifikasi',
    encrypted_content: 'U2FsdGVkX1+9K8sP2qR4tU6vW8eF92aB1qL7wE9D0c8A4f7...== [Encrypted with AES-256-GCM]',
    algorithm: 'AES-256-GCM',
    sha256_hash: '5b2a1c098e7d6f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
];

const DEFAULT_SEED_LOGS: AuditLogItem[] = [
  {
    id: 'log-1',
    action: 'Akta kepemilikan diperbarui',
    detail: 'Tanah Kavling Menteng · SHM 01428/JKT',
    tone: 'green',
    timestamp: '12 menit lalu',
    block_hash: 'a78f24b0789d2c20a67e9f3b1456ca01ef2b8901cb4d8e90a5b6c7d8e9f01234',
  },
  {
    id: 'log-2',
    action: 'Tanda tangan digital diminta',
    detail: 'Wasiat Keluarga Hartono · WST-2025-0087',
    tone: 'amber',
    timestamp: '1 jam lalu',
    block_hash: '3e94b7c12f08a99476bdf23485743bcae7102837461829405627192837465012',
  },
  {
    id: 'log-3',
    action: 'Berkas berhasil dienkripsi',
    detail: '3 dokumen baru · AES-256 & ChaCha20',
    tone: 'blue',
    timestamp: 'Kemarin, 16.42',
    block_hash: 'f47ac10b58cc4372a5670e02b2c3d479a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d',
  },
  {
    id: 'log-4',
    action: 'Block baru ditambahkan',
    detail: 'Chain #BLK-008921 · Segel Kriptografis Sah',
    tone: 'wine',
    timestamp: 'Kemarin, 14.18',
    block_hash: '9c52b83748291048572019384756102938475610293847561029384756102938',
  },
];

// Fallback seed users
const DEFAULT_SEED_USERS = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
    role: 'admin' as const,
    name: 'Natasha S.H., M.Kn.',
    nik: '3171012345670001',
    email: 'notaris@arsipnusa.id',
    phone: '+62 21-555-8900',
  },
  {
    id: 'usr-client-1',
    username: 'rina',
    password_hash: 'e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446', // user123
    role: 'client' as const,
    name: 'Rina Hartono',
    nik: '3174094508900001',
    email: 'rina.hartono@familytrust.co.id',
    phone: '+62 812-4456-7890',
  },
  {
    id: 'usr-client-2',
    username: 'budi',
    password_hash: 'e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446', // user123
    role: 'client' as const,
    name: 'Budi Santoso',
    nik: '3171051204850003',
    email: 'budi.santoso@mentengcapital.id',
    phone: '+62 811-9283-102',
  },
];

const DEFAULT_SEED_REQUESTS: ClientRequestItem[] = [
  {
    id: 'REQ-001',
    client_name: 'Rina Hartono',
    title: 'Konsultasi Perubahan Klausul Ahli Waris',
    category: 'Surat Wasiat',
    notes: 'Mohon penyesuaian porsi waris tanah kavling Pondok Indah untuk anak kedua.',
    status: 'Sedang Diproses',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'REQ-002',
    client_name: 'Rina Hartono',
    title: 'Pendaftaran Akta Hibah Kendaraan & Properti',
    category: 'Pendaftaran Aset',
    notes: 'Pengurusan balik nama dokumen SHM nomor 02041/JKS.',
    status: 'Menunggu Peninjauan',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

// LocalStorage helpers
function getLocalUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SEED_USERS;
}

function saveLocalUsers(users: any[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch {}
}

function getLocalDocs(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SEED_DOCUMENTS;
}

function saveLocalDocs(docs: DocumentItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(docs));
  } catch {}
}

function getLocalLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SEED_LOGS;
}

function saveLocalLogs(logs: AuditLogItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logs));
  } catch {}
}

function getLocalRequests(): ClientRequestItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REQUESTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SEED_REQUESTS;
}

function saveLocalRequests(reqs: ClientRequestItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_REQUESTS_KEY, JSON.stringify(reqs));
  } catch {}
}

// Backend Health
export async function checkBackendHealth(): Promise<{ isOnline: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      return { isOnline: true, message: 'SQLite REST API Terhubung (Port 5000)' };
    }
  } catch {}
  return { isOnline: false, message: 'Mode Offline (Penyimpanan Lokal Aktif)' };
}

// User Authentication: Login
export async function loginUser(
  username: string,
  password: string,
  expectedRole: 'admin' | 'client'
): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  const passwordHash = await sha256(password);
  const cleanUsername = username.trim().toLowerCase();

  // Try Remote SQLite API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUsername,
        password_hash: passwordHash,
        role: expectedRole,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const json = await res.json();
    if (res.ok && json.success) {
      const u = json.user;
      const session: UserSession = {
        username: u.username,
        displayName: u.name,
        role: u.role,
        loginTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        isDongleConnected: u.role === 'admin',
        token: `AN-VAULT-${passwordHash.slice(0, 16).toUpperCase()}`,
        nik: u.nik,
        email: u.email,
        phone: u.phone,
      };
      return { success: true, session };
    } else {
      return { success: false, error: json.error || 'Autentikasi gagal.' };
    }
  } catch {
    // Offline fallback using LocalStorage users
  }

  const users = getLocalUsers();
  const matchedUser = users.find(
    (u: any) => u.username.toLowerCase() === cleanUsername && u.password_hash === passwordHash
  );

  if (!matchedUser) {
    return {
      success: false,
      error: `Kredensial tidak valid untuk ${cleanUsername}. Silakan periksa kembali username dan kata sandi.`,
    };
  }

  if (matchedUser.role !== expectedRole) {
    return {
      success: false,
      error: `Akun ini terdaftar sebagai "${matchedUser.role.toUpperCase()}", tidak dapat masuk melalui formulir "${expectedRole.toUpperCase()}".`,
    };
  }

  const session: UserSession = {
    username: matchedUser.username,
    displayName: matchedUser.name,
    role: matchedUser.role,
    loginTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    isDongleConnected: matchedUser.role === 'admin',
    token: `AN-VAULT-${passwordHash.slice(0, 16).toUpperCase()}`,
    nik: matchedUser.nik,
    email: matchedUser.email,
    phone: matchedUser.phone,
  };

  return { success: true, session };
}

// User Registration: Sign Up (Buat akun sendiri)
export async function registerUser(
  payload: RegisterPayload
): Promise<{ success: boolean; user?: any; error?: string }> {
  const passwordHash = await sha256(payload.password);
  const cleanUsername = payload.username.trim().toLowerCase();

  const userObj = {
    id: `usr-${payload.role || 'client'}-${Date.now()}`,
    username: cleanUsername,
    password_hash: passwordHash,
    role: payload.role || 'client',
    name: payload.name.trim(),
    nik: payload.nik?.trim() || '',
    email: payload.email?.trim() || '',
    phone: payload.phone?.trim() || '',
    created_at: new Date().toISOString(),
  };

  // Try Remote SQLite API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userObj),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const json = await res.json();
    if (res.ok) {
      // Also cache in local storage
      const current = getLocalUsers();
      saveLocalUsers([json, ...current]);
      return { success: true, user: json };
    } else {
      return { success: false, error: json.error || 'Gagal mendaftarkan akun.' };
    }
  } catch {
    // Offline fallback
  }

  const current = getLocalUsers();
  if (current.some((u: any) => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: `Username "${cleanUsername}" sudah digunakan.` };
  }

  saveLocalUsers([userObj, ...current]);
  return { success: true, user: userObj };
}

// Documents API
export async function fetchDocuments(clientName?: string): Promise<{ data: DocumentItem[]; fromBackend: boolean }> {
  try {
    const url = clientName
      ? `${API_BASE_URL}/documents?client=${encodeURIComponent(clientName)}`
      : `${API_BASE_URL}/documents`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data: DocumentItem[] = await res.json();
      saveLocalDocs(data);
      return { data, fromBackend: true };
    }
  } catch {}

  const all = getLocalDocs();
  if (clientName) {
    const filtered = all.filter((d) => d.client.toLowerCase().includes(clientName.toLowerCase()));
    return { data: filtered, fromBackend: false };
  }
  return { data: all, fromBackend: false };
}

export async function createDocument(
  payload: Omit<DocumentItem, 'id' | 'created_at'>
): Promise<{ data: DocumentItem; fromBackend: boolean }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const created: DocumentItem = await res.json();
      const current = getLocalDocs();
      saveLocalDocs([created, ...current]);
      return { data: created, fromBackend: true };
    }
  } catch {}

  // Offline fallback creation
  const offlineDoc: DocumentItem = {
    ...payload,
    id: `AKT-${Date.now().toString().slice(-6)}`,
    created_at: new Date().toISOString(),
  };
  const current = getLocalDocs();
  saveLocalDocs([offlineDoc, ...current]);

  const logs = getLocalLogs();
  const newLog: AuditLogItem = {
    id: `log-${Date.now()}`,
    action: 'Dokumen Baru Didaftarkan (Lokal)',
    detail: `${offlineDoc.title} · ${offlineDoc.client}`,
    tone: 'blue',
    timestamp: 'Baru saja',
    block_hash: offlineDoc.sha256_hash,
  };
  saveLocalLogs([newLog, ...logs]);

  return { data: offlineDoc, fromBackend: false };
}

// Client Requests API
export async function fetchClientRequests(clientName?: string): Promise<ClientRequestItem[]> {
  try {
    const url = clientName
      ? `${API_BASE_URL}/requests?client=${encodeURIComponent(clientName)}`
      : `${API_BASE_URL}/requests`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data: ClientRequestItem[] = await res.json();
      saveLocalRequests(data);
      return data;
    }
  } catch {}

  const all = getLocalRequests();
  if (clientName) {
    return all.filter((r) => r.client_name.toLowerCase().includes(clientName.toLowerCase()));
  }
  return all;
}

export async function createClientRequest(
  payload: Omit<ClientRequestItem, 'id' | 'status' | 'created_at'>
): Promise<ClientRequestItem> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${API_BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const created: ClientRequestItem = await res.json();
      const current = getLocalRequests();
      saveLocalRequests([created, ...current]);
      return created;
    }
  } catch {}

  const offlineReq: ClientRequestItem = {
    ...payload,
    id: `REQ-${Date.now().toString().slice(-5)}`,
    status: 'Menunggu Peninjauan',
    created_at: new Date().toISOString(),
  };
  const current = getLocalRequests();
  saveLocalRequests([offlineReq, ...current]);
  return offlineReq;
}

// Audit Logs
export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE_URL}/audit-logs`, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const logs: AuditLogItem[] = await res.json();
      saveLocalLogs(logs);
      return logs;
    }
  } catch {}

  return getLocalLogs();
}
