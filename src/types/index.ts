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
}

export interface UserSession {
  username: string;
  displayName: string;
  role: 'admin' | 'client';
  loginTime: string;
  isDongleConnected: boolean;
  token: string;
  nik?: string;
  email?: string;
  phone?: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  name: string;
  role?: 'admin' | 'client';
  nik?: string;
  email?: string;
  phone?: string;
}

export interface ClientRequestItem {
  id: string;
  client_name: string;
  title: string;
  category: string;
  notes: string;
  status: 'Menunggu Peninjauan' | 'Sedang Diproses' | 'Selesai & Tersegel';
  created_at: string;
}
