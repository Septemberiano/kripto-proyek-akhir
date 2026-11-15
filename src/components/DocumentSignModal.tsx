import React, { useState } from 'react';
import {
  X,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
  Usb,
  Camera,
  AlertCircle,
  FileCheck,
  UserCheck,
} from 'lucide-react';
import type { DocumentItem, UserSession } from '../types';
import { sha256, signPayloadECDSA } from '../utils/crypto';
import { FaceRecognitionModal } from './FaceRecognitionModal';

interface DocumentSignModalProps {
  document: DocumentItem | null;
  session: UserSession;
  onClose: () => void;
  onSign: (
    doc: DocumentItem,
    payload: {
      signerRole: 'client' | 'admin';
      signerName: string;
      username?: string;
      passwordHash?: string;
      authMethod?: string;
      signatureHash?: string;
      publicKey?: string;
    }
  ) => Promise<void>;
}

export const DocumentSignModal: React.FC<DocumentSignModalProps> = ({
  document,
  session,
  onClose,
  onSign,
}) => {
  const [consentChecked, setConsentChecked] = useState(false);
  const [clientPassword, setClientPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Notary biometric fallback state
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isFaceAuthorized, setIsFaceAuthorized] = useState(false);
  const [faceConfidence, setFaceConfidence] = useState<number | null>(null);

  if (!document) return null;

  const isClientRole = session.role === 'client';
  const isNotaryRole = session.role === 'admin';
  const notaryHasValidAuth = session.isDongleConnected || isFaceAuthorized;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!consentChecked) {
      setErrorMsg('Harap centang pernyataan persetujuan hukum terlebih dahulu.');
      return;
    }

    if (isClientRole) {
      if (!clientPassword.trim()) {
        setErrorMsg('Masukkan kata sandi akun Anda untuk mengotorisasi tanda tangan digital.');
        return;
      }
    } else if (isNotaryRole && !notaryHasValidAuth) {
      setErrorMsg(
        'Hardware USB Dongle tidak terhubung. Lakukan verifikasi Face ID Notaris terlebih dahulu.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isClientRole) {
        const passwordHash = await sha256(clientPassword);
        const canonicalMsg = `CLIENT_SIGN|${document.id}|${document.sha256_hash}|${session.displayName}`;
        const ecdsaSig = await signPayloadECDSA(`client:${session.username}`, canonicalMsg);
        await onSign(document, {
          signerRole: 'client',
          signerName: session.displayName,
          username: session.username,
          passwordHash,
          signatureHash: ecdsaSig.signatureHex,
          publicKey: ecdsaSig.publicKeyJson,
        });
      } else {
        const authMethod = isFaceAuthorized
          ? `Face Recognition (${faceConfidence ?? 99}%)`
          : 'USB Dongle Token';
        const canonicalMsg = `NOTARY_SEAL|${document.id}|${document.sha256_hash}|${
          document.client_signature_hash || ''
        }|${session.displayName}`;
        const ecdsaSig = await signPayloadECDSA(`notary:${session.username}`, canonicalMsg);
        await onSign(document, {
          signerRole: 'admin',
          signerName: session.displayName,
          username: session.username,
          authMethod,
          signatureHash: ecdsaSig.signatureHex,
          publicKey: ecdsaSig.publicKeyJson,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal membubuhkan tanda tangan digital.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div
          className={`p-4 sm:p-5 text-white flex items-center justify-between border-b ${
            isClientRole ? 'bg-[#263640] border-[#3a4c56]' : 'bg-[#142825] border-[#29403c]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isClientRole ? 'bg-[#3b525e] text-emerald-300' : 'bg-[#26413c] text-emerald-300'
              }`}
            >
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest text-[#88bbaa] uppercase">
                {isClientRole
                  ? 'TAHAP 1 · TANDA TANGAN PERSETUJUAN KLIEN'
                  : 'TAHAP 2 · PENGESAHAN & SEGEL AKHIR NOTARIS'}
              </span>
              <h3 className="font-serif text-lg text-white font-medium">{document.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dual-Signature Pipeline Indicator */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`p-3 rounded-lg border ${
                document.client_signature_hash
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <UserCheck className="w-3.5 h-3.5" />
                <span>1. Persetujuan Klien</span>
              </div>
              <p className="text-[10px] mt-1 opacity-85">
                {document.client_signature_hash
                  ? `Ditandatangani: ${document.client_signed_by}`
                  : document.status === 'Menunggu tanda tangan'
                  ? 'Menunggu tanda tangan klien'
                  : 'Belum ada hash tanda tangan klien'}
              </p>
            </div>

            <div
              className={`p-3 rounded-lg border ${
                document.status === 'Terverifikasi'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : document.status === 'Dalam peninjauan'
                  ? 'bg-blue-50 border-blue-300 text-blue-950'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <Shield className="w-3.5 h-3.5" />
                <span>2. Pengesahan Notaris</span>
              </div>
              <p className="text-[10px] mt-1 opacity-85">
                {document.status === 'Terverifikasi'
                  ? 'Tersegel & Sah'
                  : document.status === 'Dalam peninjauan'
                  ? 'Siap disahkan Notaris'
                  : 'Menunggu Tahap 1 selesai'}
              </p>
            </div>
          </div>

          {/* Document Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-[#f0ede6] border border-[#dfddd6]">
            <div>
              <span className="text-[10px] text-[#69736f] block uppercase">Nomor Akta</span>
              <strong className="font-mono text-[#182b29]">{document.id}</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#69736f] block uppercase">Nama Klien</span>
              <strong className="text-[#182b29]">{document.client}</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#69736f] block uppercase">Kategori</span>
              <strong className="text-[#182b29]">{document.type}</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#69736f] block uppercase">Nilai Tercatat</span>
              <strong className="text-[#182b29]">{document.value}</strong>
            </div>
          </div>

          {/* Existing Client Signature Proof (visible for Notary on Step 2) */}
          {document.client_signature_hash && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Bukti Tanda Tangan Persetujuan Klien Valid
                </span>
                <span className="text-[10px] font-mono text-emerald-700">
                  {document.client_signed_at
                    ? new Date(document.client_signed_at).toLocaleString('id-ID')
                    : ''}
                </span>
              </div>
              <div className="text-[10px] font-mono text-emerald-800 break-all">
                Sig Hash: {document.client_signature_hash}
              </div>
            </div>
          )}

          {/* Document Content Summary */}
          <div className="p-3.5 rounded-lg bg-white border border-[#dfddd6] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#182b29]">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#2d6958]" />
                Ringkasan Naskah yang Disetujui / Disahkan
              </span>
              <span className="font-mono text-[10px] text-[#69736f]">{document.algorithm}</span>
            </div>
            <p className="font-serif text-xs text-[#2d3b37] leading-relaxed bg-[#fbfaf7] p-2.5 rounded border border-[#eceae4]">
              Dokumen resmi bertajuk <strong>"{document.title}"</strong> ({document.id}) atas nama{' '}
              <strong>{document.client}</strong> dengan nilai tercatat <strong>{document.value}</strong>.
              Integritas dokumen diikat dengan digest SHA-256:
              <span className="block font-mono text-[10px] text-[#55635f] mt-1 break-all">
                {document.sha256_hash}
              </span>
            </p>
          </div>

          {/* Role-specific Verification Section */}
          {isClientRole ? (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Konfirmasi Kata Sandi Akun Klien ({session.username}) *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    placeholder="Masukkan kata sandi login Anda..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Kata sandi diverifikasi dengan SHA-256 untuk menjamin nir-penyangkalan (non-repudiation) penandatangan.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-[#f0ede6] border border-[#dfddd6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-[#69736f] uppercase block font-semibold">
                  Otoritas Pengesahan Notaris
                </span>
                <strong className="text-xs text-[#182b29] block">{session.displayName}</strong>
                <span className="text-[11px] text-[#69736f]">
                  {isFaceAuthorized
                    ? `Face Recognition Terverifikasi (${faceConfidence}%)`
                    : session.isDongleConnected
                    ? 'Hardware USB Dongle Aktif (FIPS 140-2)'
                    : 'USB Dongle Tidak Terhubung · Wajib Face ID'}
                </span>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {isFaceAuthorized ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Face ID Sah
                  </span>
                ) : session.isDongleConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-300">
                    <Usb className="w-3.5 h-3.5" />
                    Dongle Aktif
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsFaceModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#182b29] hover:bg-black text-white text-[10px] font-semibold transition cursor-pointer shadow-xs"
                >
                  <Camera className="w-3 h-3 text-emerald-300" />
                  <span>{isFaceAuthorized ? 'Pindai Ulang' : 'Verifikasi Face ID'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 rounded border-emerald-400 text-emerald-700 focus:ring-emerald-600"
            />
            <span className="text-[11px] text-emerald-950 leading-relaxed">
              {isClientRole
                ? `Saya (${session.displayName}) menyatakan telah membaca isi draf "${document.title}" dan menyetujui pembubuhan tanda tangan digital saya sebelum disahkan oleh Notaris.`
                : `Saya (${session.displayName}) menyatakan dokumen "${document.title}" telah memenuhi ketentuan hukum UUJN dan siap disegel secara permanen menjadi status Terverifikasi.`}
            </span>
          </label>

          {/* Footer */}
          <div className="pt-3 border-t border-[#dfddd6] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#dfddd6] hover:bg-[#f0ede6] text-xs font-semibold text-[#182b29] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (isNotaryRole && !notaryHasValidAuth)}
              className="px-5 py-2 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Memproses Tanda Tangan...'
                  : isClientRole
                  ? 'Bubuhkan Tanda Tangan Klien'
                  : 'Sahkan & Segel Akhir Akta'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {isNotaryRole && (
        <FaceRecognitionModal
          isOpen={isFaceModalOpen}
          onClose={() => setIsFaceModalOpen(false)}
          onSuccess={(result) => {
            setIsFaceAuthorized(true);
            setFaceConfidence(result.confidence);
            setErrorMsg('');
          }}
          purposeTitle="Otorisasi Pengesahan & Segel Akhir Dokumen"
          expectedName={session.displayName}
          signerUsername={session.username}
          registeredPhotoUrl={session.photo_url}
        />
      )}
    </div>
  );
};
