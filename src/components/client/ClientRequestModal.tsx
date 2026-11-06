import React, { useState } from 'react';
import { X, Send, FileText, AlertCircle } from 'lucide-react';
import { createClientRequest } from '../../services/api';
import type { ClientRequestItem } from '../../types';

interface ClientRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onRequestCreated: (req: ClientRequestItem) => void;
}

export const ClientRequestModal: React.FC<ClientRequestModalProps> = ({
  isOpen,
  onClose,
  clientName,
  onRequestCreated,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pendaftaran Aset');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Judul permintaan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const created = await createClientRequest({
        client_name: clientName,
        title: title.trim(),
        category,
        notes: notes.trim(),
      });

      onRequestCreated(created);
      setTitle('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirimkan permintaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-[#263640] text-white flex items-center justify-between border-b border-[#3a4c56]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3b525e] text-cyan-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest text-[#8db3b9] uppercase">
                PORTAL LAYANAN NOTARIS
              </span>
              <h3 className="font-serif text-lg text-white font-medium">
                Ajukan Permintaan / Konsultasi Baru
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-[#edf2f4] border border-[#d2dde0] text-xs text-[#304854]">
            Permintaan akan langsung diteruskan secara aman ke meja kerja Notaris Natasha S.H., M.Kn.
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17221f] mb-1">
              Nama Klien Pengaju
            </label>
            <input
              type="text"
              disabled
              value={clientName}
              className="w-full px-3 py-2 rounded-lg bg-[#e8ecee] border border-[#d2dde0] text-xs text-gray-700 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17221f] mb-1">
              Kategori Kebutuhan Hukum *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#17221f] focus:outline-none focus:border-[#3f606e]"
            >
              <option value="Pendaftaran Aset">Pendaftaran Aset / Sertifikat Tanah</option>
              <option value="Surat Wasiat">Pembuatan / Perubahan Surat Wasiat</option>
              <option value="Akta Perjanjian">Akta Perjanjian & Kontrak Bisnis</option>
              <option value="Tanda Tangan Digital">Permohonan Tanda Tangan Digital</option>
              <option value="Verifikasi Dokumen">Verifikasi Keaslian Dokumen Hukum</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17221f] mb-1">
              Judul Permintaan / Perihal *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Perubahan Klausul Ahli Waris Properti Menteng"
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#17221f] focus:outline-none focus:border-[#3f606e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17221f] mb-1">
              Catatan & Keterangan Tambahan
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jelaskan kebutuhan dokumen, nomor sertifikat yang bersangkutan, atau pertanyaan Anda..."
              className="w-full p-3 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#17221f] focus:outline-none focus:border-[#3f606e]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#dfddd6]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[#3f606e] hover:bg-[#334f5b] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Mengirimkan...' : 'Kirim Permintaan ke Notaris'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
