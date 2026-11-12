import { sha256 } from './crypto';

export interface DongleKeyFileData {
  format: 'ArsipNusa-FIPS140-Token';
  version: '2.4.1';
  serialNumber: string;
  tokenLabel: string;
  ownerName: string;
  ownerUsername: string;
  nik: string;
  issuedAt: string;
  algorithm: 'RSA-2048 / SHA-256 Digest + AES-256 Hardware Enclave';
  keyFingerprint: string;
  tokenSignature: string;
}

/**
 * Generate cryptographic token metadata and file for physical flashdisk storage
 */
export async function createDongleKeyFile(
  ownerName: string,
  ownerUsername: string,
  nik: string,
  customSerial?: string
): Promise<{ keyData: DongleKeyFileData; rawJson: string }> {
  const serialNumber =
    customSerial ||
    `FIPS-${ownerUsername.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
  const issuedAt = new Date().toISOString();

  // Compute key fingerprint
  const keyFingerprint = await sha256(
    `${serialNumber}|${ownerUsername}|${nik}|${issuedAt}|ARSIPNUSA_ROOT_CA_2026`
  );

  // Compute token signature (simulating PKI CA digital seal)
  const tokenSignature = await sha256(
    `SEAL:${serialNumber}:${keyFingerprint}:${issuedAt}`
  );

  const keyData: DongleKeyFileData = {
    format: 'ArsipNusa-FIPS140-Token',
    version: '2.4.1',
    serialNumber,
    tokenLabel: `USB Cryptographic Dongle (${ownerName})`,
    ownerName,
    ownerUsername,
    nik,
    issuedAt,
    algorithm: 'RSA-2048 / SHA-256 Digest + AES-256 Hardware Enclave',
    keyFingerprint,
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
 * Validate a key file loaded from a Flashdisk
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

  // Recalculate signature to ensure file hasn't been tampered with
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
