/**
 * Modul Utilitas Kriptografi ArsipNusa Notarial Vault
 * Mengimplementasikan:
 * 1. SHA-256 Hashing (Web Crypto API)
 * 2. Kriptografi Klasik (Vigenere Cipher)
 * 3. AES-256-GCM Asli (Web Crypto API + PBKDF2-SHA256)
 * 4. ChaCha20-Poly1305 Asli (RFC 8439 AEAD + PBKDF2-SHA256)
 * 5. Super Enkripsi (Kombinasi Bertingkat Vigenere Cipher + AES-256-GCM + SHA-256)
 * 6. Tanda Tangan Digital Asimetris ECDSA P-256 (Web Crypto API)
 * 7. Steganografi LSB (Least Significant Bit) pada HTML5 Canvas
 * 8. Chain of Title Blockchain (Proof-of-Work & Domino Cascade Verification)
 */

import type { BlockItem } from '../types';

const DEFAULT_AES_KEY = 'AES-NOTARIAL-SECRET-2025';
const PBKDF2_ITERATIONS = 10000;

// Helper konversi Byte <-> Base64 / Hex
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// ==========================================
// 1. HASHING (SHA-256)
// ==========================================
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(msgUint8));
  return bytesToHex(new Uint8Array(hashBuffer));
}

export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));
  return bytesToHex(new Uint8Array(hashBuffer));
}

// Password verification helper (default admin123 hash)
export async function verifyCredentials(
  user: string,
  pass: string
): Promise<{ success: boolean; hash: string }> {
  const hash = await sha256(pass);
  const validHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  const isValid = user.trim().toLowerCase() === 'admin' && hash === validHash;
  return { success: isValid, hash };
}

// ==========================================
// 2. KRIPTOGRAFI KLASIK (Vigenere Cipher)
// ==========================================
export function vigenereEncrypt(plaintext: string, key: string): string {
  if (!key) return plaintext;
  const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '') || 'NOTARIS';
  let result = '';
  let keyIndex = 0;

  for (let i = 0; i < plaintext.length; i++) {
    const char = plaintext[i];
    const code = char.charCodeAt(0);

    if (code >= 65 && code <= 90) {
      const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      result += String.fromCharCode(((code - 65 + shift) % 26) + 65);
      keyIndex++;
    } else if (code >= 97 && code <= 122) {
      const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      result += String.fromCharCode(((code - 97 + shift) % 26) + 97);
      keyIndex++;
    } else {
      result += char;
    }
  }
  return result;
}

export function vigenereDecrypt(ciphertext: string, key: string): string {
  if (!key) return ciphertext;
  const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '') || 'NOTARIS';
  let result = '';
  let keyIndex = 0;

  for (let i = 0; i < ciphertext.length; i++) {
    const char = ciphertext[i];
    const code = char.charCodeAt(0);

    if (code >= 65 && code <= 90) {
      const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      result += String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
      keyIndex++;
    } else if (code >= 97 && code <= 122) {
      const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      result += String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
      keyIndex++;
    } else {
      result += char;
    }
  }
  return result;
}

// ==========================================
// 3. PBKDF2 KEY DERIVATION & AES-256-GCM ASLI
// ==========================================
async function derivePbkdf2Bits(passphrase: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const rawKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(new TextEncoder().encode(passphrase || DEFAULT_AES_KEY)),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    rawKey,
    256
  );
}

async function deriveAes256GcmKey(
  passphrase: string,
  salt: Uint8Array,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(new TextEncoder().encode(passphrase || DEFAULT_AES_KEY)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
}

export async function aes256GcmEncryptBytes(
  plainBytes: Uint8Array,
  passphrase: string
): Promise<{
  envelope: string;
  saltB64: string;
  ivB64: string;
  ivHex: string;
  authTagHex: string;
  ciphertextBytes: Uint8Array;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAes256GcmKey(passphrase, salt, ['encrypt']);
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), tagLength: 128 },
    key,
    toArrayBuffer(plainBytes)
  );
  const combined = new Uint8Array(encryptedBuf);
  const tagBytes = combined.slice(Math.max(0, combined.length - 16));
  const saltB64 = bytesToBase64(salt);
  const ivB64 = bytesToBase64(iv);
  const cipherB64 = bytesToBase64(combined);
  return {
    envelope: `AESGCM1:${saltB64}:${ivB64}:${cipherB64}`,
    saltB64,
    ivB64,
    ivHex: bytesToHex(iv),
    authTagHex: bytesToHex(tagBytes),
    ciphertextBytes: combined,
  };
}

export async function aes256GcmDecryptBytes(
  envelope: string,
  passphrase: string
): Promise<Uint8Array> {
  const parts = envelope.trim().split(':');
  if (parts.length !== 4 || parts[0] !== 'AESGCM1') {
    throw new Error('Format ciphertext AES-256-GCM tidak valid.');
  }
  const salt = base64ToBytes(parts[1]);
  const iv = base64ToBytes(parts[2]);
  const combined = base64ToBytes(parts[3]);
  const key = await deriveAes256GcmKey(passphrase, salt, ['decrypt']);
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv), tagLength: 128 },
      key,
      toArrayBuffer(combined)
    );
    return new Uint8Array(plainBuf);
  } catch {
    throw new Error('Dekripsi AES-256-GCM gagal: kunci salah atau Authentication Tag GCM rusak!');
  }
}

export async function aes256GcmEncrypt(plaintext: string, passphrase: string): Promise<string> {
  const res = await aes256GcmEncryptBytes(new TextEncoder().encode(plaintext), passphrase);
  return res.envelope;
}

export async function aes256GcmDecrypt(envelope: string, passphrase: string): Promise<string> {
  const plainBytes = await aes256GcmDecryptBytes(envelope, passphrase);
  return new TextDecoder().decode(plainBytes);
}

// ==========================================
// 4. CHACHA20-POLY1305 ASLI (RFC 8439 AEAD)
// ==========================================
function rotl32(v: number, n: number): number {
  return ((v << n) | (v >>> (32 - n))) >>> 0;
}

function quarterRound(s: Uint32Array, a: number, b: number, c: number, d: number): void {
  s[a] = (s[a] + s[b]) >>> 0;
  s[d] = rotl32(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) >>> 0;
  s[b] = rotl32(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) >>> 0;
  s[d] = rotl32(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) >>> 0;
  s[b] = rotl32(s[b] ^ s[c], 7);
}

function readU32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>>
    0
  );
}

export function chacha20Block(key: Uint8Array, counter: number, nonce: Uint8Array): Uint8Array {
  if (key.length !== 32 || nonce.length !== 12) {
    throw new Error('ChaCha20 memerlukan key 32-byte dan nonce 12-byte.');
  }
  const initial = new Uint32Array(16);
  initial[0] = 0x61707865;
  initial[1] = 0x3320646e;
  initial[2] = 0x79622d32;
  initial[3] = 0x6b206574;
  for (let i = 0; i < 8; i++) {
    initial[4 + i] = readU32LE(key, i * 4);
  }
  initial[12] = counter >>> 0;
  initial[13] = readU32LE(nonce, 0);
  initial[14] = readU32LE(nonce, 4);
  initial[15] = readU32LE(nonce, 8);

  const working = new Uint32Array(initial);
  for (let i = 0; i < 10; i++) {
    quarterRound(working, 0, 4, 8, 12);
    quarterRound(working, 1, 5, 9, 13);
    quarterRound(working, 2, 6, 10, 14);
    quarterRound(working, 3, 7, 11, 15);
    quarterRound(working, 0, 5, 10, 15);
    quarterRound(working, 1, 6, 11, 12);
    quarterRound(working, 2, 7, 8, 13);
    quarterRound(working, 3, 4, 9, 14);
  }

  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) {
    const val = (working[i] + initial[i]) >>> 0;
    out[i * 4] = val & 0xff;
    out[i * 4 + 1] = (val >>> 8) & 0xff;
    out[i * 4 + 2] = (val >>> 16) & 0xff;
    out[i * 4 + 3] = (val >>> 24) & 0xff;
  }
  return out;
}

export function chacha20Xor(
  key: Uint8Array,
  counter: number,
  nonce: Uint8Array,
  input: Uint8Array
): Uint8Array {
  const out = new Uint8Array(input.length);
  for (let pos = 0, blockCounter = counter; pos < input.length; pos += 64, blockCounter++) {
    const keystream = chacha20Block(key, blockCounter, nonce);
    const limit = Math.min(64, input.length - pos);
    for (let i = 0; i < limit; i++) {
      out[pos + i] = input[pos + i] ^ keystream[i];
    }
  }
  return out;
}

function bytesToBigIntLE(bytes: Uint8Array): bigint {
  let acc = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    acc = (acc << 8n) | BigInt(bytes[i]);
  }
  return acc;
}

function writeU64LE(buf: Uint8Array, offset: number, val: number): void {
  let v = BigInt(val);
  for (let i = 0; i < 8; i++) {
    buf[offset + i] = Number(v & 0xffn);
    v >>= 8n;
  }
}

export function poly1305Mac(otk: Uint8Array, msg: Uint8Array): Uint8Array {
  const rBytes = new Uint8Array(otk.subarray(0, 16));
  rBytes[3] &= 15;
  rBytes[7] &= 15;
  rBytes[11] &= 15;
  rBytes[15] &= 15;
  rBytes[4] &= 252;
  rBytes[8] &= 252;
  rBytes[12] &= 252;

  const r = bytesToBigIntLE(rBytes);
  const s = bytesToBigIntLE(otk.subarray(16, 32));
  const p = (1n << 130n) - 5n;

  let acc = 0n;
  for (let i = 0; i < msg.length; i += 16) {
    const chunk = msg.subarray(i, Math.min(i + 16, msg.length));
    const n = bytesToBigIntLE(chunk) + (1n << BigInt(8 * chunk.length));
    acc = ((acc + n) * r) % p;
  }

  let tagVal = (acc + s) & ((1n << 128n) - 1n);
  const tag = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    tag[i] = Number(tagVal & 0xffn);
    tagVal >>= 8n;
  }
  return tag;
}

function buildPoly1305AeadData(aad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  const aadPad = (16 - (aad.length % 16)) % 16;
  const ctPad = (16 - (ciphertext.length % 16)) % 16;
  const out = new Uint8Array(aad.length + aadPad + ciphertext.length + ctPad + 16);
  out.set(aad, 0);
  out.set(ciphertext, aad.length + aadPad);
  writeU64LE(out, aad.length + aadPad + ciphertext.length + ctPad, aad.length);
  writeU64LE(out, aad.length + aadPad + ciphertext.length + ctPad + 8, ciphertext.length);
  return out;
}

export function chacha20Poly1305RawSeal(
  key32: Uint8Array,
  nonce12: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array = new Uint8Array(0)
): { ciphertext: Uint8Array; tag: Uint8Array } {
  const otk = chacha20Block(key32, 0, nonce12).subarray(0, 32);
  const ciphertext = chacha20Xor(key32, 1, nonce12, plaintext);
  const macData = buildPoly1305AeadData(aad, ciphertext);
  const tag = poly1305Mac(otk, macData);
  return { ciphertext, tag };
}

export function chacha20Poly1305RawOpen(
  key32: Uint8Array,
  nonce12: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad: Uint8Array = new Uint8Array(0)
): Uint8Array {
  const otk = chacha20Block(key32, 0, nonce12).subarray(0, 32);
  const macData = buildPoly1305AeadData(aad, ciphertext);
  const expectedTag = poly1305Mac(otk, macData);
  if (!constantTimeEqual(expectedTag, tag)) {
    throw new Error('Authentication Tag Poly1305 tidak cocok: kunci salah atau berkas dimodifikasi!');
  }
  return chacha20Xor(key32, 1, nonce12, ciphertext);
}

export async function chacha20Poly1305EncryptBytes(
  plainBytes: Uint8Array,
  passphrase: string
): Promise<{
  envelope: string;
  saltB64: string;
  nonceB64: string;
  ivHex: string;
  authTagHex: string;
  ciphertextBytes: Uint8Array;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const keyBits = await derivePbkdf2Bits(passphrase, salt);
  const key32 = new Uint8Array(keyBits);
  const { ciphertext, tag } = chacha20Poly1305RawSeal(key32, nonce, plainBytes);
  const saltB64 = bytesToBase64(salt);
  const nonceB64 = bytesToBase64(nonce);
  const cipherB64 = bytesToBase64(ciphertext);
  const tagB64 = bytesToBase64(tag);
  return {
    envelope: `CHACHA1:${saltB64}:${nonceB64}:${cipherB64}:${tagB64}`,
    saltB64,
    nonceB64,
    ivHex: bytesToHex(nonce),
    authTagHex: bytesToHex(tag),
    ciphertextBytes: ciphertext,
  };
}

export async function chacha20Poly1305DecryptBytes(
  envelope: string,
  passphrase: string
): Promise<Uint8Array> {
  const parts = envelope.trim().split(':');
  if (parts.length !== 5 || parts[0] !== 'CHACHA1') {
    throw new Error('Format ciphertext ChaCha20-Poly1305 tidak valid.');
  }
  const salt = base64ToBytes(parts[1]);
  const nonce = base64ToBytes(parts[2]);
  const ciphertext = base64ToBytes(parts[3]);
  const tag = base64ToBytes(parts[4]);
  const keyBits = await derivePbkdf2Bits(passphrase, salt);
  const key32 = new Uint8Array(keyBits);
  return chacha20Poly1305RawOpen(key32, nonce, ciphertext, tag);
}

export async function chacha20Poly1305Encrypt(
  plaintext: string,
  passphrase: string
): Promise<string> {
  const res = await chacha20Poly1305EncryptBytes(new TextEncoder().encode(plaintext), passphrase);
  return res.envelope;
}

export async function chacha20Poly1305Decrypt(
  envelope: string,
  passphrase: string
): Promise<string> {
  const plainBytes = await chacha20Poly1305DecryptBytes(envelope, passphrase);
  return new TextDecoder().decode(plainBytes);
}

// ==========================================
// 5. LEGACY STREAM CIPHER (Kompatibilitas Mundur)
// ==========================================
function generatePseudoKeystream(key: string, length: number): Uint8Array {
  const stream = new Uint8Array(length);
  let seed = 0;
  for (let i = 0; i < key.length; i++) {
    seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    stream[i] = (seed ^ (seed >>> 16)) & 0xff;
  }
  return stream;
}

export function modernStreamEncrypt(text: string, key: string): string {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const keystream = generatePseudoKeystream(key || DEFAULT_AES_KEY, textBytes.length);

  const cipherBytes = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    const rotated = ((textBytes[i] << 3) | (textBytes[i] >>> 5)) & 0xff;
    cipherBytes[i] = rotated ^ keystream[i];
  }

  let binary = '';
  for (let i = 0; i < cipherBytes.length; i++) {
    binary += String.fromCharCode(cipherBytes[i]);
  }
  return btoa(binary);
}

export function modernStreamDecrypt(base64Cipher: string, key: string): string {
  try {
    const binary = atob(base64Cipher);
    const cipherBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      cipherBytes[i] = binary.charCodeAt(i);
    }

    const keystream = generatePseudoKeystream(key || DEFAULT_AES_KEY, cipherBytes.length);
    const textBytes = new Uint8Array(cipherBytes.length);

    for (let i = 0; i < cipherBytes.length; i++) {
      const xored = cipherBytes[i] ^ keystream[i];
      const unrotated = ((xored >>> 3) | (xored << 5)) & 0xff;
      textBytes[i] = unrotated;
    }

    const decoder = new TextDecoder();
    return decoder.decode(textBytes);
  } catch {
    return '[Gagal Mendekripsi - Format tidak valid atau kunci salah]';
  }
}

// ==========================================
// 6. SUPER ENKRIPSI (Vigenere + AES-256-GCM Asli)
// ==========================================
export interface SuperEncryptionResult {
  plaintext: string;
  classicalCipher: string;
  modernCipher: string;
  hexDump: string;
  sha256Hash: string;
}

export async function superEncrypt(
  plaintext: string,
  classicalKey: string,
  modernKey: string
): Promise<SuperEncryptionResult> {
  // Tahap 1: Kriptografi Klasik Vigenere Cipher
  const classicalCipher = vigenereEncrypt(plaintext, classicalKey);

  // Tahap 2: Kriptografi Modern AES-256-GCM Asli (Web Crypto API)
  const modernCipher = await aes256GcmEncrypt(classicalCipher, modernKey);

  let hexDump = '';
  for (let i = 0; i < Math.min(modernCipher.length, 160); i++) {
    hexDump += modernCipher.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
  }
  hexDump = hexDump.trim() + (modernCipher.length > 160 ? ' ...' : '');

  const sha256Hash = await sha256(modernCipher);

  return {
    plaintext,
    classicalCipher,
    modernCipher,
    hexDump,
    sha256Hash,
  };
}

export async function superDecrypt(
  superCipher: string,
  classicalKey: string,
  modernKey: string
): Promise<{ intermediate: string; plaintext: string }> {
  const cleaned = superCipher.replace(/\s*\[Super-Encrypted\]\s*$/i, '').trim();
  let intermediate = '';
  if (cleaned.startsWith('AESGCM1:')) {
    intermediate = await aes256GcmDecrypt(cleaned, modernKey);
  } else {
    intermediate = modernStreamDecrypt(cleaned, modernKey);
  }

  const plaintext = vigenereDecrypt(intermediate, classicalKey);
  return { intermediate, plaintext };
}

// Helper Terpadu Enkripsi & Dekripsi Dokumen Notarial
export async function encryptDocumentPayload(
  plaintext: string,
  algorithm: string,
  modernKey: string,
  classicalKey = 'NOTARISNUSA'
): Promise<{ encryptedContent: string; sha256Hash: string }> {
  const key = modernKey || DEFAULT_AES_KEY;
  if (algorithm.includes('ChaCha20')) {
    const encryptedContent = await chacha20Poly1305Encrypt(plaintext, key);
    const sha256Hash = await sha256(encryptedContent);
    return { encryptedContent, sha256Hash };
  }
  if (algorithm.includes('Super-Encrypted') || algorithm.includes('Vigenere')) {
    const res = await superEncrypt(plaintext, classicalKey || 'NOTARISNUSA', key);
    return { encryptedContent: res.modernCipher, sha256Hash: res.sha256Hash };
  }
  const encryptedContent = await aes256GcmEncrypt(plaintext, key);
  const sha256Hash = await sha256(encryptedContent);
  return { encryptedContent, sha256Hash };
}

export async function decryptDocumentPayload(
  encryptedContent: string,
  algorithm: string,
  modernKey: string,
  classicalKey = 'NOTARISNUSA'
): Promise<{ plaintext: string; intermediate?: string; modeLabel: string }> {
  const cleaned = encryptedContent
    .replace(/\s*\[(Super-Encrypted|Encrypted with [^\]]+)\]\s*$/i, '')
    .trim();
  const key = modernKey || DEFAULT_AES_KEY;

  if (cleaned.startsWith('CHACHA1:')) {
    const plaintext = await chacha20Poly1305Decrypt(cleaned, key);
    return { plaintext, modeLabel: 'ChaCha20-Poly1305 (RFC 8439 AEAD Verified)' };
  }

  if (cleaned.startsWith('AESGCM1:')) {
    if (algorithm.includes('Super-Encrypted') || algorithm.includes('Vigenere')) {
      const res = await superDecrypt(cleaned, classicalKey || 'NOTARISNUSA', key);
      return {
        plaintext: res.plaintext,
        intermediate: res.intermediate,
        modeLabel: 'Super Enkripsi (AES-256-GCM + Vigenère Verified)',
      };
    }
    const plaintext = await aes256GcmDecrypt(cleaned, key);
    return { plaintext, modeLabel: 'AES-256-GCM (NIST SP 800-38D Verified)' };
  }

  // Fallback legacy base64 stream cipher
  if (algorithm.includes('Super-Encrypted') || algorithm.includes('Vigenere')) {
    const intermediate = modernStreamDecrypt(cleaned, key);
    const plaintext = vigenereDecrypt(intermediate, classicalKey || 'NOTARISNUSA');
    return { plaintext, intermediate, modeLabel: 'Legacy Super Stream' };
  }
  const plaintext = modernStreamDecrypt(cleaned, key);
  return { plaintext, modeLabel: 'Legacy Stream Cipher' };
}

// ==========================================
// 7. TANDA TANGAN DIGITAL ASIMETRIS (ECDSA P-256)
// ==========================================
export async function signPayloadECDSA(
  actorKeyId: string,
  message: string
): Promise<{ signatureHex: string; publicKeyJson: string }> {
  const storageKey = `arsipnusa_ecdsa_key_${actorKeyId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
  let privateKey: CryptoKey | null = null;
  let publicKeyJson = '';

  if (typeof localStorage !== 'undefined') {
    try {
      const rawStored = localStorage.getItem(storageKey);
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        privateKey = await crypto.subtle.importKey(
          'jwk',
          parsed.privateJwk,
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['sign']
        );
        publicKeyJson = JSON.stringify(parsed.publicJwk);
      }
    } catch {
      privateKey = null;
    }
  }

  if (!privateKey) {
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    publicKeyJson = JSON.stringify(publicJwk);
    privateKey = pair.privateKey;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ privateJwk, publicJwk }));
      } catch {
        // ignore storage quota errors
      }
    }
  }

  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    toArrayBuffer(new TextEncoder().encode(message))
  );
  return {
    signatureHex: bytesToHex(new Uint8Array(sigBuffer)),
    publicKeyJson,
  };
}

export async function verifyPayloadECDSA(
  message: string,
  signatureHex: string,
  publicKeyJson: string
): Promise<boolean> {
  try {
    const publicJwk = JSON.parse(publicKeyJson);
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      toArrayBuffer(hexToBytes(signatureHex)),
      toArrayBuffer(new TextEncoder().encode(message))
    );
  } catch {
    return false;
  }
}

// ==========================================
// 8. STEGANOGRAFI (LSB pada HTML5 Canvas)
// ==========================================
export function encodeLSB(canvas: HTMLCanvasElement, secretMessage: string): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(secretMessage);
  const msgLen = msgBytes.length;

  const totalBitsNeeded = (4 + msgLen) * 8;
  const maxBitsAvailable = (data.length / 4) * 3;

  if (totalBitsNeeded > maxBitsAvailable) {
    throw new Error(
      `Pesan terlalu panjang! Kapasitas piksel gambar ini: ${Math.floor(maxBitsAvailable / 8)} byte, ukuran pesan: ${msgLen} byte.`
    );
  }

  const fullBytes = new Uint8Array(4 + msgLen);
  fullBytes[0] = (msgLen >>> 24) & 0xff;
  fullBytes[1] = (msgLen >>> 16) & 0xff;
  fullBytes[2] = (msgLen >>> 8) & 0xff;
  fullBytes[3] = msgLen & 0xff;
  fullBytes.set(msgBytes, 4);

  let bitIdx = 0;
  const totalBits = fullBytes.length * 8;

  for (let i = 0; i < data.length && bitIdx < totalBits; i += 4) {
    for (let c = 0; c < 3 && bitIdx < totalBits; c++) {
      const bytePos = Math.floor(bitIdx / 8);
      const bitPos = 7 - (bitIdx % 8);
      const bitValue = (fullBytes[bytePos] >>> bitPos) & 1;

      data[i + c] = (data[i + c] & ~1) | bitValue;
      bitIdx++;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function decodeLSB(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let bitIdx = 0;
  let lengthBits = 0;
  for (let i = 0; i < data.length && bitIdx < 32; i += 4) {
    for (let c = 0; c < 3 && bitIdx < 32; c++) {
      const bit = data[i + c] & 1;
      lengthBits = (lengthBits << 1) | bit;
      bitIdx++;
    }
  }

  const msgLen = lengthBits >>> 0;
  if (msgLen <= 0 || msgLen > 500000) {
    throw new Error('Tidak ditemukan metadata steganografi atau format data rusak.');
  }

  const msgBytes = new Uint8Array(msgLen);
  const totalBitsToRead = 32 + msgLen * 8;

  for (let i = 0; i < data.length && bitIdx < totalBitsToRead; i += 4) {
    for (let c = 0; c < 3 && bitIdx < totalBitsToRead; c++) {
      const bit = data[i + c] & 1;
      const targetBitIdx = bitIdx - 32;
      const bytePos = Math.floor(targetBitIdx / 8);
      const bitPos = 7 - (targetBitIdx % 8);

      msgBytes[bytePos] |= bit << bitPos;
      bitIdx++;
    }
  }

  const decoder = new TextDecoder();
  return decoder.decode(msgBytes);
}

// ==========================================
// 9. CHAIN OF TITLE (Blockchain PoW & Domino Cascade Verification)
// ==========================================
export const POW_PREFIX = '00';

export async function calculateBlockHash(
  index: number,
  previousHash: string,
  timestamp: string,
  dataHash: string,
  nonce: number
): Promise<string> {
  const blockString = `${index}|${previousHash}|${timestamp}|${dataHash}|${nonce}`;
  return await sha256(blockString);
}

export async function mineBlockWithPoW(
  index: number,
  previousHash: string,
  timestamp: string,
  dataHash: string,
  prefix = POW_PREFIX
): Promise<{ nonce: number; hash: string }> {
  let nonce = 0;
  while (nonce < 50000) {
    const hash = await calculateBlockHash(index, previousHash, timestamp, dataHash, nonce);
    if (hash.startsWith(prefix)) {
      return { nonce, hash };
    }
    nonce++;
  }
  const fallbackHash = await calculateBlockHash(index, previousHash, timestamp, dataHash, nonce);
  return { nonce, hash: fallbackHash };
}

export interface ChainValidationResult {
  isValid: boolean;
  brokenIndex?: number;
  invalidIndices: number[];
  blockReasons: Record<number, string>;
  reason?: string;
}

export async function verifyChainIntegrity(
  blocks: BlockItem[],
  tamperedIndices: number[] = []
): Promise<ChainValidationResult> {
  const invalidIndices: number[] = [];
  const blockReasons: Record<number, string> = {};
  let firstBrokenIndex: number | undefined;
  let expectedPrevHash =
    blocks.length > 0
      ? blocks[0].previousHash
      : '0000000000000000000000000000000000000000000000000000000000000000';
  let chainCompromised = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    const localRecalculatedHash = await calculateBlockHash(
      block.index,
      block.previousHash,
      block.timestamp,
      block.dataHash,
      block.nonce
    );

    const cascadedHash =
      i === 0
        ? localRecalculatedHash
        : await calculateBlockHash(
            block.index,
            expectedPrevHash,
            block.timestamp,
            block.dataHash,
            block.nonce
          );

    const prevLinkMismatch =
      i > 0 &&
      (block.previousHash !== blocks[i - 1].hash || block.previousHash !== expectedPrevHash);
    const localHashMismatch = localRecalculatedHash !== block.hash;
    const cascadeHashMismatch = cascadedHash !== block.hash;
    const powBroken = !block.hash.startsWith(POW_PREFIX);
    const explicitlyTampered = tamperedIndices.includes(block.index);

    if (
      chainCompromised ||
      prevLinkMismatch ||
      localHashMismatch ||
      cascadeHashMismatch ||
      powBroken ||
      explicitlyTampered
    ) {
      if (firstBrokenIndex === undefined) {
        firstBrokenIndex = block.index;
      }
      invalidIndices.push(block.index);

      if (explicitlyTampered && !localHashMismatch) {
        blockReasons[block.index] = powBroken
          ? `Payload Block #${block.index} diubah & syarat PoW (${POW_PREFIX}...) tidak terpenuhi.`
          : `Payload Block #${block.index} diubah dengan hitung-ulang hash lokal — memutus seluruh blok hilir!`;
      } else if (localHashMismatch) {
        blockReasons[block.index] = `Hash Block #${block.index} (${block.hash.slice(
          0,
          10
        )}...) tidak cocok dengan payload data (${localRecalculatedHash.slice(0, 10)}...).`;
      } else if (prevLinkMismatch) {
        blockReasons[block.index] = `Efek Domino: Previous Hash Block #${block.index} tidak cocok dengan hash autentik Block #${block.index - 1}.`;
      } else if (powBroken) {
        blockReasons[block.index] = `Proof-of-Work tidak sah: Hash Block #${block.index} tidak diawali "${POW_PREFIX}".`;
      } else {
        blockReasons[block.index] = `Efek Domino: Rantai dari Block #${firstBrokenIndex} terkompromi sehingga Block #${block.index} ikut tidak valid.`;
      }

      chainCompromised = true;
    }

    // Propagate true recalculated hash down the chain so all downstream blocks fail cascade validation
    expectedPrevHash = cascadedHash;
  }

  if (invalidIndices.length > 0 && firstBrokenIndex !== undefined) {
    const lastIdx = invalidIndices[invalidIndices.length - 1];
    const startLabel = `#${firstBrokenIndex.toString().padStart(3, '0')}`;
    const endLabel = `#${lastIdx.toString().padStart(3, '0')}`;
    const rangeDesc =
      invalidIndices.length > 1
        ? `Block ${startLabel} s/d ${endLabel} (${invalidIndices.length} blok)`
        : `Block ${startLabel}`;

    return {
      isValid: false,
      brokenIndex: firstBrokenIndex,
      invalidIndices,
      blockReasons,
      reason: `Manipulasi terdeteksi sejak Block ${startLabel}! Akibat efek domino rantai SHA-256, ${rangeDesc} dinyatakan TIDAK VALID.`,
    };
  }

  return {
    isValid: true,
    invalidIndices: [],
    blockReasons: {},
  };
}

// Saluran Terenkripsi Catatan Permintaan Klien -> Notaris (AES-256-GCM)
const REQUEST_CHANNEL_KEY = 'ARSIPNUSA-REQ-CHANNEL-2025';

export async function encryptRequestNotes(notes: string): Promise<string> {
  const trimmed = notes.trim();
  if (!trimmed) return '';
  return await aes256GcmEncrypt(trimmed, REQUEST_CHANNEL_KEY);
}

export async function decryptRequestNotes(notes: string): Promise<string> {
  if (!notes) return '';
  if (!notes.startsWith('AESGCM1:')) return notes;
  try {
    return await aes256GcmDecrypt(notes, REQUEST_CHANNEL_KEY);
  } catch {
    return '[Catatan terenkripsi AES-256-GCM]';
  }
}
