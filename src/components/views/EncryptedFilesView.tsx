import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Download,
  Upload,
  CheckCircle2,
  FileText,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { EncryptedFileInfo } from '../../types';
import {
  sha256,
  bytesToHex,
  aes256GcmEncryptBytes,
  aes256GcmDecryptBytes,
  chacha20Poly1305EncryptBytes,
  chacha20Poly1305DecryptBytes,
} from '../../utils/crypto';

export const EncryptedFilesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [fileList, setFileList] = useState<EncryptedFileInfo[]>([
    {
      id: 'ENC-001',
      fileName: 'Akta_Wasiat_Keluarga_Hartono_2025.pdf.enc',
      originalName: 'Akta_Wasiat_Keluarga_Hartono_2025.pdf',
      originalSize: '2.4 MB',
      encryptedSize: '2.42 MB',
      algorithm: 'AES-256-GCM',
      ivNonce: '7f9a2b4c10de58fa718293ab',
      authTag: 'e4d8a1c93b7f5201',
      sha256: 'a78f24b0789d2c20a67e9f3b1456ca01ef2b8901cb4d8e90a5b6c7d8e9f01234',
      timestamp: '24 Jun 2025, 14:20 WIB',
      status: 'Terenkripsi & Tersegel',
      description: 'Wasiat rahasia berkategori Aset Keluarga. Enkripsi Galois/Counter Mode (GCM).',
    },
    {
      id: 'ENC-002',
      fileName: 'SHM_01428_Kavling_Menteng_Signed.pdf.enc',
      originalName: 'SHM_01428_Kavling_Menteng_Signed.pdf',
      originalSize: '4.8 MB',
      encryptedSize: '4.83 MB',
      algorithm: 'ChaCha20-Poly1305',
      ivNonce: '9012345678abcdef12345678',
      authTag: '8c91f0347ab5d201',
      sha256: '3e94b7c12f08a99476bdf23485743bcae7102837461829405627192837465012',
      timestamp: '23 Jun 2025, 16:45 WIB',
      status: 'Terenkripsi & Tersegel',
      description: 'Sertifikat tanah resmi Kantor Pertanahan Jakarta Pusat. Stream Cipher ChaCha20.',
    },
    {
      id: 'ENC-003',
      fileName: 'SK_Kemenkumham_PT_Arunika_Persada.pdf.enc',
      originalName: 'SK_Kemenkumham_PT_Arunika_Persada.pdf',
      originalSize: '1.7 MB',
      encryptedSize: '1.71 MB',
      algorithm: 'AES-256-GCM',
      ivNonce: 'a1b2c3d4e5f60718293a4b5c',
      authTag: 'f902847c1b4e9a5d',
      sha256: '9c52b83748291048572019384756102938475610293847561029384756102938',
      timestamp: '22 Jun 2025, 10:15 WIB',
      status: 'Terenkripsi & Tersegel',
      description: 'Pengesahan akta pendirian perseroan terbatas dengan 256-bit security key.',
    },
    {
      id: 'ENC-004',
      fileName: 'HGB_00991_Gudang_Logistik_Cikarang.pdf.enc',
      originalName: 'HGB_00991_Gudang_Logistik_Cikarang.pdf',
      originalSize: '3.6 MB',
      encryptedSize: '3.62 MB',
      algorithm: 'ChaCha20-Poly1305',
      ivNonce: 'e5f6a1b2c3d4567890abcdef',
      authTag: '1234a5b6c7d8e9f0',
      sha256: 'f47ac10b58cc4372a5670e02b2c3d479a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d',
      timestamp: '20 Jun 2025, 09:30 WIB',
      status: 'Menunggu Validasi',
      description: 'Hak Guna Bangunan kawasan industri berikat Cikarang Barat — menunggu validasi segel.',
    },
  ]);

  // Real binary encryption state
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [selectedSimFile, setSelectedSimFile] = useState('Akta_Perjanjian_Komersial_2025.pdf');
  const [simAlgorithm, setSimAlgorithm] = useState<'AES-256-GCM' | 'ChaCha20-Poly1305'>('AES-256-GCM');
  const [simKey, setSimKey] = useState('d3f8a02c5e7b194a6012c8b7e45a901f6871234509abcdef1234567890abcdef');
  const [markPendingValidation, setMarkPendingValidation] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [recentEncrypted, setRecentEncrypted] = useState<EncryptedFileInfo | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Real .enc decryption state
  const [encUploadJson, setEncUploadJson] = useState('');
  const [decKey, setDecKey] = useState('d3f8a02c5e7b194a6012c8b7e45a901f6871234509abcdef1234567890abcdef');
  const [decryptedBlobUrl, setDecryptedBlobUrl] = useState<string | null>(null);
  const [decryptedFileName, setDecryptedFileName] = useState('');
  const [decryptedPreviewText, setDecryptedPreviewText] = useState('');
  const [decError, setDecError] = useState('');
  const [decVerifiedHash, setDecVerifiedHash] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const generateRandomHex = (length: number) => {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes).slice(0, length);
  };

  const formatBytes = (byteLength: number) => {
    if (byteLength < 1024) return `${byteLength} B`;
    if (byteLength < 1024 * 1024) return `${(byteLength / 1024).toFixed(1)} KB`;
    return `${(byteLength / (1024 * 1024)).toFixed(2)} MB`;
  };

  const downloadEncArtifact = (item: EncryptedFileInfo) => {
    const payloadStr = item.envelope
      ? JSON.stringify(
          {
            format: 'ArsipNusa-EncryptedFile-v1',
            fileName: item.originalName || item.fileName.replace(/\.enc$/, ''),
            algorithm: item.algorithm,
            sha256: item.sha256,
            encryptedAt: new Date().toISOString(),
            envelope: item.envelope,
          },
          null,
          2
        )
      : JSON.stringify(
          {
            format: 'ArsipNusa-VaultMetadata-v1',
            fileName: item.fileName,
            algorithm: item.algorithm,
            ivNonce: item.ivNonce,
            authTag: item.authTag,
            sha256: item.sha256,
          },
          null,
          2
        );

    const blob = new Blob([payloadStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRealEncryptFile = async () => {
    if (!simKey.trim()) return;
    setIsEncrypting(true);
    try {
      let plainBytes: Uint8Array;
      let baseName: string;

      if (selectedFileObj) {
        plainBytes = new Uint8Array(await selectedFileObj.arrayBuffer());
        baseName = selectedFileObj.name;
      } else {
        baseName = selectedSimFile;
        const sampleText = `%PDF-1.4 ARSIPNUSA SAMPLE DEED\nJudul: ${baseName}\nWaktu Enkripsi: ${new Date().toISOString()}\nIsi: Dokumen resmi kenotariatan terenkripsi penuh menggunakan ${simAlgorithm}.`;
        plainBytes = new TextEncoder().encode(sampleText);
      }

      const encResult =
        simAlgorithm === 'ChaCha20-Poly1305'
          ? await chacha20Poly1305EncryptBytes(plainBytes, simKey.trim())
          : await aes256GcmEncryptBytes(plainBytes, simKey.trim());

      const envelope = encResult.envelope;
      const ivNonceHex = encResult.ivHex;
      const authTagHex = encResult.authTagHex.slice(0, 16);

      const envelopeHash = await sha256(envelope);
      const encByteSize = new TextEncoder().encode(envelope).length;

      const newFile: EncryptedFileInfo = {
        id: `ENC-${(fileList.length + 1).toString().padStart(3, '0')}`,
        fileName: `${baseName}.enc`,
        originalName: baseName,
        originalSize: formatBytes(plainBytes.length),
        encryptedSize: formatBytes(encByteSize),
        algorithm: simAlgorithm,
        ivNonce: ivNonceHex,
        authTag: authTagHex,
        sha256: envelopeHash,
        timestamp: 'Baru saja',
        status: markPendingValidation ? 'Menunggu Validasi' : 'Terenkripsi & Tersegel',
        description: `Enkripsi byte-stream nyata menggunakan ${simAlgorithm} + PBKDF2-SHA256.`,
        envelope,
      };

      const packagedJson = JSON.stringify(
        {
          format: 'ArsipNusa-EncryptedFile-v1',
          fileName: baseName,
          algorithm: simAlgorithm,
          sha256: envelopeHash,
          encryptedAt: new Date().toISOString(),
          envelope,
        },
        null,
        2
      );

      setEncUploadJson(packagedJson);
      setDecKey(simKey.trim());
      setRecentEncrypted(newFile);
      setFileList((prev) => [newFile, ...prev]);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleRealDecryptEnc = async () => {
    setIsDecrypting(true);
    setDecError('');
    setDecryptedBlobUrl(null);
    setDecryptedPreviewText('');
    setDecVerifiedHash('');
    try {
      const parsed = JSON.parse(encUploadJson);
      if (!parsed.envelope || !parsed.algorithm) {
        throw new Error('Format berkas .enc tidak valid (harus ArsipNusa-EncryptedFile-v1).');
      }

      const computedHash = await sha256(parsed.envelope);
      if (parsed.sha256 && parsed.sha256 !== computedHash) {
        throw new Error('Checksum SHA-256 berkas .enc tidak cocok — file telah dimodifikasi!');
      }

      const plainBytes =
        parsed.algorithm === 'ChaCha20-Poly1305'
          ? await chacha20Poly1305DecryptBytes(parsed.envelope, decKey.trim())
          : await aes256GcmDecryptBytes(parsed.envelope, decKey.trim());

      const blob = new Blob([new Uint8Array(plainBytes)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      setDecryptedBlobUrl(url);
      setDecryptedFileName(parsed.fileName || 'decrypted-file.bin');
      setDecVerifiedHash(computedHash);

      const asText = new TextDecoder('utf-8', { fatal: false }).decode(plainBytes.slice(0, 600));
      setDecryptedPreviewText(asText);
    } catch (err: any) {
      setDecError(
        err?.message ||
          'Dekripsi gagal: Pastikan berkas .enc dan Kunci Rahasia sesuai serta tidak dimanipulasi.'
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleValidateRow = (id: string) => {
    setFileList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'Terenkripsi & Tersegel' } : f))
    );
  };

  const copyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            REPOSITORI DOKUMEN BINARY ENKRIPSI NYATA
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Berkas Digital Terenkripsi (AES-256-GCM & ChaCha20-Poly1305)
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Enkripsi dan dekripsi file binary nyata (.pdf / dokumen apa pun) menjadi paket terautentikasi .enc dengan Web Crypto AES-GCM & RFC 8439 ChaCha20-Poly1305.
          </p>
        </div>

        <div className="p-1 rounded-lg bg-[#f0ede6] border border-[#dfddd6] flex items-center gap-1 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('encrypt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'encrypt' ? 'bg-[#182b29] text-white' : 'text-[#55635f] hover:text-[#182b29]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Enkripsi Berkas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decrypt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'decrypt' ? 'bg-[#2d6958] text-white' : 'text-[#55635f] hover:text-[#182b29]'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Dekripsi .enc</span>
          </button>
        </div>
      </div>

      {/* Algorithm Comparison Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AES-256 Card */}
        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-emerald-300 shadow-xs flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm font-semibold text-[#182b29]">AES-256-GCM (NIST FIPS 197)</strong>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-700 text-white font-mono">
                Authenticated Cipher
              </span>
            </div>
            <p className="text-xs text-[#69736f] mt-1">
              Standar enkripsi blok 256-bit dengan Galois/Counter Mode. Memberikan kerahasiaan sekaligus integritas pesan secara simultan tanpa overhead komputasi berlebih.
            </p>
          </div>
        </div>

        {/* ChaCha20 Card */}
        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-cyan-300 shadow-xs flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-cyan-100 text-cyan-800 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm font-semibold text-[#182b29]">ChaCha20-Poly1305 (RFC 8439)</strong>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-700 text-white font-mono">
                High Speed Stream
              </span>
            </div>
            <p className="text-xs text-[#69736f] mt-1">
              Stream cipher modern karya Daniel J. Bernstein dipadukan dengan Poly1305 MAC authenticator. Sangat tangguh terhadap serangan timing dan side-channel attack.
            </p>
          </div>
        </div>
      </div>

      {activeTab === 'encrypt' ? (
        /* Real Binary Encryption Studio */
        <div className="p-5 rounded-xl bg-[#142825] text-white border border-[#29403c] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#233a35]">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-[#88bbaa]" />
              <div>
                <h3 className="font-serif text-base text-white font-medium">
                  Enkripsi Berkas Nyata ({simAlgorithm})
                </h3>
                <p className="text-[11px] text-[#9caaa6]">
                  Unggah file PDF/dokumen dari komputer Anda atau gunakan berkas contoh untuk dienkripsi secara nyata
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1f3a35] text-[#88bbaa] font-mono">
              AEAD Authenticated Encryption
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#c4d2ce]">
                Unggah Berkas Asli (Atau Pilih Contoh)
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0e1d1a] border border-dashed border-[#417e6b] text-xs text-emerald-200 hover:bg-[#18302c] cursor-pointer">
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {selectedFileObj ? `${selectedFileObj.name} (${formatBytes(selectedFileObj.size)})` : 'Pilih file dari perangkat...'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFileObj(e.target.files?.[0] || null)}
                />
              </label>
              {!selectedFileObj && (
                <select
                  value={selectedSimFile}
                  onChange={(e) => setSelectedSimFile(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0e1d1a] border border-[#2d4a45] text-xs text-white focus:outline-none focus:border-[#417e6b]"
                >
                  <option value="Akta_Perjanjian_Komersial_2025.pdf">Akta_Perjanjian_Komersial_2025.pdf</option>
                  <option value="SHM_02041_Pondok_Indah_Resmi.pdf">SHM_02041_Pondok_Indah_Resmi.pdf</option>
                  <option value="Wasiat_Harta_Keluarga_Soedirman.pdf">Wasiat_Harta_Keluarga_Soedirman.pdf</option>
                  <option value="Perjanjian_Pranikah_Notarial.pdf">Perjanjian_Pranikah_Notarial.pdf</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c4d2ce] mb-1.5">
                Pilihan Algoritma AEAD
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimAlgorithm('AES-256-GCM')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    simAlgorithm === 'AES-256-GCM'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#1b3531] text-[#9caaa6] hover:text-white'
                  }`}
                >
                  AES-256-GCM
                </button>
                <button
                  type="button"
                  onClick={() => setSimAlgorithm('ChaCha20-Poly1305')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    simAlgorithm === 'ChaCha20-Poly1305'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-[#1b3531] text-[#9caaa6] hover:text-white'
                  }`}
                >
                  ChaCha20
                </button>
              </div>
              <label className="mt-3 flex items-center gap-2 text-[11px] text-[#c4d2ce] cursor-pointer">
                <input
                  type="checkbox"
                  checked={markPendingValidation}
                  onChange={(e) => setMarkPendingValidation(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span>Tandai "Menunggu Validasi" sebelum disegel</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c4d2ce] mb-1.5 flex items-center justify-between">
                <span>Kunci Rahasia Enkripsi (256-bit / Passphrase)</span>
                <button
                  type="button"
                  onClick={() => setSimKey(generateRandomHex(64))}
                  className="text-[10px] text-[#88bbaa] hover:underline cursor-pointer"
                >
                  Acak Kunci
                </button>
              </label>
              <input
                type="text"
                value={simKey}
                onChange={(e) => setSimKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e1d1a] border border-[#2d4a45] text-xs text-emerald-300 font-mono focus:outline-none focus:border-[#417e6b]"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[#81938e]">
              *Hasil berupa file terenkripsi (.enc JSON terstruktur dengan Salt PBKDF2, IV/Nonce, Auth Tag, & SHA-256)
            </span>
            <button
              onClick={handleRealEncryptFile}
              disabled={isEncrypting || !simKey.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2d6958] hover:bg-[#387e6b] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
            >
              {isEncrypting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengenkripsi Binary File...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Enkripsi Berkas Sekarang</span>
                </>
              )}
            </button>
          </div>

          {recentEncrypted && (
            <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="text-white block">Berkas Berhasil Dienkripsi Nyata!</strong>
                  <span className="text-[10px] font-mono text-emerald-300">
                    {recentEncrypted.fileName} · IV: {recentEncrypted.ivNonce.slice(0, 12)}... · Tag: {recentEncrypted.authTag}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('decrypt')}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer"
                >
                  Uji Dekripsi &rarr;
                </button>
                <button
                  onClick={() => downloadEncArtifact(recentEncrypted)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .enc Asli</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Real .enc Decryption Panel */
        <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#dfddd6] pb-3">
            <div className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-[#2d6958]" />
              <div>
                <h3 className="font-serif text-base text-[#182b29] font-semibold">
                  Dekripsi & Verifikasi Integritas Berkas (.enc)
                </h3>
                <p className="text-xs text-[#69736f]">
                  Unggah file .enc hasil unduhan atau tempel payload JSON untuk mengembalikan file asli dan memverifikasi SHA-256 + Authentication Tag.
                </p>
              </div>
            </div>
            <label className="px-3 py-1.5 rounded-lg bg-[#182b29] hover:bg-black text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>Muat File .enc</span>
              <input
                type="file"
                accept=".enc,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setEncUploadJson(await f.text());
                  }
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1">
                  Konten Berkas Terenkripsi (.enc JSON)
                </label>
                <textarea
                  rows={5}
                  value={encUploadJson}
                  onChange={(e) => setEncUploadJson(e.target.value)}
                  placeholder='{"format":"ArsipNusa-EncryptedFile-v1","algorithm":"AES-256-GCM","envelope":"AESGCM1:..."}'
                  className="w-full p-3 rounded-lg bg-white border border-[#dfddd6] font-mono text-[11px] text-[#182b29] focus:outline-none focus:border-[#2d6958]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1">
                  Kunci Rahasia Dekripsi
                </label>
                <input
                  type="text"
                  value={decKey}
                  onChange={(e) => setDecKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] font-mono text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
                />
              </div>

              <button
                type="button"
                disabled={isDecrypting || !encUploadJson.trim() || !decKey.trim()}
                onClick={handleRealDecryptEnc}
                className="w-full py-2.5 px-4 rounded-lg bg-[#2d6958] hover:bg-[#235345] disabled:bg-slate-300 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>{isDecrypting ? 'Memverifikasi & Mendekripsi...' : 'Dekripsi Berkas .enc Sekarang'}</span>
              </button>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[#dfddd6] space-y-3">
              <div className="text-xs font-semibold text-[#182b29] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Status Pemulihan Berkas</span>
              </div>

              {decError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{decError}</span>
                </div>
              )}

              {decryptedBlobUrl ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                    <div className="font-bold">Berkas Berhasil Dipulihkan & SHA-256 Terverifikasi!</div>
                    <div className="font-mono text-[10px] break-all">
                      Nama Asli: {decryptedFileName}
                    </div>
                    <div className="font-mono text-[10px] break-all">
                      SHA-256: {decVerifiedHash}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#f0ede6] font-mono text-[10px] text-[#42524d] max-h-28 overflow-y-auto whitespace-pre-wrap break-all">
                    {decryptedPreviewText}
                  </div>
                  <a
                    href={decryptedBlobUrl}
                    download={decryptedFileName}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#182b29] hover:bg-black text-white text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh File Asli ({decryptedFileName})</span>
                  </a>
                </div>
              ) : (
                !decError && (
                  <p className="text-xs text-[#69736f] py-8 text-center">
                    Belum ada file yang didekripsi. Enkripsi berkas terlebih dahulu atau muat file .enc dari perangkat Anda.
                  </p>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Encrypted Files Registry Table */}
      <div className="bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#dfddd6]">
          <h2 className="font-serif text-base text-[#182b29] font-medium">
            Daftar Berkas PDF Terenkripsi dalam Brankas
          </h2>
          <p className="text-xs text-[#69736f] mt-0.5">
            Daftar artefak terproteksi dengan metadata autentikasi dan checksum integritas
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0ede6] text-[#69736f] font-semibold uppercase text-[10px] tracking-wider border-b border-[#dfddd6]">
              <tr>
                <th className="py-3 px-4">Nama Berkas .pdf.enc</th>
                <th className="py-3 px-3">Algoritma</th>
                <th className="py-3 px-3">Ukuran</th>
                <th className="py-3 px-3">IV / Nonce</th>
                <th className="py-3 px-3">Auth Tag</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Integritas Checksum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfddd6]">
              {fileList.map((file) => (
                <tr key={file.id} className="hover:bg-[#f5f3ee] transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#762e3b] shrink-0" />
                      <div>
                        <div className="font-semibold text-[#182b29] text-xs font-mono">
                          {file.fileName}
                        </div>
                        <div className="text-[10px] text-[#69736f]">{file.timestamp}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        file.algorithm === 'AES-256-GCM'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      {file.algorithm}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-[#42524d]">
                    {file.encryptedSize}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[10px] text-[#69736f]">
                    {file.ivNonce.slice(0, 10)}...
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[10px] text-[#69736f]">
                    {file.authTag}
                  </td>
                  <td className="py-3.5 px-3">
                    {file.status === 'Terenkripsi & Tersegel' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {file.status}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {file.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleValidateRow(file.id)}
                          className="px-2 py-0.5 rounded bg-[#2d6958] hover:bg-[#235345] text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Validasi & Segel
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      {file.envelope && (
                        <button
                          type="button"
                          onClick={() => downloadEncArtifact(file)}
                          className="px-2 py-0.5 rounded bg-[#182b29] hover:bg-black text-white text-[10px] font-medium inline-flex items-center gap-1 cursor-pointer"
                          title="Unduh file .enc"
                        >
                          <Download className="w-2.5 h-2.5" /> .enc
                        </button>
                      )}
                      <button
                        onClick={() => copyHash(file.sha256)}
                        className="font-mono text-[10px] text-[#2d6958] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Salin SHA-256 Checksum"
                      >
                        {copiedHash === file.sha256 ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{file.sha256.slice(0, 8)}...</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
