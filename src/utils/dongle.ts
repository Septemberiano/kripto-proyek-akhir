import { sha256, bytesToHex, hexToBytes } from './crypto';

export interface DongleKeyFileData {
  format: 'ArsipNusa-FIPS140-Token';
  version: '2.5.0' | '2.4.1';
  serialNumber: string;
  tokenLabel: string;
  ownerName: string;
  ownerUsername: string;
  nik: string;
  issuedAt: string;
  algorithm: string;
  keyFingerprint: string;
  publicKeyJwk?: JsonWebKey;
  tokenSignature: string;
}

function getCanonicalTokenPayload(data: {
  serialNumber: string;
  ownerUsername: string;
  nik: string;
  issuedAt: string;
  keyFingerprint: string;
}): string {
  return `ARSIPNUSA_TOKEN|${data.serialNumber}|${data.ownerUsername}|${data.nik}|${data.issuedAt}|${data.keyFingerprint}`;
}

/**
 * Generate cryptographic token metadata (ECDSA P-256 + SHA-256) and file for physical flashdisk storage
 */
export async function createDongleKeyFile(
  ownerName: string,
  ownerUsername: string,
  nik: string,
  customSerial?: string
): Promise<{ keyData: DongleKeyFileData; rawJson: string }> {
  const randomBytes = crypto.getRandomValues(new Uint16Array(1));
  const serialSuffix = 1000 + (randomBytes[0] % 9000);
  const serialNumber =
    customSerial ||
    `FIPS-${ownerUsername.toUpperCase()}-${new Date().getFullYear()}-${serialSuffix}`;
  const issuedAt = new Date().toISOString();

  // Generate asymmetric ECDSA P-256 keypair inside Web Crypto
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const keyFingerprint = await sha256(JSON.stringify(publicKeyJwk));

  const canonical = getCanonicalTokenPayload({
    serialNumber,
    ownerUsername,
    nik,
    issuedAt,
    keyFingerprint,
  });
  const encodedMsg = new TextEncoder().encode(canonical);
  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair.privateKey,
    encodedMsg
  );
  const tokenSignature = bytesToHex(new Uint8Array(sigBuf));

  const keyData: DongleKeyFileData = {
    format: 'ArsipNusa-FIPS140-Token',
    version: '2.5.0',
    serialNumber,
    tokenLabel: `USB Cryptographic Dongle (${ownerName})`,
    ownerName,
    ownerUsername,
    nik,
    issuedAt,
    algorithm: 'ECDSA P-256 Asymmetric Signature + SHA-256 Public Key Fingerprint',
    keyFingerprint,
    publicKeyJwk,
    tokenSignature,
  };

  const rawJson = JSON.stringify(keyData, null, 2);
  return { keyData, rawJson };
}

/**
 * Download key file to the client machine so user can save it to their Flashdisk
 */
export function downloadKeyFileToFlashdisk(
  filename: string,
  content: string
): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate a key file loaded from a Flashdisk (verifies ECDSA P-256 signature & key fingerprint)
 */
export async function verifyDongleKeyFile(
  parsedData: any
): Promise<{ isValid: boolean; error?: string; token?: DongleKeyFileData }> {
  if (
    !parsedData ||
    parsedData.format !== 'ArsipNusa-FIPS140-Token' ||
    !parsedData.serialNumber ||
    !parsedData.keyFingerprint ||
    !parsedData.tokenSignature
  ) {
    return {
      isValid: false,
      error: 'Berkas tidak sesuai dengan format kunci USB Dongle ArsipNusa yang sah.',
    };
  }

  // Verify ECDSA P-256 signature for v2.5.0 tokens
  if (parsedData.publicKeyJwk) {
    try {
      const expectedFingerprint = await sha256(JSON.stringify(parsedData.publicKeyJwk));
      if (expectedFingerprint !== parsedData.keyFingerprint) {
        return {
          isValid: false,
          error: 'Fingerprint kunci publik ECDSA pada berkas dongle tidak cocok (terindikasi manipulasi)!',
        };
      }
      const pubKey = await crypto.subtle.importKey(
        'jwk',
        parsedData.publicKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );
      const canonical = getCanonicalTokenPayload({
        serialNumber: parsedData.serialNumber,
        ownerUsername: parsedData.ownerUsername || '',
        nik: parsedData.nik || '',
        issuedAt: parsedData.issuedAt || '',
        keyFingerprint: parsedData.keyFingerprint,
      });
      const sigBytes = hexToBytes(parsedData.tokenSignature);
      const msgBytes = new TextEncoder().encode(canonical);
      const isVerified = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        pubKey,
        sigBytes.buffer as ArrayBuffer,
        msgBytes
      );
      if (!isVerified) {
        return {
          isValid: false,
          error: 'Verifikasi tanda tangan asimetris ECDSA P-256 gagal! Berkas kunci dimodifikasi secara ilegal.',
        };
      }
      return {
        isValid: true,
        token: parsedData as DongleKeyFileData,
      };
    } catch {
      return {
        isValid: false,
        error: 'Struktur kunci publik atau tanda tangan ECDSA P-256 rusak!',
      };
    }
  }

  // Legacy v2.4.1 SHA-256 token seal verification fallback
  const expectedSignature = await sha256(
    `SEAL:${parsedData.serialNumber}:${parsedData.keyFingerprint}:${parsedData.issuedAt}`
  );

  if (expectedSignature !== parsedData.tokenSignature) {
    return {
      isValid: false,
      error: 'Tanda tangan digital berkas kunci rusak atau telah dimodifikasi secara ilegal!',
    };
  }

  return {
    isValid: true,
    token: parsedData as DongleKeyFileData,
  };
}
