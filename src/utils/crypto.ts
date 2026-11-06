/**
 * Modul Utilitas Kriptografi Notarial Vault
 * Mengimplementasikan:
 * 1. SHA-256 Hashing (Web Crypto API)
 * 2. Super Enkripsi (Kombinasi Klasik Vigenere & Modern AES-Like Stream)
 * 3. Steganografi LSB (Least Significant Bit) pada HTML5 Canvas
 * 4. Chain of Title (Validasi Blok Rantai / Blockchain)
 */

import type { BlockItem } from '../types';

// ==========================================
// 1. HASHING (SHA-256)
// ==========================================
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Password verification helper (default admin123 hash)
export async function verifyCredentials(
  user: string,
  pass: string
): Promise<{ success: boolean; hash: string }> {
  const hash = await sha256(pass);
  // Hash of "admin123":
  // 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
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

    // Uppercase A-Z
    if (code >= 65 && code <= 90) {
      const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      result += String.fromCharCode(((code - 65 + shift) % 26) + 65);
      keyIndex++;
    }
    // Lowercase a-z
    else if (code >= 97 && code <= 122) {
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
// 3. KRIPTOGRAFI MODERN (AES-like Stream / S-Box)
// ==========================================
function generatePseudoKeystream(key: string, length: number): Uint8Array {
  const stream = new Uint8Array(length);
  let seed = 0;
  for (let i = 0; i < key.length; i++) {
    seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < length; i++) {
    // S-box pseudo transformation
    seed = (seed * 1103515245 + 12345) >>> 0;
    stream[i] = (seed ^ (seed >>> 16)) & 0xff;
  }
  return stream;
}

export function modernStreamEncrypt(text: string, key: string): string {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const keystream = generatePseudoKeystream(key || 'AES-NOTARIAL-SECRET-2025', textBytes.length);

  const cipherBytes = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    // Substitution + XOR
    const rotated = ((textBytes[i] << 3) | (textBytes[i] >>> 5)) & 0xff;
    cipherBytes[i] = rotated ^ keystream[i];
  }

  // Convert to Base64
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

    const keystream = generatePseudoKeystream(key || 'AES-NOTARIAL-SECRET-2025', cipherBytes.length);
    const textBytes = new Uint8Array(cipherBytes.length);

    for (let i = 0; i < cipherBytes.length; i++) {
      const xored = cipherBytes[i] ^ keystream[i];
      // Reverse bitwise rotation
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
// 4. SUPER ENKRIPSI (Vigenere + Modern AES)
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
  // Step 1: Classical Vigenere Cipher
  const classicalCipher = vigenereEncrypt(plaintext, classicalKey);

  // Step 2: Modern AES-like Stream Cipher
  const modernCipher = modernStreamEncrypt(classicalCipher, modernKey);

  // Hex dump representation
  let hexDump = '';
  for (let i = 0; i < modernCipher.length; i++) {
    hexDump += modernCipher.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
  }
  hexDump = hexDump.trim();

  // Compute final hash
  const sha256Hash = await sha256(modernCipher);

  return {
    plaintext,
    classicalCipher,
    modernCipher,
    hexDump,
    sha256Hash,
  };
}

export function superDecrypt(
  superCipher: string,
  classicalKey: string,
  modernKey: string
): { intermediate: string; plaintext: string } {
  // Step 1: Revert Modern Stream Cipher
  const intermediate = modernStreamDecrypt(superCipher, modernKey);

  // Step 2: Revert Classical Vigenere Cipher
  const plaintext = vigenereDecrypt(intermediate, classicalKey);

  return { intermediate, plaintext };
}

// ==========================================
// 5. STEGANOGRAFI (LSB pada HTML5 Canvas)
// ==========================================
export function encodeLSB(canvas: HTMLCanvasElement, secretMessage: string): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert secret message to UTF-8 Uint8Array
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(secretMessage);
  const msgLen = msgBytes.length;

  // Header 32-bit integer for length (4 bytes = 32 bits)
  const totalBitsNeeded = (4 + msgLen) * 8;
  const maxBitsAvailable = (data.length / 4) * 3; // use R, G, B channels

  if (totalBitsNeeded > maxBitsAvailable) {
    throw new Error(
      `Pesan terlalu panjang! Kapasitas piksel gambar ini: ${Math.floor(maxBitsAvailable / 8)} byte, ukuran pesan: ${msgLen} byte.`
    );
  }

  // Combine length header + message bytes
  const fullBytes = new Uint8Array(4 + msgLen);
  fullBytes[0] = (msgLen >>> 24) & 0xff;
  fullBytes[1] = (msgLen >>> 16) & 0xff;
  fullBytes[2] = (msgLen >>> 8) & 0xff;
  fullBytes[3] = msgLen & 0xff;
  fullBytes.set(msgBytes, 4);

  let bitIdx = 0;
  const totalBits = fullBytes.length * 8;

  for (let i = 0; i < data.length && bitIdx < totalBits; i += 4) {
    // Process R, G, B channels (leave Alpha untouched)
    for (let c = 0; c < 3 && bitIdx < totalBits; c++) {
      const bytePos = Math.floor(bitIdx / 8);
      const bitPos = 7 - (bitIdx % 8);
      const bitValue = (fullBytes[bytePos] >>> bitPos) & 1;

      // Replace LSB
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

  // Extract 32-bit length header
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
// 6. CHAIN OF TITLE (Blockchain)
// ==========================================
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

export async function verifyChainIntegrity(
  blocks: BlockItem[]
): Promise<{ isValid: boolean; brokenIndex?: number; reason?: string }> {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Verify Previous Hash link
    if (i > 0) {
      const prevBlock = blocks[i - 1];
      if (block.previousHash !== prevBlock.hash) {
        return {
          isValid: false,
          brokenIndex: i,
          reason: `Previous hash di Block #${i} tidak sesuai dengan Hash Block #${i - 1}! Terdeteksi manipulasi rantai.`,
        };
      }
    }

    // Verify recalculation of current block's hash
    const expectedHash = await calculateBlockHash(
      block.index,
      block.previousHash,
      block.timestamp,
      block.dataHash,
      block.nonce
    );

    if (expectedHash !== block.hash) {
      return {
        isValid: false,
        brokenIndex: i,
        reason: `Hash Block #${i} (${block.hash.slice(0, 10)}...) tidak cocok dengan payload data (${expectedHash.slice(0, 10)}...)! Integritas blok terkompromi.`,
      };
    }
  }

  return { isValid: true };
}
