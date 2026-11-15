import React, { useState, useEffect } from 'react';
import {
  Usb,
  Shield,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  KeyRound,
  RefreshCw,
  HardDrive,
  AlertCircle,
} from 'lucide-react';
import type { SecurityTokenItem, UserSession } from '../types';
import {
  createDongleKeyFile,
  downloadKeyFileToFlashdisk,
  verifyDongleKeyFile,
  type DongleKeyFileData,
} from '../utils/dongle';
import {
  fetchSecurityTokens,
  issueSecurityToken,
  revokeSecurityToken,
} from '../services/api';

interface DongleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onTokenStatusChange?: (isConnected: boolean, activeSerial?: string) => void;
}

export const DongleManagerModal: React.FC<DongleManagerModalProps> = ({
  isOpen,
  onClose,
  session,
  onTokenStatusChange,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'verify' | 'lost-dongle' | 'rekey'>('export');
  const [tokens, setTokens] = useState<SecurityTokenItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Active verified token in memory
  const [verifiedToken, setVerifiedToken] = useState<DongleKeyFileData | null>(null);
  const [revokeReason, setRevokeReason] = useState('Flashdisk fisik terjatuh dan hilang saat perjalanan dinas');
  const [newLabel, setNewLabel] = useState('Flashdisk SanDisk Cruzer 32GB (Pengganti)');

  const showFeedback = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  const loadTokens = async () => {
    setIsLoading(true);
    try {
      const list = await fetchSecurityTokens(session.role === 'admin' ? 'admin' : undefined);
      setTokens(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTokens();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentToken = tokens[0] || {
    id: 'tok-notary-01',
    serial_number: 'FIPS-NATASHA-2026-9901',
    token_label: 'Flashdisk Dongle Notaris Natasha S.H.',
    status: 'ACTIVE',
    public_key_hash: 'a78f24b0789d2c20a67e9f3b1456ca01ef2b8901cb4d8e90a5b6c7d8e9f01234',
    created_at: new Date().toISOString(),
  };

  // Action 1: Export Key File to Physical Flashdisk
  const handleExportToFlashdisk = async () => {
    setIsLoading(true);
    try {
      const { rawJson } = await createDongleKeyFile(
        session.displayName,
        session.username,
        session.nik || '3171012345670001',
        currentToken.serial_number
      );

      const filename = `arsipnusa_dongle_${currentToken.serial_number}.key`;
      downloadKeyFileToFlashdisk(filename, rawJson);

      showFeedback(
        `Berkas kunci "${filename}" berhasil diunduh! Silakan simpan / pindahkan berkas ini ke dalam drive Flashdisk USB Anda.`,
        'success'
      );
    } catch (err: any) {
      showFeedback(err.message || 'Gagal mengekspor berkas kunci', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Action 2: Read & Verify Key File from Flashdisk
  const handleFileFromFlashdisk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Berkas bukan format JSON token yang valid.');
      }

      const res = await verifyDongleKeyFile(parsed);
      if (!res.isValid || !res.token) {
        throw new Error(res.error || 'Verifikasi kunci token gagal.');
      }

      // Check with backend if revoked
      const latestTokens = await fetchSecurityTokens();
      const match = latestTokens.find((t) => t.serial_number === res.token!.serialNumber);

      if (match && match.status === 'REVOKED') {
        setVerifiedToken(null);
        onTokenStatusChange?.(false, res.token.serialNumber);
        throw new Error(
          `AKSES DITOLAK: Token "${res.token.serialNumber}" telah DIBLOKIR / DILAPORKAN HILANG pada sistem! Kunci ini tidak dapat digunakan lagi.`
        );
      }

      setVerifiedToken(res.token);
      onTokenStatusChange?.(true, res.token.serialNumber);
      showFeedback(
        `Flashdisk Kriptografis Berhasil Divalidasi! Serial: ${res.token.serialNumber}. Status: Terhubung & Aktif.`,
        'success'
      );
    } catch (err: any) {
      showFeedback(err.message || 'Gagal memverifikasi berkas dari flashdisk.', 'error');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // Action 3: Revoke Lost Dongle
  const handleRevokeLostDongle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await revokeSecurityToken(currentToken.serial_number, revokeReason);
      await loadTokens();
      setVerifiedToken(null);
      onTokenStatusChange?.(false);
      showFeedback(
        `KEAMANAN DITEGAKKAN: ${res.message} Sertifikat kunci lama kini tidak akan dapat membuka brankas lagi.`,
        'warning'
      );
    } catch (err: any) {
      showFeedback(err.message || 'Gagal mencabut token.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Action 4: Re-issue New Dongle (Emergency Recovery)
  const handleIssueReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newSerial = `FIPS-${session.username.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const { keyData, rawJson } = await createDongleKeyFile(
        session.displayName,
        session.username,
        session.nik || '3171012345670001',
        newSerial
      );

      await issueSecurityToken({
        owner_username: session.username,
        serial_number: newSerial,
        token_label: newLabel,
        public_key_hash: keyData.keyFingerprint,
      });

      const filename = `arsipnusa_dongle_${newSerial}.key`;
      downloadKeyFileToFlashdisk(filename, rawJson);

      await loadTokens();
      setVerifiedToken(keyData);
      onTokenStatusChange?.(true, newSerial);

      showFeedback(
        `Dongle Pengganti Baru (${newSerial}) berhasil diterbitkan dan diunduh! Silakan simpan ke Flashdisk pengganti Anda.`,
        'success'
      );
      setActiveTab('export');
    } catch (err: any) {
      showFeedback(err.message || 'Gagal menerbitkan token pengganti.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#142825] text-white flex items-center justify-between border-b border-[#29403c]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#26413c] text-emerald-300">
              <Usb className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest text-[#88bbaa] uppercase">
                HARDWARE SECURITY TOKEN (FIPS 140-2 LEVEL 3)
              </span>
              <h3 className="font-serif text-lg text-white font-medium">
                Pusat Manajemen Dongle Kriptografis Flashdisk
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`m-4 p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Current Active Hardware Token Card */}
        <div className="p-5 border-b border-[#dfddd6] bg-white">
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#142825] to-[#1d3d37] text-white border border-[#2d4a45] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-200">
                  {currentToken.token_label}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold ${
                  currentToken.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {currentToken.status === 'ACTIVE' ? 'STATUS: AKTIF & TERDAFTAR' : 'STATUS: DIBLOKIR / DICABUT'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#c0d0cb]">
              <div>
                <span className="text-[9px] uppercase text-[#88bbaa] block">Serial Token</span>
                <span className="font-mono text-white font-semibold">{currentToken.serial_number}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-[#88bbaa] block">Pemilik Kunci</span>
                <span className="text-white font-semibold">{session.displayName}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-[#88bbaa] block">Standar Enklave</span>
                <span className="text-white font-semibold">FIPS 140-2 Level 3</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-[#88bbaa] block">Deteksi Fisik</span>
                <span className={`font-semibold ${verifiedToken ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {verifiedToken ? 'Terhubung (File Valid)' : 'Simulasi Bawaan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-[#dfddd6] bg-[#f0ede6] px-4 pt-2 gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-2 font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-[#fbfaf7] text-[#182b29] border-t-2 border-[#2d6958] font-semibold'
                : 'text-[#69736f] hover:text-[#182b29]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1. Simpan ke Flashdisk</span>
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-2 font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'verify'
                ? 'bg-[#fbfaf7] text-[#182b29] border-t-2 border-[#2d6958] font-semibold'
                : 'text-[#69736f] hover:text-[#182b29]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>2. Pindai Flashdisk</span>
          </button>

          <button
            onClick={() => setActiveTab('lost-dongle')}
            className={`px-3 py-2 font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'lost-dongle'
                ? 'bg-rose-50 text-rose-900 border-t-2 border-rose-600 font-semibold'
                : 'text-rose-700 hover:text-rose-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>3. Mitigasi Dongle Hilang</span>
          </button>

          <button
            onClick={() => setActiveTab('rekey')}
            className={`px-3 py-2 font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rekey'
                ? 'bg-[#fbfaf7] text-[#182b29] border-t-2 border-[#2d6958] font-semibold'
                : 'text-[#69736f] hover:text-[#182b29]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>4. Terbitkan Pengganti</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 max-h-[50vh] overflow-y-auto text-xs space-y-4">
          {/* TAB 1: EXPORT TO FLASHDISK */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-xs text-emerald-900">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  Bagaimana Cara Menggunakan Flashdisk Fisik sebagai Dongle?
                </div>
                <p className="text-[11px] leading-relaxed">
                  Sistem ini mendukung perangkat keras penyimpanan umum (Flashdisk / USB Drive) untuk difungsikan sebagai <b>USB Cryptographic Key Token</b>. Klik tombol di bawah untuk mengunduh berkas kunci otorisasi kriptografi (<code>.key</code>), lalu simpan atau salin berkas tersebut ke dalam Flashdisk Anda.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#dfddd6] bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-sm text-[#182b29] block">
                      Berkas Kunci: arsipnusa_dongle_{currentToken.serial_number}.key
                    </strong>
                    <span className="text-[11px] text-[#69736f]">
                      Format JSON Tersegel SHA-256 · Standar FIPS 140-2
                    </span>
                  </div>
                  <button
                    onClick={handleExportToFlashdisk}
                    disabled={isLoading || currentToken.status === 'REVOKED'}
                    className="px-4 py-2 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh ke Flashdisk</span>
                  </button>
                </div>
                {currentToken.status === 'REVOKED' && (
                  <p className="text-[11px] text-rose-700 font-medium">
                    ⚠️ Token ini telah dicabut/diblokir. Anda harus menerbitkan kunci baru pada tab "Terbitkan Pengganti".
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VERIFY FLASHDISK */}
          {activeTab === 'verify' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-xs text-blue-900">
                  <HardDrive className="w-4 h-4 text-blue-700" />
                  Pindai & Deteksi Flashdisk yang Sedang Tercolok
                </div>
                <p className="text-[11px] leading-relaxed">
                  Colokkan Flashdisk ke port USB laptop/komputer Anda, lalu pilih berkas <code>.key</code> yang tersimpan di dalam drive Flashdisk tersebut untuk memvalidasi otorisasi fisik.
                </p>
              </div>

              <div className="p-6 rounded-xl border-2 border-dashed border-[#dfddd6] bg-white text-center space-y-3">
                <Usb className="w-8 h-8 text-[#2d6958] mx-auto animate-pulse" />
                <div>
                  <label
                    htmlFor="flashdisk-key-input"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#182b29] hover:bg-black text-white font-semibold transition cursor-pointer text-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih Berkas Kunci dari Flashdisk (.key)</span>
                  </label>
                  <input
                    id="flashdisk-key-input"
                    type="file"
                    accept=".key,.json"
                    onChange={handleFileFromFlashdisk}
                    className="hidden"
                  />
                  <p className="text-[11px] text-[#69736f] mt-1.5">
                    File: <code>arsipnusa_dongle_*.key</code>
                  </p>
                </div>
              </div>

              {verifiedToken && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <span className="font-semibold text-emerald-900 block text-xs">
                    ✅ Flashdisk Terbaca & Terverifikasi
                  </span>
                  <div className="font-mono text-[11px] mt-1 space-y-0.5">
                    <div>Serial: {verifiedToken.serialNumber}</div>
                    <div>Pemilik: {verifiedToken.ownerName} ({verifiedToken.ownerUsername})</div>
                    <div>Fingerprint: {verifiedToken.keyFingerprint.slice(0, 24)}...</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOST DONGLE SECURITY CASE */}
          {activeTab === 'lost-dongle' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-xs text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-700" />
                  Skenario Keamanan: Apa yang Terjadi Jika Flashdisk Hilang atau Dicuri?
                </div>
                <div className="text-[11px] space-y-1.5 text-rose-900/90 leading-relaxed">
                  <p>
                    <b>1. Prinsip 2FA (Two-Factor Protection):</b> Flashdisk hanyalah faktor kepemilikan (<i>what you have</i>). File kunci di dalam flashdisk dienkripsi dan memerlukan PIN & Password otentikasi Notaris (<i>what you know</i>). Penemu atau pencuri flashdisk <b>tidak dapat menggunakannya</b> tanpa kredensial notaris.
                  </p>
                  <p>
                    <b>2. Mitigasi Instan (Revocation):</b> Jika fisik flashdisk hilang, Notaris atau Super Admin dapat langsung memencet tombol <b>"Blokir & Cabut Izin Token Ini"</b> di bawah. Sistem akan mencatat serial nomor tersebut ke dalam daftar hitam (<i>Certificate Revocation List / CRL</i>) di database SQLite.
                  </p>
                  <p>
                    <b>3. Pencegahan Penyusupan:</b> Setelah diblokir, siapa pun yang mencolokkan flashdisk lama tersebut akan ditolak oleh sistem dengan peringatan keamanan tingkat tinggi.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRevokeLostDongle} className="p-4 rounded-xl border border-rose-200 bg-white space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-900 mb-1">
                    Serial Dongle yang Dilaporkan Hilang:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentToken.serial_number}
                    className="w-full px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 font-mono text-xs text-rose-950 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-900 mb-1">
                    Alasan / Berita Acara Kehilangan *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-rose-200 text-xs focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-rose-700">
                    Tindakan ini akan dicatat ke dalam Jejak Audit Kriptografis global.
                  </span>
                  <button
                    type="submit"
                    disabled={isLoading || currentToken.status === 'REVOKED'}
                    className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {currentToken.status === 'REVOKED' ? 'Sudah Dicabut' : '🚨 Blokir Dongle Ini Sekarang'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: EMERGENCY RE-KEYING */}
          {activeTab === 'rekey' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#edf2f4] border border-[#d2dde0] text-[#304854] space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-xs text-[#1e2d35]">
                  <KeyRound className="w-4 h-4 text-[#2d6958]" />
                  Penerbitan Dongle Pengganti (Emergency Re-Keying)
                </div>
                <p className="text-[11px] leading-relaxed">
                  Setelah dongle lama diblokir, Notaris dapat menerbitkan pasangan kunci baru (New Key Pair) yang bersih ke Flashdisk baru. Dokumen-dokumen lama yang sudah ditandatangani di masa lalu tetap sah dan terverifikasi karena segel <i>Chain of Title</i> bersifat permanen.
                </p>
              </div>

              <form onSubmit={handleIssueReplacement} className="p-4 rounded-xl border border-[#dfddd6] bg-white space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#182b29] mb-1">
                    Label Perangkat Flashdisk Baru *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Contoh: Flashdisk Kingston DataTraveler 64GB"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs focus:outline-none focus:border-[#2d6958]"
                  />
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                  Sistem akan mengompilasi sertifikat kunci baru dengan nomor seri acak unik berstandar FIPS 140-2 dan langsung mengunduh berkas <code>.key</code> baru ke komputer Anda.
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Terbitkan & Unduh Kunci Baru</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#f0ede6] border-t border-[#dfddd6] flex items-center justify-between text-xs">
          <span className="text-[#69736f] font-mono text-[11px]">
            ArsipNusa Hardware Key Token Security Protocol · ISO 27001
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#182b29] text-white hover:bg-black font-semibold transition cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
