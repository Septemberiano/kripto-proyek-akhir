import React, { useState, useEffect } from 'react';
import {
  X,
  FilePlus,
  Lock,
  Shield,
  Database,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { DocumentItem, DocumentType, EncryptionAlgorithm } from '../types';
import { sha256, modernStreamEncrypt, superEncrypt } from '../utils/crypto';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (doc: Omit<DocumentItem, 'id' | 'created_at'>) => Promise<void>;
  isBackendOnline: boolean;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isBackendOnline,
}) => {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [type, setType] = useState<DocumentType>('Akta Notaris');
  const [value, setValue] = useState('Rp 5,0 M');
  const [algorithm, setAlgorithm] = useState<EncryptionAlgorithm>('AES-256-GCM');
  const [plainContent, setPlainContent] = useState('');
  const [encryptedPreview, setEncryptedPreview] = useState('');
  const [hashPreview, setHashPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update encrypted preview and hash in real-time as user types
  useEffect(() => {
    let isCurrent = true;

    const computeEncryption = async () => {
      const textToEncrypt = plainContent || `${title} untuk klien ${client}`;

      if (algorithm === 'Super-Encrypted (Vigenere + AES)') {
        const superRes = await superEncrypt(textToEncrypt, 'NOTARISNUSA', 'AES-NOTARIAL-KEY-2025');
        if (isCurrent) {
          setEncryptedPreview(superRes.modernCipher);
          setHashPreview(superRes.sha256Hash);
        }
      } else {
        const modernEnc = modernStreamEncrypt(textToEncrypt, 'AES-NOTARIAL-SECRET-2025');
        const hash = await sha256(modernEnc);
        if (isCurrent) {
          setEncryptedPreview(modernEnc);
          setHashPreview(hash);
        }
      }
    };

    computeEncryption();

    return () => {
      isCurrent = false;
    };
  }, [plainContent, title, client, algorithm]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !client.trim() || !plainContent.trim()) {
      setErrorMessage('Judul, Klien, dan Teks Dokumen wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSubmit({
        title: title.trim(),
        client: client.trim(),
        type,
        value: value.trim() || 'Rahasia',
        status: 'Terverifikasi',
        encrypted_content: encryptedPreview,
        algorithm,
        sha256_hash: hashPreview,
      });

      // Reset and close
      setTitle('');
      setClient('');
      setPlainContent('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan dokumen ke database SQLite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillSample = () => {
    setTitle('Akta Hibah Tanah Menteng #094/2025');
    setClient('Budi Santoso');
    setType('Sertifikat Tanah');
    setValue('Rp 15,4 M');
    setPlainContent(
      'KLAUSUL HIBAH TANAH: Pemberian hak milik penuh atas sebidang tanah kavling seluas 620 m² yang terletak di Menteng, Jakarta Pusat, kepada penerima hibah tanpa syarat pembatalan.'
    );
    setAlgorithm('AES-256-GCM');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#142825] text-white flex items-center justify-between border-b border-[#29403c]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#26413c] text-emerald-300">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest text-[#88bbaa] uppercase">
                FORMULIR PENCATATAN AKTA
              </span>
              <h3 className="font-serif text-lg text-white font-medium">
                Tambah Dokumen & Akta Baru
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#26413c] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick sample filler */}
          <div className="flex items-center justify-between text-xs pb-1">
            <span className="text-[#69736f]">Isi formulir pendaftaran akta notaris:</span>
            <button
              type="button"
              onClick={handleFillSample}
              className="text-[#2d6958] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Muat Contoh Data
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Judul Dokumen / Akta *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Akta Jual Beli Menteng"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Nama Klien Terdaftar *
              </label>
              <input
                type="text"
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Jenis Dokumen Notarial
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
              >
                <option value="Sertifikat Tanah">Sertifikat Tanah</option>
                <option value="Surat Wasiat">Surat Wasiat</option>
                <option value="Kepemilikan Saham">Kepemilikan Saham</option>
                <option value="Akta Notaris">Akta Notaris</option>
                <option value="Perjanjian Bisnis">Perjanjian Bisnis</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Nilai Aset / Klasifikasi
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Contoh: Rp 12,8 M / Rahasia"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
              />
            </div>
          </div>

          {/* Algorithm selector */}
          <div>
            <label className="block text-xs font-semibold text-[#182b29] mb-1">
              Algoritma Enkripsi yang Digunakan
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAlgorithm('AES-256-GCM')}
                className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer text-center ${
                  algorithm === 'AES-256-GCM'
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-[#55635f] border-[#dfddd6] hover:bg-[#f5f3ee]'
                }`}
              >
                AES-256-GCM
              </button>
              <button
                type="button"
                onClick={() => setAlgorithm('ChaCha20-Poly1305')}
                className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer text-center ${
                  algorithm === 'ChaCha20-Poly1305'
                    ? 'bg-cyan-800 text-white border-cyan-800'
                    : 'bg-white text-[#55635f] border-[#dfddd6] hover:bg-[#f5f3ee]'
                }`}
              >
                ChaCha20
              </button>
              <button
                type="button"
                onClick={() => setAlgorithm('Super-Encrypted (Vigenere + AES)')}
                className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer text-center ${
                  algorithm === 'Super-Encrypted (Vigenere + AES)'
                    ? 'bg-purple-800 text-white border-purple-800'
                    : 'bg-white text-[#55635f] border-[#dfddd6] hover:bg-[#f5f3ee]'
                }`}
              >
                Super Enkripsi
              </button>
            </div>
          </div>

          {/* Secret plaintext content */}
          <div>
            <label className="block text-xs font-semibold text-[#182b29] mb-1">
              Isi Teks Dokumen / Klausul Rahasia (Akan Otomatis Dienkripsi) *
            </label>
            <textarea
              rows={3}
              required
              value={plainContent}
              onChange={(e) => setPlainContent(e.target.value)}
              placeholder="Masukkan klausul, hak waris, atau perincian akta rahasia yang akan dienkripsi..."
              className="w-full p-3 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] font-mono focus:outline-none focus:border-[#2d6958]"
            />
          </div>

          {/* Real-time Crypto Output preview */}
          <div className="p-3.5 rounded-lg bg-[#0e1d1a] border border-[#233a35] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-[#88bbaa]">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Pratinjau Hasil Enkripsi Realtime
              </span>
              <span className="font-mono text-[10px] text-emerald-400">
                {algorithm}
              </span>
            </div>
            <div className="font-mono text-[11px] text-emerald-300 break-all max-h-16 overflow-y-auto">
              {encryptedPreview || '[Menunggu input teks...]'}
            </div>

            <div className="pt-2 border-t border-[#233a35] flex items-center justify-between text-[10px] font-mono text-[#81938e]">
              <span>SHA-256 Digest:</span>
              <span className="text-white truncate max-w-[280px]">
                {hashPreview || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </span>
            </div>
          </div>

          {/* Database Target Status */}
          <div className="flex items-center justify-between text-[11px] text-[#69736f] pt-1">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#2d6958]" />
              <span>
                Target: {isBackendOnline ? 'SQLite Database (http://localhost:5000)' : 'Penyimpanan Lokal'}
              </span>
            </div>
            <span
              className={`font-semibold ${
                isBackendOnline ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isBackendOnline ? '● Online' : '○ Offline Cache'}
            </span>
          </div>

          {/* Submit buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#dfddd6]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-[#182b29] text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan ke SQLite...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Enkripsi & Simpan ke Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
