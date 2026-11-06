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
} from 'lucide-react';
import type { DocumentItem } from '../../types';

interface DocumentsViewProps {
  documents: DocumentItem[];
  title: string;
  subtitle: string;
  onOpenAddModal: () => void;
  searchQuery: string;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  title,
  subtitle,
  onOpenAddModal,
  searchQuery,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('Semua');
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDecrypted, setIsDecrypted] = useState(false);

  const filters = ['Semua', 'Sertifikat Tanah', 'Surat Wasiat', 'Kepemilikan Saham', 'Akta Notaris'];

  const filteredDocs = documents.filter((doc) => {
    const matchesFilter = selectedFilter === 'Semua' || doc.type === selectedFilter;
    const matchesSearch =
      `${doc.title} ${doc.client} ${doc.id} ${doc.algorithm} ${doc.sha256_hash}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
            REGISTRASI DOKUMEN & AKTA NOTARIS
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
          <span>Tambah Akta Baru</span>
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
                      <button
                        onClick={() => {
                          setActiveDoc(doc);
                          setIsDecrypted(false);
                        }}
                        className="px-2.5 py-1 rounded bg-[#f0ede6] hover:bg-[#2d6958] hover:text-white text-[#182b29] text-[11px] font-medium transition cursor-pointer"
                      >
                        Buka Detail
                      </button>
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

              {/* Decryption simulator */}
              <div className="p-3.5 rounded-lg border border-[#dfddd6] bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-[#182b29] flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#2d6958]" />
                    Pratinjau Dekripsi Notarial (Otorisasi USB Token)
                  </div>
                  <button
                    onClick={() => setIsDecrypted(!isDecrypted)}
                    className="px-3 py-1 rounded bg-[#2d6958] text-white text-[11px] font-medium hover:bg-[#235345] transition cursor-pointer"
                  >
                    {isDecrypted ? 'Sembunyikan Dekripsi' : 'Dekripsi Teks Sekarang'}
                  </button>
                </div>

                {isDecrypted ? (
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-serif leading-relaxed">
                    <p className="font-bold text-[11px] text-emerald-900 mb-1">
                      [HASIL DEKRIPSI RESMI NOTARIS NATASHA S.H., M.Kn.]
                    </p>
                    <p>
                      Menerangkan dengan sah bahwa dokumen bertajuk "{activeDoc.title}" terdaftar atas nama {activeDoc.client} dengan nilai tercatat {activeDoc.value}. Seluruh klausul hak hukum dilindungi di bawah hukum negara Republik Indonesia dan dicatatkan pada buku register notarial tanggal {new Date(activeDoc.created_at).toLocaleDateString('id-ID')}.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#69736f]">
                    Data terproteksi enkripsi. Klik tombol di atas untuk mendekripsi isi akta menggunakan kunci privat notaris yang tersimpan di dongle aktif.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#f0ede6] border-t border-[#dfddd6] flex items-center justify-between text-xs">
              <span className="text-[#69736f] font-mono text-[11px]">
                Status: {activeDoc.status} · SQLite Synchronized
              </span>
              <button
                onClick={() => setActiveDoc(null)}
                className="px-4 py-2 rounded-lg bg-[#182b29] text-white hover:bg-black font-medium transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
