import React, { useState } from 'react';
import {
  Lock,
  Shield,
  Download,
  CheckCircle2,
  FileText,
  Cpu,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import type { EncryptedFileInfo } from '../../types';
import { sha256 } from '../../utils/crypto';

export const EncryptedFilesView: React.FC = () => {
  const [fileList, setFileList] = useState<EncryptedFileInfo[]>([
    {
      id: 'ENC-001',
      fileName: 'Akta_Wasiat_Keluarga_Hartono_2025.pdf.enc',
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
      originalSize: '3.6 MB',
      encryptedSize: '3.62 MB',
      algorithm: 'ChaCha20-Poly1305',
      ivNonce: 'e5f6a1b2c3d4567890abcdef',
      authTag: '1234a5b6c7d8e9f0',
      sha256: 'f47ac10b58cc4372a5670e02b2c3d479a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d',
      timestamp: '20 Jun 2025, 09:30 WIB',
      status: 'Terenkripsi & Tersegel',
      description: 'Hak Guna Bangunan kawasan industri berikat Cikarang Barat.',
    },
  ]);

  // Simulator state
  const [selectedSimFile, setSelectedSimFile] = useState('Akta_Perjanjian_Komersial_2025.pdf');
  const [simAlgorithm, setSimAlgorithm] = useState<'AES-256-GCM' | 'ChaCha20-Poly1305'>('AES-256-GCM');
  const [simKey, setSimKey] = useState('d3f8a02c5e7b194a6012c8b7e45a901f6871234509abcdef1234567890abcdef');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [recentEncrypted, setRecentEncrypted] = useState<EncryptedFileInfo | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const generateRandomHex = (length: number) => {
    let result = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSimulateEncrypt = async () => {
    setIsEncrypting(true);

    const nonce = generateRandomHex(24);
    const tag = generateRandomHex(16);
    const mockHash = await sha256(selectedSimFile + simKey + Date.now().toString());

    setTimeout(() => {
      const newFile: EncryptedFileInfo = {
        id: `ENC-${(fileList.length + 1).toString().padStart(3, '0')}`,
        fileName: `${selectedSimFile}.enc`,
        originalSize: '3.1 MB',
        encryptedSize: '3.12 MB',
        algorithm: simAlgorithm,
        ivNonce: nonce,
        authTag: tag,
        sha256: mockHash,
        timestamp: 'Baru saja',
        status: 'Terenkripsi & Tersegel',
        description: `Simulasi enkripsi berkas PDF notarial menggunakan ${simAlgorithm}.`,
      };

      setRecentEncrypted(newFile);
      setFileList([newFile, ...fileList]);
      setIsEncrypting(false);
    }, 1200);
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
            REPOSITORI DOKUMEN BINARY ENKRIPSI
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Berkas PDF Terenkripsi (AES-256 / ChaCha20)
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Status pengamanan berkas digital akta tanah, wasiat, dan kontrak notaris menggunakan algoritma standar militer & perbankan.
          </p>
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

      {/* Interactive PDF Encryption Simulator */}
      <div className="p-5 rounded-xl bg-[#142825] text-white border border-[#29403c] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#233a35]">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#88bbaa]" />
            <div>
              <h3 className="font-serif text-base text-white font-medium">
                Simulasi Enkripsi Dokumen PDF Baru
              </h3>
              <p className="text-[11px] text-[#9caaa6]">
                Pilih berkas digital untuk diamankan dan disegel secara kriptografis
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1f3a35] text-[#88bbaa] font-mono">
            Hardware Dongle Key Generator
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#c4d2ce] mb-1.5">
              Nama Dokumen PDF
            </label>
            <select
              value={selectedSimFile}
              onChange={(e) => setSelectedSimFile(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e1d1a] border border-[#2d4a45] text-xs text-white focus:outline-none focus:border-[#417e6b]"
            >
              <option value="Akta_Perjanjian_Komersial_2025.pdf">
                Akta_Perjanjian_Komersial_2025.pdf
              </option>
              <option value="SHM_02041_Pondok_Indah_Resmi.pdf">
                SHM_02041_Pondok_Indah_Resmi.pdf
              </option>
              <option value="Wasiat_Harta_Keluarga_Soedirman.pdf">
                Wasiat_Harta_Keluarga_Soedirman.pdf
              </option>
              <option value="Perjanjian_Pranikah_Notarial.pdf">
                Perjanjian_Pranikah_Notarial.pdf
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#c4d2ce] mb-1.5">
              Pilihan Algoritma
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
          </div>

          <div>
            <label className="block text-xs font-medium text-[#c4d2ce] mb-1.5 flex items-center justify-between">
              <span>Kunci Rahasia Sesi (Hex 256-bit)</span>
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

        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] text-[#81938e]">
            *Dokumen PDF akan diubah menjadi format byte stream terenkripsi (.pdf.enc)
          </span>
          <button
            onClick={handleSimulateEncrypt}
            disabled={isEncrypting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2d6958] hover:bg-[#387e6b] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
          >
            {isEncrypting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses Enkripsi Bitwise...</span>
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
                <strong className="text-white block">Berkas Berhasil Dienkripsi & Tersegel!</strong>
                <span className="text-[10px] font-mono text-emerald-300">
                  {recentEncrypted.fileName} · IV: {recentEncrypted.ivNonce.slice(0, 10)}... · Tag: {recentEncrypted.authTag}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                const element = document.createElement('a');
                const file = new Blob([recentEncrypted.sha256], { type: 'application/octet-stream' });
                element.href = URL.createObjectURL(file);
                element.download = recentEncrypted.fileName;
                document.body.appendChild(element);
                element.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .enc</span>
            </button>
          </div>
        )}
      </div>

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
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {file.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => copyHash(file.sha256)}
                      className="font-mono text-[10px] text-[#2d6958] hover:underline flex items-center gap-1 justify-end ml-auto"
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
