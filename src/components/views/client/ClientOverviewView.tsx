import React from 'react';
import {
  Building2,
  FileText,
  Clock,
  Link2,
  Lock,
  Fingerprint,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { DocumentItem, UserSession } from '../../../types';

interface ClientOverviewViewProps {
  session: UserSession;
  clientDocuments: DocumentItem[];
  onOpenRequestModal: () => void;
  onNavigateTab: (tabName: string) => void;
}

export const ClientOverviewView: React.FC<ClientOverviewViewProps> = ({
  session,
  clientDocuments,
  onOpenRequestModal,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#526d78] uppercase">
            PORTAL KEPERCAYAAN & BRANKAS HUKUM PRIBADI
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1e2d35] font-medium tracking-tight mt-0.5">
            Selamat datang, {session.displayName}.
          </h1>
          <p className="text-xs sm:text-sm text-[#5f7480] mt-1">
            Seluruh berkas kepemilikan aset, wasiat, dan akta hukum Anda tersimpan aman dan terenkripsi secara kriptografis.
          </p>
        </div>

        <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-[#d5e0e3] shadow-xs text-xs self-start">
          <Fingerprint className="w-5 h-5 text-[#3f606e]" />
          <div>
            <div className="font-semibold text-[#1e2d35] text-[11px] leading-tight">
              Identitas Terverifikasi
            </div>
            <div className="text-[10px] text-[#5f7480]">Biometrik + OTP Pribadi Klien</div>
          </div>
        </div>
      </section>

      {/* Security notice for client */}
      <section className="p-4 rounded-xl bg-[#edf4f6] text-[#2c404a] border border-[#d2dde0] border-l-4 border-l-[#527784] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#dfecee] text-[#3f606e] shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <strong className="text-sm font-semibold text-[#1e2d35] block">
              Hanya Anda dan Notaris Natasha S.H., M.Kn. yang memiliki kunci akses ke berkas ini.
            </strong>
            <p className="text-xs text-[#526974] mt-0.5">
              Setiap perubahan kepemilikan dan tanda tangan akta dilindungi jejak kriptografis anti-manipulasi (Chain of Title).
            </p>
          </div>
        </div>

        <button
          onClick={onOpenRequestModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#3f606e] hover:bg-[#334f5b] text-white text-xs font-semibold shrink-0 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajukan Permintaan</span>
        </button>
      </section>

      {/* Metric Cards (Client context) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-[#3f606e]/10 text-[#3f606e]">
              <Building2 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Semua Sah
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#69736f] uppercase block">
            ASET TERDAFTAR SAYA
          </span>
          <div className="font-serif text-2xl font-bold text-[#1e2d35] mt-0.5">
            {clientDocuments.length > 0 ? clientDocuments.length : 3}
          </div>
          <p className="text-xs text-[#69736f] mt-1">
            Tercatat di <b className="text-[#1e2d35]">BPN & Kemenkumham</b>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-[#762e3b]/10 text-[#762e3b]">
              <FileText className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              1 perlu tanda tangan
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#69736f] uppercase block">
            DOKUMEN HUKUM & WASIAT
          </span>
          <div className="font-serif text-2xl font-bold text-[#1e2d35] mt-0.5">4</div>
          <p className="text-xs text-[#69736f] mt-1">3 terverifikasi · 1 menunggu persetujuan</p>
        </div>

        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Prioritas
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#69736f] uppercase block">
            PERLU TINDAKAN ANDA
          </span>
          <div className="font-serif text-2xl font-bold text-[#1e2d35] mt-0.5">1</div>
          <p className="text-xs text-[#69736f] mt-1">Tanda tangan digital Surat Wasiat</p>
        </div>

        <div className="p-4 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Link2 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Terverifikasi
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#69736f] uppercase block">
            RIWAYAT KEPEMILIKAN
          </span>
          <div className="font-serif text-2xl font-bold text-[#1e2d35] mt-0.5">12</div>
          <p className="text-xs text-[#69736f] mt-1">Blok tersimpan dalam buku besar sah</p>
        </div>
      </section>

      {/* Main Grid: My Documents & Recent Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Assets & Deeds Table */}
        <div className="lg:col-span-2 bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#dfddd6] flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg text-[#1e2d35] font-medium">Aset & Dokumen Saya</h2>
              <p className="text-xs text-[#69736f] mt-0.5">
                Hanya data yang terhubung dengan akun dan identitas resmi Anda
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('Aset Saya')}
              className="text-xs font-semibold text-[#3f606e] hover:text-[#1e2d35] flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat semua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0ede6] text-[#69736f] font-semibold uppercase text-[10px] tracking-wider border-b border-[#dfddd6]">
                <tr>
                  <th className="py-3 px-4">Nama Dokumen / Aset</th>
                  <th className="py-3 px-3">Klasifikasi</th>
                  <th className="py-3 px-3">Enkripsi</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Nilai Tercatat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfddd6]">
                {clientDocuments.length > 0 ? (
                  clientDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#f5f3ee] transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1e2d35] text-xs">{doc.title}</div>
                        <div className="text-[10px] text-[#69736f] font-mono mt-0.5">{doc.id}</div>
                      </td>
                      <td className="py-3.5 px-3 text-[#69736f]">{doc.type}</td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-100 text-emerald-800">
                          <Lock className="w-2.5 h-2.5" />
                          {doc.algorithm}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            doc.status === 'Terverifikasi'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              doc.status === 'Terverifikasi' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#1e2d35]">
                        {doc.value}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-xs">
                      Belum ada aset khusus yang terhubung dengan akun Anda. Klik "Ajukan Permintaan" untuk mendaftarkan aset baru ke kantor notaris.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Updates from Notary */}
        <div className="space-y-4">
          <div className="bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-xs p-5">
            <h2 className="font-serif text-base text-[#1e2d35] font-medium">Pembaruan untuk Anda</h2>
            <p className="text-[11px] text-[#69736f] mb-3">Informasi langsung dari kantor notaris</p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Permintaan Tanda Tangan Digital</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Notaris Natasha telah mengirim draf Wasiat Keluarga untuk Anda setujui dengan tanda tangan digital aman.
                </p>
                <div className="text-[10px] text-amber-700 pt-1 font-mono">Batas: 27 Juni 2025</div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sertifikat Berhasil Diverifikasi</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Sertifikat Rumah Tinggal Pondok Indah dinyatakan sah dan disegel di blockchain.
                </p>
                <div className="text-[10px] text-emerald-700 pt-1 font-mono">Senin, 10.24 WIB</div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('Permintaan')}
              className="w-full mt-4 py-2 rounded-lg bg-[#edf2f4] hover:bg-[#e1e9ec] text-xs font-semibold text-[#1e2d35] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Lihat Riwayat Permintaan Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
