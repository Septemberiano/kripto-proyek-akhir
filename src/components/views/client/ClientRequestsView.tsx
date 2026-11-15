import React, { useEffect, useState } from 'react';
import {
  Clock,
  Plus,
  Calendar,
  FileCheck,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import type { ClientRequestItem, DocumentItem } from '../../../types';
import { decryptRequestNotes } from '../../../utils/crypto';

interface ClientRequestsViewProps {
  requests: ClientRequestItem[];
  clientDocuments?: DocumentItem[];
  onOpenModal: () => void;
  onNavigateTab?: (tabName: string) => void;
  onSignDocument?: (doc: DocumentItem) => void;
}

export const ClientRequestsView: React.FC<ClientRequestsViewProps> = ({
  requests,
  clientDocuments = [],
  onOpenModal,
  onNavigateTab,
  onSignDocument,
}) => {
  const [filter, setFilter] = useState('Semua');
  const [decryptedNotesMap, setDecryptedNotesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const decodeAllNotes = async () => {
      const entries = await Promise.all(
        requests.map(async (req) => [req.id, await decryptRequestNotes(req.notes || '')] as const)
      );
      if (active) {
        setDecryptedNotesMap(Object.fromEntries(entries));
      }
    };
    decodeAllNotes();
    return () => {
      active = false;
    };
  }, [requests]);

  const filtered = requests.filter((r) => {
    if (filter === 'Semua') return true;
    return r.status === filter;
  });

  const getStepIndex = (status: ClientRequestItem['status']) => {
    switch (status) {
      case 'Menunggu Peninjauan':
        return 1;
      case 'Sedang Diproses':
        return 2;
      case 'Menunggu TTD Klien':
      case 'Menunggu Pengesahan Notaris':
        return 3;
      case 'Selesai & Tersegel':
        return 4;
      case 'Ditolak':
        return -1;
      default:
        return 1;
    }
  };

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
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold shadow-xs transition self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajukan Permintaan Baru</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          'Semua',
          'Menunggu Peninjauan',
          'Sedang Diproses',
          'Menunggu TTD Klien',
          'Menunggu Pengesahan Notaris',
          'Selesai & Tersegel',
          'Ditolak',
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              filter === tab
                ? 'bg-[#263640] text-white shadow-xs'
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
          filtered.map((req) => {
            const step = getStepIndex(req.status);
            return (
              <div
                key={req.id}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-emerald-500 transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {req.id}
                      </span>
                      <h3 className="font-semibold text-base text-slate-900 mt-1">{req.title}</h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        req.status === 'Selesai & Tersegel'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : req.status === 'Sedang Diproses' || req.status === 'Menunggu Pengesahan Notaris'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : req.status === 'Ditolak'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {req.status}
                    </span>
                  </div>

                  {/* Category & notes */}
                  <div className="text-xs text-slate-600 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Kategori:</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-medium text-[11px]">
                        {req.category}
                      </span>
                    </div>

                    {req.notes && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-slate-700">Catatan Anda:</span>
                          {req.notes.startsWith('AESGCM1:') && (
                            <span className="text-[9px] font-mono text-emerald-700">
                              AES-256-GCM Encrypted
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800">{decryptedNotesMap[req.id] ?? req.notes}</p>
                      </div>
                    )}

                    {req.notary_notes && (
                      <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-[11px]">
                        <span className="font-semibold text-emerald-900 block mb-0.5">
                          Tanggapan Notaris:
                        </span>
                        <p className="text-emerald-950">{req.notary_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Progress Pipeline Stepper */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">
                      Progres Kenotariatan:
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div className={`p-1.5 rounded ${step >= 1 ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'bg-slate-100 text-slate-400'}`}>
                        <div className="text-[9px]">1. Diajukan</div>
                      </div>
                      <div className={`p-1.5 rounded ${step >= 2 ? 'bg-blue-100 text-blue-900 font-semibold' : 'bg-slate-100 text-slate-400'}`}>
                        <div className="text-[9px]">2. Ditelaah</div>
                      </div>
                      <div className={`p-1.5 rounded ${step >= 3 || step === 4 ? 'bg-indigo-100 text-indigo-900 font-semibold' : 'bg-slate-100 text-slate-400'}`}>
                        <div className="text-[9px]">3. Ditandatangani</div>
                      </div>
                      <div className={`p-1.5 rounded ${step === 4 ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-400'}`}>
                        <div className="text-[9px]">4. Tersegel</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with Document Link if ready */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Diajukan: {new Date(req.created_at).toLocaleDateString('id-ID')}
                  </span>

                  {req.status === 'Menunggu TTD Klien' && req.document_id && onSignDocument ? (
                    (() => {
                      const linkedDoc = clientDocuments.find((d) => d.id === req.document_id);
                      return linkedDoc ? (
                        <button
                          onClick={() => onSignDocument(linkedDoc)}
                          className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center gap-1.5 self-start sm:self-center transition cursor-pointer shadow-xs"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Tandatangani Draf Sekarang</span>
                        </button>
                      ) : (
                        <span className="font-medium text-amber-700">Menunggu TTD Anda di Dokumen Saya</span>
                      );
                    })()
                  ) : req.status === 'Selesai & Tersegel' && onNavigateTab ? (
                    <button
                      onClick={() => onNavigateTab('Dokumen Saya')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs flex items-center gap-1 self-start sm:self-center transition cursor-pointer shadow-xs"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Buka Dokumen Akta Terbit</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="font-medium text-[#2d6958]">Kantor Notaris Natasha S.H.</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 py-12 text-center text-xs text-gray-500 bg-[#fbfaf7] rounded-xl border border-[#dfddd6]">
            Belum ada permintaan dalam kategori ini. Klik "Ajukan Permintaan Baru" untuk mengirim warkah ke kantor notaris.
          </div>
        )}
      </div>
    </div>
  );
};
