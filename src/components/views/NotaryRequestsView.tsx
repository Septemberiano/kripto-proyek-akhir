import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  KeyRound,
  ChevronRight,
  Usb,
  X,
  FileText,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  Building2,
  Camera,
} from 'lucide-react';
import type { ClientRequestItem, DocumentType, EncryptionAlgorithm } from '../../types';
import { sha256, superEncrypt, modernStreamEncrypt } from '../../utils/crypto';
import { FaceRecognitionModal } from '../FaceRecognitionModal';

interface NotaryRequestsViewProps {
  requests: ClientRequestItem[];
  onUpdateStatus: (id: string, status: ClientRequestItem['status'], notaryNotes?: string) => Promise<void>;
  onSignRequest: (
    requestId: string,
    deedPayload: {
      title: string;
      client: string;
      type: DocumentType | string;
      value: string;
      encrypted_content: string;
      algorithm: EncryptionAlgorithm | string;
      sha256_hash: string;
      notary_notes?: string;
    }
  ) => Promise<void>;
  onNavigateToDocument?: (docId: string) => void;
  searchQuery: string;
  notaryName?: string;
  notaryUsername?: string;
  notaryPhotoUrl?: string;
}

export const NotaryRequestsView: React.FC<NotaryRequestsViewProps> = ({
  requests,
  onUpdateStatus,
  onSignRequest,
  onNavigateToDocument,
  searchQuery,
  notaryName = 'Natasha S.H., M.Kn.',
  notaryUsername = 'admin',
  notaryPhotoUrl,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('Semua');
  const [signingRequest, setSigningRequest] = useState<ClientRequestItem | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<ClientRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Signing Form state
  const [deedTitle, setDeedTitle] = useState('');
  const [deedType, setDeedType] = useState<DocumentType>('Akta Notaris');
  const [deedValue, setDeedValue] = useState('Rp 500.000.000');
  const [deedAlgorithm, setDeedAlgorithm] = useState<EncryptionAlgorithm>('AES-256-GCM');
  const [classicalKey, setClassicalKey] = useState('NOTARIS2025');
  const [modernKey, setModernKey] = useState('NATASHA-SH-MKN-KEY');
  const [deedText, setDeedText] = useState('');
  const [notaryNote, setNotaryNote] = useState('');

  // Biometric Face Recognition states
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isFaceAuthorized, setIsFaceAuthorized] = useState(false);
  const [faceConfidence, setFaceConfidence] = useState<number | null>(null);

  const handleFaceSuccess = (result: {
    signerName: string;
    confidence: number;
    biometricHash: string;
  }) => {
    setIsFaceAuthorized(true);
    setFaceConfidence(result.confidence);
    setNotaryNote((prev) =>
      prev
        ? `${prev} · Diotorisasi via Face Recognition (${result.confidence}%)`
        : `Telah disahkan melalui Otorisasi Biometrik Wajah Notaris (Kesesuaian ${result.confidence}%)`
    );
  };

  // Open Signing Modal with smart defaults
  const handleOpenSignModal = (req: ClientRequestItem) => {
    setSigningRequest(req);
    setIsFaceAuthorized(false);
    setFaceConfidence(null);
    const suggestedTitle = `Akta Resmi: ${req.title}`;
    setDeedTitle(suggestedTitle);

    let defaultType: DocumentType = 'Akta Notaris';
    if (req.category.includes('Aset') || req.category.includes('Tanah')) {
      defaultType = 'Sertifikat Tanah';
    } else if (req.category.includes('Wasiat')) {
      defaultType = 'Surat Wasiat';
    } else if (req.category.includes('Perjanjian')) {
      defaultType = 'Akta Notaris';
    }
    setDeedType(defaultType);

    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const draftClause = `KOMPARISI & PENGESAHAN AKTA NOTARIAT
Nomor Register: WKH-${Date.now().toString().slice(-6)}
Pada hari ini, ${todayStr}, menghadap kepada saya:
NATASHA S.H., M.Kn.
Notaris berkedudukan di Daerah Khusus Ibukota Jakarta, dengan wilayah jabatan seluruh Daerah Khusus Ibukota Jakarta,
Berdasarkan Surat Keputusan Menteri Hukum dan Hak Asasi Manusia Republik Indonesia.

Telah datang dan menghadap:
Nama Penghadap: ${req.client_name}
Perihal Warkah  : ${req.title}
Klasifikasi    : ${req.category}
Catatan Klien  : ${req.notes || 'Tidak ada catatan tambahan'}

Penghadap menerangkan dengan sah dan benar bahwa segala data dan alas hak yang diserahkan telah memenuhi asas kepatutan hukum kenotariatan. Selanjutnya akta ini ditandatangani secara digital dengan segel kriptografi resmi berstandar UU ITE dan UUJN.`;

    setDeedText(draftClause);
    setNotaryNote('Telah diverifikasi identitas penghadap dan disahkan secara digital oleh Notaris Natasha S.H., M.Kn.');
  };

  // Perform Digital Signature & Sealing
  const handleExecuteSigning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingRequest) return;

    setIsProcessing(true);
    try {
      let encryptedPayload = '';
      let calculatedHash = '';

      if (deedAlgorithm === 'Super-Encrypted (Vigenere + AES)') {
        const superRes = await superEncrypt(deedText, classicalKey, modernKey);
        encryptedPayload = superRes.modernCipher;
        calculatedHash = superRes.sha256Hash;
      } else {
        encryptedPayload = modernStreamEncrypt(deedText, modernKey);
        calculatedHash = await sha256(`${deedTitle}|${signingRequest.client_name}|${encryptedPayload}|${Date.now()}`);
      }

      await onSignRequest(signingRequest.id, {
        title: deedTitle,
        client: signingRequest.client_name,
        type: deedType,
        value: deedValue,
        encrypted_content: encryptedPayload,
        algorithm: deedAlgorithm,
        sha256_hash: calculatedHash,
        notary_notes: notaryNote,
      });

      setSigningRequest(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Quick Process Action
  const handleProcessAction = async (req: ClientRequestItem) => {
    setIsProcessing(true);
    try {
      await onUpdateStatus(
        req.id,
        'Sedang Diproses',
        'Berkas permohonan sedang ditelaah oleh staf kenotariatan dan notaris.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Rejection
  const handleExecuteReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;

    setIsProcessing(true);
    try {
      await onUpdateStatus(
        rejectingRequest.id,
        'Ditolak',
        rejectReason || 'Dokumen persyaratan belum lengkap atau perlu perbaikan identitas.'
      );
      setRejectingRequest(null);
      setRejectReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtering
  const filteredRequests = requests.filter((r) => {
    const matchesFilter = activeFilter === 'Semua' || r.status === activeFilter;
    const matchesSearch =
      `${r.title} ${r.client_name} ${r.id} ${r.category} ${r.notes || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'Menunggu Peninjauan').length;
  const inProgressCount = requests.filter((r) => r.status === 'Sedang Diproses').length;
  const completedCount = requests.filter((r) => r.status === 'Selesai & Tersegel').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            MEJA KERJA KENOTARIATAN & PERMOHONAN
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Daftar Permohonan Layanan Klien
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Peninjauan berkas masuk, verifikasi warkah, dan pembubuhan tanda tangan digital resmi kenotariatan.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#dfddd6] shadow-xs text-xs self-start">
          <Usb className="w-4 h-4 text-emerald-600 animate-pulse" />
          <div>
            <div className="font-semibold text-[#182b29] text-[11px] leading-tight">
              Hardware Token Notaris Aktif
            </div>
            <div className="text-[10px] text-[#69736f]">FIPS 140-2 Level 3 Otorisasi Sah</div>
          </div>
        </div>
      </section>

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveFilter('Semua')}
          className={`p-4 rounded-xl border shadow-xs transition cursor-pointer ${
            activeFilter === 'Semua'
              ? 'bg-[#182b29] text-white border-[#182b29]'
              : 'bg-[#fbfaf7] border-[#dfddd6] hover:border-[#b88070]'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
            Total Permohonan
          </div>
          <div className="font-serif text-2xl font-bold mt-1">{requests.length}</div>
          <p className="text-xs opacity-75 mt-0.5">Seluruh warkah masuk</p>
        </div>

        <div
          onClick={() => setActiveFilter('Menunggu Peninjauan')}
          className={`p-4 rounded-xl border shadow-xs transition cursor-pointer ${
            activeFilter === 'Menunggu Peninjauan'
              ? 'bg-amber-700 text-white border-amber-800'
              : 'bg-[#fbfaf7] border-[#dfddd6] hover:border-amber-400'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
            Menunggu Peninjauan
          </div>
          <div className="font-serif text-2xl font-bold mt-1 text-amber-900">{pendingCount}</div>
          <p className="text-xs text-amber-700 mt-0.5">Perlu segera ditelaah</p>
        </div>

        <div
          onClick={() => setActiveFilter('Sedang Diproses')}
          className={`p-4 rounded-xl border shadow-xs transition cursor-pointer ${
            activeFilter === 'Sedang Diproses'
              ? 'bg-blue-700 text-white border-blue-800'
              : 'bg-[#fbfaf7] border-[#dfddd6] hover:border-blue-400'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
            Sedang Diproses
          </div>
          <div className="font-serif text-2xl font-bold mt-1 text-blue-900">{inProgressCount}</div>
          <p className="text-xs text-blue-700 mt-0.5">Tahap validasi hukum</p>
        </div>

        <div
          onClick={() => setActiveFilter('Selesai & Tersegel')}
          className={`p-4 rounded-xl border shadow-xs transition cursor-pointer ${
            activeFilter === 'Selesai & Tersegel'
              ? 'bg-emerald-800 text-white border-emerald-900'
              : 'bg-[#fbfaf7] border-[#dfddd6] hover:border-emerald-400'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
            Selesai & Tersegel
          </div>
          <div className="font-serif text-2xl font-bold mt-1 text-emerald-900">{completedCount}</div>
          <p className="text-xs text-emerald-700 mt-0.5">Akta resmi telah terbit</p>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['Semua', 'Menunggu Peninjauan', 'Sedang Diproses', 'Selesai & Tersegel', 'Ditolak'].map(
          (filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                activeFilter === filter
                  ? 'bg-[#182b29] text-white shadow-xs'
                  : 'bg-[#f0ede6] text-[#55635f] hover:bg-[#e6e2d8]'
              }`}
            >
              {filter}
            </button>
          )
        )}
      </div>

      {/* Requests Table / Cards */}
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs hover:border-[#2d6958] transition space-y-4"
            >
              {/* Header card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfddd6] pb-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                      req.status === 'Selesai & Tersegel'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'Sedang Diproses'
                        ? 'bg-blue-100 text-blue-800'
                        : req.status === 'Ditolak'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status === 'Selesai & Tersegel' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : req.status === 'Sedang Diproses' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#69736f] bg-white px-2 py-0.5 rounded border border-[#dfddd6]">
                        {req.id}
                      </span>
                      <span className="text-[10px] text-[#69736f] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(req.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-semibold text-[#182b29] mt-1">
                      {req.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      req.status === 'Selesai & Tersegel'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : req.status === 'Sedang Diproses'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : req.status === 'Ditolak'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        req.status === 'Selesai & Tersegel'
                          ? 'bg-emerald-600'
                          : req.status === 'Sedang Diproses'
                          ? 'bg-blue-600'
                          : req.status === 'Ditolak'
                          ? 'bg-rose-600'
                          : 'bg-amber-600'
                      }`}
                    />
                    {req.status}
                  </span>
                </div>
              </div>

              {/* Details Body */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-[#dfddd6]">
                  <span className="text-[10px] text-[#69736f] block uppercase font-medium">
                    Klien Pemohon
                  </span>
                  <div className="font-semibold text-[#182b29] flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#2d6958]" />
                    <span>{req.client_name}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#dfddd6]">
                  <span className="text-[10px] text-[#69736f] block uppercase font-medium">
                    Kategori Warkah
                  </span>
                  <div className="font-semibold text-[#182b29] flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-[#762e3b]" />
                    <span>{req.category}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#dfddd6]">
                  <span className="text-[10px] text-[#69736f] block uppercase font-medium">
                    Dokumen Akta Resmi
                  </span>
                  <div className="font-mono text-[#182b29] mt-0.5 font-semibold">
                    {req.document_id ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {req.document_id}
                      </span>
                    ) : (
                      <span className="text-[#8c9491] italic font-normal">Belum Diterbitkan</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes from client */}
              {req.notes && (
                <div className="p-3 rounded-lg bg-[#f0ede6] border border-[#dfddd6] text-xs">
                  <span className="text-[10px] font-semibold text-[#69736f] uppercase block mb-0.5">
                    Catatan / Keterangan Klien:
                  </span>
                  <p className="text-[#182b29]">{req.notes}</p>
                </div>
              )}

              {/* Notary notes if any */}
              {req.notary_notes && (
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase block mb-0.5">
                    Catatan / Tindakan Notaris:
                  </span>
                  <p className="text-emerald-950">{req.notary_notes}</p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 border-t border-[#dfddd6] flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-[#69736f]">
                  {req.status === 'Menunggu Peninjauan' && (
                    <span>⏳ Menunggu verifikasi dokumen fisik dan identitas pemohon</span>
                  )}
                  {req.status === 'Sedang Diproses' && (
                    <span>🔍 Berkas siap untuk proses pembubuhan tanda tangan digital</span>
                  )}
                  {req.status === 'Selesai & Tersegel' && (
                    <span className="text-emerald-700 font-medium">
                      🛡️ Berkas akta otentik telah terenkripsi dan disimpan di database SQLite
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'Menunggu Peninjauan' && (
                    <>
                      <button
                        onClick={() => {
                          setRejectingRequest(req);
                          setRejectReason('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-medium transition cursor-pointer"
                      >
                        Tolak / Minta Revisi
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => handleProcessAction(req)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span>Mulai Proses</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {(req.status === 'Sedang Diproses' || req.status === 'Menunggu Peninjauan') && (
                    <button
                      onClick={() => handleOpenSignModal(req)}
                      className="px-4 py-1.5 rounded-lg bg-[#142825] hover:bg-[#1f3a36] text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tandatangani & Terbitkan Akta</span>
                    </button>
                  )}

                  {req.status === 'Selesai & Tersegel' && req.document_id && onNavigateToDocument && (
                    <button
                      onClick={() => onNavigateToDocument(req.document_id!)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Lihat Akta Resmi</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center rounded-xl bg-[#fbfaf7] border border-[#dfddd6] text-xs text-[#69736f]">
            Tidak ada permohonan dalam kategori ini.
          </div>
        )}
      </div>

      {/* ================= MODAL: DIGITAL SIGNING & DEED ISSUANCE ================= */}
      {signingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#142825] text-white flex items-center justify-between border-b border-[#29403c]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#26413c] text-emerald-300">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] tracking-widest text-[#88bbaa] uppercase">
                    MODUL PENGESAHAN & TANDA TANGAN DIGITAL
                  </span>
                  <h3 className="font-serif text-lg text-white font-medium">
                    Penandatanganan Akta Kenotariatan Resmi
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSigningRequest(null)}
                className="p-1.5 rounded-md text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleExecuteSigning} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
              {/* Notary Credentials & USB Token Badge & Face Recognition */}
              <div className="p-3.5 rounded-lg bg-[#f0ede6] border border-[#dfddd6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-[#69736f] uppercase block font-semibold">
                    Pejabat Penandatangan Sah
                  </span>
                  <strong className="text-sm text-[#182b29] block">
                    Natasha S.H., M.Kn. (Notaris & PPAT)
                  </strong>
                  <span className="text-[11px] text-[#69736f]">
                    SK Menkumham RI: AHU-00123.AH.02.01 · Wilayah Kerja DKI Jakarta
                  </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {isFaceAuthorized ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      Face Recognition Sah ({faceConfidence}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-300">
                      <Usb className="w-3.5 h-3.5" />
                      Token Flashdisk Aktif
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsFaceModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#182b29] hover:bg-black text-white text-[10px] font-semibold transition cursor-pointer shadow-xs"
                    title="Gunakan Face Recognition jika flashdisk dongle hilang atau tertinggal"
                  >
                    <Camera className="w-3 h-3 text-emerald-300" />
                    <span>{isFaceAuthorized ? 'Pindai Ulang Wajah' : 'Dongle Hilang? Face ID'}</span>
                  </button>
                </div>
              </div>

              {/* Grid 2-col inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#182b29] mb-1">
                    Nama Klien Penghadap *
                  </label>
                  <input
                    type="text"
                    disabled
                    value={signingRequest.client_name}
                    className="w-full px-3 py-2 rounded-lg bg-[#e8ecee] border border-[#dfddd6] text-xs font-medium text-[#182b29]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#182b29] mb-1">
                    Jenis Dokumen / Akta *
                  </label>
                  <select
                    value={deedType}
                    onChange={(e) => setDeedType(e.target.value as DocumentType)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
                  >
                    <option value="Akta Notaris">Akta Notaris</option>
                    <option value="Sertifikat Tanah">Sertifikat Tanah</option>
                    <option value="Surat Wasiat">Surat Wasiat</option>
                    <option value="Kepemilikan Saham">Kepemilikan Saham</option>
                    <option value="Perjanjian Bisnis">Perjanjian Bisnis</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1">
                  Judul Akta Resmi Terdaftar *
                </label>
                <input
                  type="text"
                  required
                  value={deedTitle}
                  onChange={(e) => setDeedTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#182b29] mb-1">
                    Nilai Aset Tercatat *
                  </label>
                  <input
                    type="text"
                    required
                    value={deedValue}
                    onChange={(e) => setDeedValue(e.target.value)}
                    placeholder="Contoh: Rp 12,8 Miliar atau Rahasia"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#182b29] mb-1">
                    Algoritma Enkripsi Brankas *
                  </label>
                  <select
                    value={deedAlgorithm}
                    onChange={(e) => setDeedAlgorithm(e.target.value as EncryptionAlgorithm)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
                  >
                    <option value="AES-256-GCM">AES-256-GCM (Standar Industri)</option>
                    <option value="Super-Encrypted (Vigenere + AES)">Super Enkripsi (Vigenere + AES)</option>
                    <option value="ChaCha20-Poly1305">ChaCha20-Poly1305 (Stream Cipher)</option>
                  </select>
                </div>
              </div>

              {/* Cryptographic Keys */}
              {deedAlgorithm === 'Super-Encrypted (Vigenere + AES)' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-purple-50/60 rounded-lg border border-purple-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                      Kunci Klasik (Vigenere Cipher):
                    </label>
                    <input
                      type="text"
                      required
                      value={classicalKey}
                      onChange={(e) => setClassicalKey(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 rounded bg-white border border-purple-300 text-xs font-mono text-purple-950 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                      Kunci Modern (AES Stream Key):
                    </label>
                    <input
                      type="text"
                      required
                      value={modernKey}
                      onChange={(e) => setModernKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-white border border-purple-300 text-xs font-mono text-purple-950"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#182b29] mb-1">
                    Kunci Privat Otorisasi ({deedAlgorithm})
                  </label>
                  <input
                    type="password"
                    required
                    value={modernKey}
                    onChange={(e) => setModernKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs font-mono text-[#182b29]"
                  />
                </div>
              )}

              {/* Naskah Akta Warkah */}
              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1">
                  Naskah Resmi Akta Kenotariatan (Plaintext yang akan disegel)
                </label>
                <textarea
                  rows={5}
                  required
                  value={deedText}
                  onChange={(e) => setDeedText(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white border border-[#dfddd6] font-serif text-xs text-[#182b29] leading-relaxed focus:outline-none focus:border-[#2d6958]"
                />
              </div>

              {/* Notary Note */}
              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1">
                  Catatan Notaris untuk Pemohon
                </label>
                <input
                  type="text"
                  value={notaryNote}
                  onChange={(e) => setNotaryNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-[#2d6958]"
                />
              </div>

              {/* Security info banner */}
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p>
                  Setelah tombol ditekan, sistem akan menghitung ringkasan <b>Hash SHA-256</b>, mengenkripsi naskah akta, menyimpannya di SQLite, memperbarui status permohonan menjadi <b>Selesai & Tersegel</b>, dan mencatat blok transaksi baru ke dalam <b>Chain of Title</b>.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#dfddd6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSigningRequest(null)}
                  className="px-4 py-2 rounded-lg border border-[#dfddd6] hover:bg-[#f0ede6] text-xs font-semibold text-[#182b29] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isProcessing ? 'Menyegel Kriptografis...' : 'Bubuhkan Tanda Tangan & Terbitkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT / REVISE REQUEST ================= */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-rose-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-300" />
                <h3 className="font-serif text-base font-semibold">Tolak / Minta Revisi Berkas</h3>
              </div>
              <button
                onClick={() => setRejectingRequest(null)}
                className="p-1 rounded text-rose-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteReject} className="p-5 space-y-4 text-xs">
              <p className="text-[#182b29]">
                Berikan penjelasan atau instruksi kepada pemohon{' '}
                <b>{rejectingRequest.client_name}</b> mengenai alasan penolakan atau kekurangan berkas warkah:
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1">
                  Alasan Penolakan / Catatan Perbaikan *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Lampiran salinan identitas KTP dan sertifikat tanah asli belum diserahkan ke kantor notaris..."
                  className="w-full p-2.5 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="pt-2 border-t border-[#dfddd6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#dfddd6] hover:bg-[#f0ede6] text-xs font-semibold text-[#182b29]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition"
                >
                  {isProcessing ? 'Menyimpan...' : 'Kirim Penolakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Biometric Face Recognition Modal */}
      <FaceRecognitionModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onSuccess={handleFaceSuccess}
        purposeTitle="Otorisasi Penandatanganan Akta (Fallback Dongle)"
        expectedName={notaryName}
        signerUsername={notaryUsername}
        registeredPhotoUrl={notaryPhotoUrl}
      />
    </div>
  );
};
