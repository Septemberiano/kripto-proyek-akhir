export type DocumentType =
  | 'Sertifikat Tanah'
  | 'Surat Wasiat'
  | 'Kepemilikan Saham'
  | 'Akta Notaris'
  | 'Perjanjian Bisnis';

export type EncryptionAlgorithm =
  | 'AES-256-GCM'
  | 'ChaCha20-Poly1305'
  | 'Super-Encrypted (Vigenere + AES)';

export interface DocumentItem {
  id: string;
  title: string;
  client: string;
  type: DocumentType | string;
  value: string;
  status: 'Terverifikasi' | 'Menunggu tanda tangan' | 'Dalam peninjauan';
  encrypted_content: string;
  algorithm: EncryptionAlgorithm | string;
  sha256_hash: string;
  created_at: string;
  client_signed_by?: string;
  client_signed_at?: string;
  client_signature_hash?: string;
  client_public_key?: string;
  notary_signed_by?: string;
  notary_signed_at?: string;
  notary_signature_hash?: string;
  notary_public_key?: string;
  notary_auth_method?: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  detail: string;
  tone: 'green' | 'amber' | 'blue' | 'wine';
  timestamp: string;
  block_hash?: string;
}

export interface BlockItem {
  index: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  dataHash: string;
  data: {
    documentId: string;
    title: string;
    client: string;
    type: string;
  };
  nonce: number;
}

export interface ClientItem {
  id: string;
  name: string;
  nik: string;
  email: string;
  phone: string;
  address: string;
  documentsCount: number;
  verified: boolean;
  registeredDate: string;
}

export interface EncryptedFileInfo {
  id: string;
  fileName: string;
  originalSize: string;
  encryptedSize: string;
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  ivNonce: string;
  authTag: string;
  sha256: string;
  timestamp: string;
  status: 'Terenkripsi & Tersegel' | 'Menunggu Validasi';
  description: string;
  envelope?: string;
  originalName?: string;
}

export type UserRole = 'superadmin' | 'admin' | 'client';

export interface UserSession {
  username: string;
  displayName: string;
  role: UserRole;
  loginTime: string;
  isDongleConnected: boolean;
  token: string;
  nik?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  face_descriptor?: string;
}

export interface UserItem {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  nik?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  face_descriptor?: string;
  kyc_verified?: number | boolean;
  created_at: string;
}

export interface SystemStats {
  users: {
    total: number;
    superadmin: number;
    admin: number;
    client: number;
  };
  documents: {
    total: number;
    verified: number;
    pending: number;
    review: number;
  };
  auditLogsCount: number;
  clientRequestsCount: number;
  databaseSizeKb: number;
  databaseStatus: string;
  timestamp: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  name: string;
  role?: UserRole;
  nik?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  face_descriptor?: string;
}

export interface ClientRequestItem {
  id: string;
  client_name: string;
  title: string;
  category: string;
  notes: string;
  status:
    | 'Menunggu Peninjauan'
    | 'Sedang Diproses'
    | 'Menunggu TTD Klien'
    | 'Menunggu Pengesahan Notaris'
    | 'Selesai & Tersegel'
    | 'Ditolak';
  created_at: string;
  notary_notes?: string;
  document_id?: string;
}

export interface SecurityTokenItem {
  id: string;
  owner_username: string;
  serial_number: string;
  token_label: string;
  public_key_hash: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  created_at: string;
  revoked_at?: string | null;
  revoked_reason?: string | null;
}
