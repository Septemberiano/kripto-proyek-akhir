import React from 'react';
import {
  Building2,
  FileText,
  Users,
  Link2,
  Lock,
  Fingerprint,
  ChevronRight,
  Shield,
  KeyRound,
  Image,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { AuditLogItem, DocumentItem } from '../../types';
import type { NavTab } from '../Sidebar';

interface OverviewViewProps {
  documents: DocumentItem[];
  auditLogs: AuditLogItem[];
  setActiveTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  searchQuery: string;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  documents,
  auditLogs,
  setActiveTab,
  onOpenAddModal,
  searchQuery,
}) => {
  const filteredDocuments = documents.filter((doc) =>
    `${doc.title} ${doc.client} ${doc.id} ${doc.algorithm}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            SISTEM BRANKAS NOTARIS DIGITAL
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Selamat datang, Ibu Natasha S.H., M.Kn.
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Berikut ringkasan integritas kriptografis dan status ruang kerja notarial Anda hari ini.
          </p>
        </div>

        <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-[#dfddd6] shadow-xs text-xs self-start">
          <Fingerprint className="w-5 h-5 text-[#2d6958]" />
          <div>
            <div className="font-semibold text-[#182b29] text-[11px] leading-tight">
              Identitas Terverifikasi
            </div>
            <div className="text-[10px] text-[#69736f]">Biometrik + Hardware USB Dongle</div>
          </div>
        </div>
      </section>

      {/* Cryptographic Security Notice */}
      <section className="p-4 rounded-xl bg-gradient-to-r from-[#142825] to-[#1c3935] text-[#e7ece9] border border-[#2d4a45] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#26413c] text-emerald-300 shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <strong className="text-sm font-semibold text-white block">
              Semua data dalam ruang kerja ini terenkripsi ujung-ke-ujung (End-to-End).
            </strong>
            <p className="text-xs text-[#aebbb7] mt-0.5 max-w-2xl">
              Setiap berkas diamankan dengan kombinasi AES-256-GCM / ChaCha20, Super Enkripsi Klasik-Modern, serta disegel dalam buku besar rantai kriptografis (Chain of Title) berbasis SQLite.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('Super Enkripsi')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2d6958] hover:bg-[#397e6b] text-white text-xs font-medium shrink-0 transition cursor-pointer"
        >
          <span>Uji Super Enkripsi</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs hover:border-[#b88070] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-[#182b29]/10 text-[#182b29]">
              <Building2 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              ↑ 8,2%
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#69736f] uppercase block">
            TOTAL ASET TERCATAT
          </span>
          <div className="font-serif text-2xl font-bold text-[#182b29] mt-0.5">124</div>
          <p className="text-xs text-[#69736f] mt-1">
            Senilai <b className="text-[#182b29]">Rp 48,6 miliar</b>
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs hover:border-[#b88070] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-[#762e3b]/10 text-[#762e3b]">
              <FileText className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              3 perlu tindakan
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#69736f] uppercase block">
            WASIAT & AKTA HUKUM
          </span>
          <div className="font-serif text-2xl font-bold text-[#182b29] mt-0.5">{documents.length}</div>
          <p className="text-xs text-[#69736f] mt-1">
            {documents.length - 1} aktif · 1 draf tersimpan
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs hover:border-[#b88070] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-[#2d6958]/10 text-[#2d6958]">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              +4 bulan ini
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#69736f] uppercase block">
            KLIEN TERDAFTAR
          </span>
          <div className="font-serif text-2xl font-bold text-[#182b29] mt-0.5">67</div>
          <p className="text-xs text-[#69736f] mt-1">12 badan usaha · 55 individu</p>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs hover:border-[#b88070] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-[#b88070]/10 text-[#762e3b]">
              <Link2 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              100% Valid
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#69736f] uppercase block">
            CHAIN OF TITLE (BLOCK)
          </span>
          <div className="font-serif text-2xl font-bold text-[#182b29] mt-0.5">892</div>
          <p className="text-xs text-[#69736f] mt-1">Validasi blok terverifikasi</p>
        </div>
      </section>

      {/* Main Grid: Priority Documents & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Documents Table */}
        <div className="lg:col-span-2 bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#dfddd6] flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg text-[#182b29] font-medium">Dokumen & Akta Prioritas</h2>
              <p className="text-xs text-[#69736f] mt-0.5">
                Data dokumen tersimpan di SQLite dengan algoritma enkripsi bersertifikat
              </p>
            </div>
            <button
              onClick={() => setActiveTab('Wasiat & Akta')}
              className="text-xs font-semibold text-[#2d6958] hover:text-[#182b29] flex items-center gap-1 transition cursor-pointer"
            >
              <span>Lihat semua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0ede6] text-[#69736f] font-semibold uppercase text-[10px] tracking-wider border-b border-[#dfddd6]">
                <tr>
                  <th className="py-3 px-4">Dokumen / Akta</th>
                  <th className="py-3 px-3">Klien</th>
                  <th className="py-3 px-3">Enkripsi</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Nilai / Akses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfddd6]">
                {filteredDocuments.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#f5f3ee] transition group">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#182b29]">{doc.title}</div>
                      <div className="text-[10px] text-[#69736f] font-mono">{doc.id}</div>
                    </td>
                    <td className="py-3.5 px-3 text-[#182b29] font-medium">{doc.client}</td>
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
                        {doc.algorithm.includes('Super') ? 'Super Enkripsi' : doc.algorithm}
                      </span>
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
                    <td className="py-3.5 px-4 text-right font-semibold text-[#182b29]">
                      {doc.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#f5f3ee] border-t border-[#dfddd6] flex items-center justify-between text-xs text-[#69736f]">
            <span>Menampilkan {Math.min(5, filteredDocuments.length)} dari {documents.length} akta tersimpan</span>
            <button
              onClick={onOpenAddModal}
              className="text-[#2d6958] font-semibold hover:underline cursor-pointer"
            >
              + Tambah Dokumen Baru
            </button>
          </div>
        </div>

        {/* Right Column: Cryptographic Audit Feed & Quick Tools */}
        <div className="space-y-6">
          {/* Audit Feed */}
          <div className="bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#dfddd6]">
              <div>
                <h2 className="font-serif text-base text-[#182b29] font-medium">Log Audit Kriptografis</h2>
                <p className="text-[11px] text-[#69736f]">Jejak segel dan aktivitas notaris</p>
              </div>
              <Clock className="w-4 h-4 text-[#69736f]" />
            </div>

            <div className="mt-4 space-y-4">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <span
                    className={`p-1.5 rounded-full shrink-0 mt-0.5 ${
                      log.tone === 'wine'
                        ? 'bg-[#762e3b]/10 text-[#762e3b]'
                        : log.tone === 'green'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.tone === 'amber'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="text-[#182b29] font-semibold block">{log.action}</strong>
                    <p className="text-[11px] text-[#69736f] truncate">{log.detail}</p>
                    <span className="text-[10px] text-[#8c9491] font-mono mt-0.5 block">
                      {log.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('Chain of Title')}
              className="w-full mt-4 py-2 rounded-lg bg-[#f0ede6] hover:bg-[#e6e2d8] text-xs font-semibold text-[#182b29] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Buka Chain of Title Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Cryptography Lab Shortcuts */}
          <div className="p-4 rounded-xl bg-[#142825] text-white border border-[#29403c] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#88bbaa]">
              <Sparkles className="w-4 h-4" />
              <span>Laboratorium Kriptografi</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('Super Enkripsi')}
                className="w-full p-2.5 rounded-lg bg-[#1b3531] hover:bg-[#23433e] text-left transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#88bbaa]" />
                    Super Enkripsi Teks
                  </div>
                  <div className="text-[10px] text-[#9caaa6]">Vigenere + AES-256 Stream</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#88bbaa]" />
              </button>

              <button
                onClick={() => setActiveTab('Steganografi')}
                className="w-full p-2.5 rounded-lg bg-[#1b3531] hover:bg-[#23433e] text-left transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-[#88bbaa]" />
                    Steganografi Bukti Fisik
                  </div>
                  <div className="text-[10px] text-[#9caaa6]">Penyisipan LSB ke Gambar</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#88bbaa]" />
              </button>

              <button
                onClick={() => setActiveTab('Berkas Terenkripsi')}
                className="w-full p-2.5 rounded-lg bg-[#1b3531] hover:bg-[#23433e] text-left transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#88bbaa]" />
                    Enkripsi File PDF
                  </div>
                  <div className="text-[10px] text-[#9caaa6]">AES-256 & ChaCha20 Nonce Tag</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#88bbaa]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
