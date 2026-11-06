import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Calendar,
} from 'lucide-react';
import type { ClientRequestItem } from '../../../types';

interface ClientRequestsViewProps {
  requests: ClientRequestItem[];
  onOpenModal: () => void;
}

export const ClientRequestsView: React.FC<ClientRequestsViewProps> = ({
  requests,
  onOpenModal,
}) => {
  const [filter, setFilter] = useState('Semua');

  const filtered = requests.filter((r) => {
    if (filter === 'Semua') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#526d78] uppercase">
            LAYANAN KONSULTASI & AKTA
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1e2d35] font-medium tracking-tight mt-0.5">
            Permintaan Layanan Notaris
          </h1>
          <p className="text-xs sm:text-sm text-[#5f7480] mt-1">
            Status pengajuan pendaftaran aset, konsultasi wasiat, dan permohonan tanda tangan digital Anda.
          </p>
        </div>

        <button
          onClick={onOpenModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3f606e] hover:bg-[#334f5b] text-white text-xs font-semibold shadow-xs transition self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajukan Permintaan Baru</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['Semua', 'Menunggu Peninjauan', 'Sedang Diproses', 'Selesai & Tersegel'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              filter === tab
                ? 'bg-[#263640] text-white'
                : 'bg-[#edf2f4] text-[#526d78] hover:bg-[#e1e9ec]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length > 0 ? (
          filtered.map((req) => (
            <div
              key={req.id}
              className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs hover:border-[#526d78] transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-[#69736f]">{req.id}</span>
                  <h3 className="font-semibold text-sm text-[#1e2d35]">{req.title}</h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    req.status === 'Selesai & Tersegel'
                      ? 'bg-emerald-100 text-emerald-800'
                      : req.status === 'Sedang Diproses'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {req.status}
                </span>
              </div>

              <div className="text-xs text-[#526974] space-y-1">
                <div className="font-medium text-[#1e2d35]">Kategori: {req.category}</div>
                {req.notes && <p className="text-[11px] bg-white p-2.5 rounded border border-[#dfddd6]">{req.notes}</p>}
              </div>

              <div className="pt-2 border-t border-[#dfddd6] flex items-center justify-between text-[10px] text-[#69736f]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Diajukan: {new Date(req.created_at).toLocaleDateString('id-ID')}
                </span>
                <span className="font-medium text-[#3f606e]">Notaris Natasha S.H.</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-12 text-center text-xs text-gray-500 bg-[#fbfaf7] rounded-xl border border-[#dfddd6]">
            Belum ada permintaan dalam kategori ini. Klik "Ajukan Permintaan Baru" untuk mengirim pesan ke kantor notaris.
          </div>
        )}
      </div>
    </div>
  );
};
