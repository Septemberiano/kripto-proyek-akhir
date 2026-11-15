import React, { useState } from 'react';
import {
  Plus,
  Lock,
  Copy,
  Check,
  Eye,
  KeyRound,
  Shield,
  X,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import type { DocumentItem, UserRole } from '../../types';
import { decryptDocumentPayload, verifyPayloadECDSA } from '../../utils/crypto';

interface DocumentsViewProps {
  documents: DocumentItem[];
  title: string;
  subtitle: string;
  onOpenAddModal: () => void;
  searchQuery: string;
  userRole?: UserRole;
  onSignDocument?: (doc: DocumentItem) => void;
  allowedTypes?: string[];
  categoryLabel?: string;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  title,
  subtitle,
  onOpenAddModal,
  searchQuery,
  userRole,
  onSignDocument,
  allowedTypes,
  categoryLabel,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('Semua');
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Real decryption state
  const [decryptKey, setDecryptKey] = useState('AES-NOTARIAL-SECRET-2025');
  const [decryptClassicalKey, setDecryptClassicalKey] = useState('NOTARISNUSA');
  const [decryptedResult, setDecryptedResult] = useState<{
    plaintext: string;
    intermediate?: string;
    modeLabel: string;
  } | null>(null);
  const [decryptError, setDecryptError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Asymmetric ECDSA verification state
  const [ecdsaVerifyStatus, setEcdsaVerifyStatus] = useState<{
    client?: boolean;
    notary?: boolean;
  } | null>(null);

  const filters =
    allowedTypes && allowedTypes.length > 0
      ? ['Semua', ...allowedTypes]
      : ['Semua', 'Sertifikat Tanah', 'Surat Wasiat', 'Kepemilikan Saham', 'Akta Notaris'];

  const scopedDocs =
    allowedTypes && allowedTypes.length > 0
      ? documents.filter((doc) => allowedTypes.includes(doc.type))
      : documents;

  const filteredDocs = scopedDocs.filter((doc) => {
    const matchesFilter = selectedFilter === 'Semua' || doc.type === selectedFilter;
    const matchesSearch =
      `${doc.title} ${doc.client} ${doc.id} ${doc.algorithm} ${doc.sha256_hash}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const openDocumentDetail = (doc: DocumentItem) => {
    setActiveDoc(doc);
    setDecryptedResult(null);
    setDecryptError('');
    setEcdsaVerifyStatus(null);
    setDecryptKey('AES-NOTARIAL-SECRET-2025');
    setDecryptClassicalKey('NOTARISNUSA');
  };

  const handleRealDecrypt = async () => {
    if (!activeDoc) return;
    if (decryptedResult) {
      setDecryptedResult(null);
      setDecryptError('');
      return;
    }
    setIsDecrypting(true);
    setDecryptError('');
    try {
      const res = await decryptDocumentPayload(
        activeDoc.encrypted_content,
        activeDoc.algorithm,
        decryptKey.trim(),
        decryptClassicalKey.trim()
      );
      setDecryptedResult(res);
    } catch (err: any) {
      setDecryptError(
        err?.message ||
          'Dekripsi gagal: Kunci salah atau Authentication Tag AES-GCM/Poly1305 tidak valid.'
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleVerifyEcdsa = async () => {
    if (!activeDoc) return;
    let clientValid: boolean | undefined;
    let notaryValid: boolean | undefined;

    if (activeDoc.client_signature_hash && activeDoc.client_public_key) {
      const clientMsg = `CLIENT_SIGN|${activeDoc.id}|${activeDoc.sha256_hash}|${
        activeDoc.client_signed_by || activeDoc.client
      }`;
      clientValid = await verifyPayloadECDSA(
        clientMsg,
        activeDoc.client_signature_hash,
        activeDoc.client_public_key
      );
    }

    if (activeDoc.notary_signature_hash && activeDoc.notary_public_key) {
      const notaryMsg = `NOTARY_SEAL|${activeDoc.id}|${activeDoc.sha256_hash}|${
        activeDoc.client_signature_hash || ''
      }|${activeDoc.notary_signed_by || ''}`;
      notaryValid = await verifyPayloadECDSA(
        notaryMsg,
        activeDoc.notary_signature_hash,
        activeDoc.notary_public_key
      );
    }

    setEcdsaVerifyStatus({ client: clientValid, notary: notaryValid });
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            {categoryLabel || 'REGISTRASI DOKUMEN & AKTA NOTARIS'}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">{subtitle}</p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold shadow-sm transition self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{userRole === 'client' ? 'Ajukan Permintaan Akta' : 'Tambah Akta Baru'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedFilter === filter
                ? 'bg-[#182b29] text-white shadow-xs'
                : 'bg-[#f0ede6] text-[#55635f] hover:bg-[#e6e2d8]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0ede6] text-[#69736f] font-semibold uppercase text-[10px] tracking-wider border-b border-[#dfddd6]">
              <tr>
                <th className="py-3.5 px-4">Nomor & Judul Dokumen</th>
                <th className="py-3.5 px-3">Klien</th>
                <th className="py-3.5 px-3">Kategori</th>
                <th className="py-3.5 px-3">Algoritma Enkripsi</th>
                <th className="py-3.5 px-3">Hash SHA-256</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfddd6]">
              {filteredDocs.length ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#f5f3ee] transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#182b29] text-xs">{doc.title}</div>
                      <div className="text-[10px] text-[#69736f] font-mono mt-0.5">{doc.id}</div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-[#182b29]">{doc.client}</td>
                    <td className="py-3.5 px-3 text-[#69736f]">{doc.type}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          doc.algorithm.includes('AES')
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.algorithm.includes('ChaCha')
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        <Lock className="w-2.5 h-2.5" />
                        {doc.algorithm}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[10px] text-[#71817d]">
                      {doc.sha256_hash.slice(0, 10)}...{doc.sha256_hash.slice(-8)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          doc.status === 'Terverifikasi'
                            ? 'text-emerald-700'
                            : doc.status === 'Menunggu tanda tangan'
                            ? 'text-amber-700'
                            : 'text-blue-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            doc.status === 'Terverifikasi'
                              ? 'bg-emerald-500'
                              : doc.status === 'Menunggu tanda tangan'
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {onSignDocument && userRole === 'client' && doc.status === 'Menunggu tanda tangan' && (
                          <button
                            onClick={() => onSignDocument(doc)}
                            className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Tandatangani</span>
                          </button>
                        )}
                        {onSignDocument && userRole === 'admin' && doc.status === 'Dalam peninjauan' && (
                          <button
                            onClick={() => onSignDocument(doc)}
                            className="px-2.5 py-1 rounded bg-[#2d6958] hover:bg-[#235345] text-white text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            <span>Sahkan & Segel</span>
                          </button>
                        )}
                        <button
                          onClick={() => openDocumentDetail(doc)}
                          className="px-2.5 py-1 rounded bg-[#f0ede6] hover:bg-[#2d6958] hover:text-white text-[#182b29] text-[11px] font-medium transition cursor-pointer"
                        >
                          Buka Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 text-xs">
                    Tidak ada dokumen yang sesuai dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Detail Drawer / Modal */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#142825] text-white flex items-center justify-between border-b border-[#29403c]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#26413c] text-emerald-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] tracking-widest text-[#88bbaa] uppercase">
                    DETAIL ARSIP TERENKRIPSI
                  </span>
                  <h3 className="font-serif text-lg text-white font-medium">{activeDoc.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setActiveDoc(null)}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#26413c] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Metadata 2-col */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-[#f0ede6] border border-[#dfddd6] text-xs">
                <div>
                  <span className="text-[10px] text-[#69736f] block uppercase">Nomor Akta</span>
                  <strong className="font-mono text-[#182b29]">{activeDoc.id}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#69736f] block uppercase">Nama Klien</span>
                  <strong className="text-[#182b29]">{activeDoc.client}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#69736f] block uppercase">Jenis Dokumen</span>
                  <strong className="text-[#182b29]">{activeDoc.type}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#69736f] block uppercase">Nilai Aset</span>
                  <strong className="text-[#182b29]">{activeDoc.value}</strong>
                </div>
              </div>

              {/* Cryptographic SHA-256 Signature */}
              <div>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-medium text-[#182b29] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#2d6958]" />
                    Tanda Tangan Hash SHA-256
                  </span>
                  <button
                    onClick={() => copyToClipboard(activeDoc.sha256_hash, 'hash')}
                    className="text-[11px] text-[#2d6958] hover:underline flex items-center gap-1"
                  >
                    {copiedField === 'hash' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Salin Hash
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 rounded bg-[#f5f3ee] border border-[#dfddd6] font-mono text-[11px] text-[#42524d] break-all">
                  {activeDoc.sha256_hash}
                </div>
              </div>

              {/* Encrypted Content Payload */}
              <div>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-medium text-[#182b29] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#762e3b]" />
                    Payload Teks Terenkripsi ({activeDoc.algorithm})
                  </span>
                  <button
                    onClick={() => copyToClipboard(activeDoc.encrypted_content, 'content')}
                    className="text-[11px] text-[#2d6958] hover:underline flex items-center gap-1"
                  >
                    {copiedField === 'content' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Salin Ciphertext
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[#0e1d1a] text-emerald-300 font-mono text-xs border border-[#233a35] max-h-32 overflow-y-auto break-all">
                  {activeDoc.encrypted_content}
                </div>
              </div>

              {/* Dual-Signature Trail */}
              <div className="p-3.5 rounded-lg bg-[#f0ede6] border border-[#dfddd6] space-y-2.5 text-xs">
                <div className="font-semibold text-[#182b29] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#2d6958]" />
                  <span>Alur Tanda Tangan Berantai (Dual-Signature)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    className={`p-2.5 rounded-lg border ${
                      activeDoc.client_signature_hash
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      {activeDoc.client_signature_hash ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                      )}
                      <span>1. Persetujuan Klien</span>
                    </div>
                    <p className="text-[10px] mt-1">
                      {activeDoc.client_signature_hash
                        ? `Sah oleh ${activeDoc.client_signed_by} · ${
                            activeDoc.client_signed_at
                              ? new Date(activeDoc.client_signed_at).toLocaleString('id-ID')
                              : ''
                          }`
                        : activeDoc.status === 'Menunggu tanda tangan'
                        ? 'Menunggu tanda tangan persetujuan klien'
                        : 'Hash tanda tangan klien belum tercatat'}
                    </p>
                    {activeDoc.client_signature_hash && (
                      <div className="text-[9px] font-mono text-emerald-800 mt-1 break-all">
                        {activeDoc.client_public_key ? '[ECDSA P-256] ' : ''}
                        {activeDoc.client_signature_hash.slice(0, 24)}...
                      </div>
                    )}
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      activeDoc.status === 'Terverifikasi'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : activeDoc.status === 'Dalam peninjauan'
                        ? 'bg-blue-50 border-blue-200 text-blue-950'
                        : 'bg-white border-[#dfddd6] text-[#69736f]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      {activeDoc.status === 'Terverifikasi' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-blue-700" />
                      )}
                      <span>2. Pengesahan & Segel Notaris</span>
                    </div>
                    <p className="text-[10px] mt-1">
                      {activeDoc.status === 'Terverifikasi'
                        ? activeDoc.notary_signed_by
                          ? `Disahkan ${activeDoc.notary_signed_by} (${activeDoc.notary_auth_method || 'Token'})`
                          : 'Tersegel & Terverifikasi Resmi'
                        : activeDoc.status === 'Dalam peninjauan'
                        ? 'Siap disahkan & disegel oleh Notaris'
                        : 'Menunggu persetujuan klien terlebih dahulu'}
                    </p>
                    {activeDoc.notary_signature_hash && (
                      <div className="text-[9px] font-mono text-emerald-800 mt-1 break-all">
                        {activeDoc.notary_public_key ? '[ECDSA P-256] ' : ''}
                        {activeDoc.notary_signature_hash.slice(0, 24)}...
                      </div>
                    )}
                  </div>
                </div>

                {(activeDoc.client_public_key || activeDoc.notary_public_key) && (
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-[#dfddd6]">
                    <button
                      type="button"
                      onClick={handleVerifyEcdsa}
                      className="px-2.5 py-1 rounded bg-[#182b29] hover:bg-black text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verifikasi TTD ECDSA P-256</span>
                    </button>
                    {ecdsaVerifyStatus && (
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        {ecdsaVerifyStatus.client !== undefined && (
                          <span
                            className={
                              ecdsaVerifyStatus.client
                                ? 'text-emerald-700 font-semibold'
                                : 'text-rose-700 font-semibold'
                            }
                          >
                            Klien: {ecdsaVerifyStatus.client ? 'ECDSA VALID' : 'INVALID'}
                          </span>
                        )}
                        {ecdsaVerifyStatus.notary !== undefined && (
                          <span
                            className={
                              ecdsaVerifyStatus.notary
                                ? 'text-emerald-700 font-semibold'
                                : 'text-rose-700 font-semibold'
                            }
                          >
                            Notaris: {ecdsaVerifyStatus.notary ? 'ECDSA VALID' : 'INVALID'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Real Cryptographic Decryption */}
              <div className="p-3.5 rounded-lg border border-[#dfddd6] bg-white space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[#182b29] flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#2d6958]" />
                    Dekripsi Kriptografis Nyata ({activeDoc.algorithm})
                  </div>
                  <button
                    type="button"
                    disabled={isDecrypting}
                    onClick={handleRealDecrypt}
                    className="px-3 py-1 rounded bg-[#2d6958] text-white text-[11px] font-medium hover:bg-[#235345] transition cursor-pointer shrink-0"
                  >
                    {isDecrypting
                      ? 'Mendekripsi...'
                      : decryptedResult
                      ? 'Sembunyikan Plaintext'
                      : 'Dekripsi Ciphertext Sekarang'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-[#69736f] mb-1">
                      Kunci Modern / Passphrase (Default Vault):
                    </label>
                    <input
                      type="text"
                      value={decryptKey}
                      onChange={(e) => {
                        setDecryptKey(e.target.value);
                        setDecryptedResult(null);
                        setDecryptError('');
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-[#f0ede6] border border-[#dfddd6] text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#2d6958]"
                    />
                  </div>
                  {(activeDoc.algorithm.includes('Super-Encrypted') ||
                    activeDoc.algorithm.includes('Vigenere')) && (
                    <div>
                      <label className="block text-[10px] font-medium text-[#69736f] mb-1">
                        Kunci Vigenère (Layer 1):
                      </label>
                      <input
                        type="text"
                        value={decryptClassicalKey}
                        onChange={(e) => {
                          setDecryptClassicalKey(e.target.value);
                          setDecryptedResult(null);
                          setDecryptError('');
                        }}
                        className="w-full px-2.5 py-1.5 rounded bg-[#f0ede6] border border-[#dfddd6] text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#2d6958]"
                      />
                    </div>
                  )}
                </div>

                {decryptError && (
                  <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{decryptError}</span>
                  </div>
                )}

                {decryptedResult ? (
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                    <div className="font-bold text-[10px] uppercase tracking-wider text-emerald-800">
                      [{decryptedResult.modeLabel}]
                    </div>
                    {decryptedResult.intermediate && (
                      <div className="p-2 rounded bg-white/80 border border-emerald-200 text-[10px] font-mono text-amber-900 break-all">
                        <span className="font-semibold">Ciphertext Vigenère (Setelah Dekripsi AES-256-GCM): </span>
                        {decryptedResult.intermediate}
                      </div>
                    )}
                    <p className="font-serif leading-relaxed whitespace-pre-wrap">
                      {decryptedResult.plaintext}
                    </p>
                  </div>
                ) : (
                  !decryptError && (
                    <p className="text-[11px] text-[#69736f]">
                      Masukkan passphrase enkripsi lalu klik tombol di atas untuk membuka ciphertext asli dari database secara kriptografis.
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#f0ede6] border-t border-[#dfddd6] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#69736f] font-mono text-[11px]">
                Status: {activeDoc.status} · SQLite Synchronized
              </span>
              <div className="flex items-center gap-2">
                {onSignDocument && userRole === 'client' && activeDoc.status === 'Menunggu tanda tangan' && (
                  <button
                    onClick={() => {
                      const target = activeDoc;
                      setActiveDoc(null);
                      onSignDocument(target);
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Tandatangani Dokumen</span>
                  </button>
                )}
                {onSignDocument && userRole === 'admin' && activeDoc.status === 'Dalam peninjauan' && (
                  <button
                    onClick={() => {
                      const target = activeDoc;
                      setActiveDoc(null);
                      onSignDocument(target);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white font-semibold transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Sahkan & Segel Akhir</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveDoc(null)}
                  className="px-4 py-2 rounded-lg bg-[#182b29] text-white hover:bg-black font-medium transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
