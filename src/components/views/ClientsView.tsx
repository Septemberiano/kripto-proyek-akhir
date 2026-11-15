import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Shield,
  FileText,
  UserCheck,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { DocumentItem, UserItem } from '../../types';

interface ClientsViewProps {
  searchQuery: string;
  users: UserItem[];
  documents: DocumentItem[];
  onVerifyKyc: (userId: string) => Promise<void>;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  searchQuery,
  users,
  documents,
  onVerifyKyc,
}) => {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const clientRecords = useMemo(() => {
    const clientUsers = users.filter((u) => u.role === 'client');
    return clientUsers.map((u) => {
      const nameLower = u.name.toLowerCase();
      const docsCount = documents.filter((d) => {
        const docClient = d.client.toLowerCase();
        return docClient.includes(nameLower) || nameLower.includes(docClient);
      }).length;
      const isVerified = u.kyc_verified === undefined ? true : Boolean(u.kyc_verified);
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        nik: u.nik || 'Belum diisi',
        email: u.email || '-',
        phone: u.phone || '-',
        documentsCount: docsCount,
        verified: isVerified,
        registeredDate: u.created_at
          ? new Date(u.created_at).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : 'Terdaftar',
      };
    });
  }, [users, documents]);

  const filteredClients = clientRecords.filter((c) =>
    `${c.name} ${c.username} ${c.nik} ${c.email} ${c.phone}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const pendingCount = clientRecords.filter((c) => !c.verified).length;

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await onVerifyKyc(id);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            REGISTRASI IDENTITAS & KLIEN HUKUM (SQLITE SYNC)
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Daftar Klien Terverifikasi ({clientRecords.length})
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Data identitas KTP/NPWP klien terdaftar dari SQLite vault beserta status verifikasi KYC Notaris.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold self-start">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>
            {pendingCount > 0 ? `${pendingCount} Klien Menunggu KYC` : 'Semua Klien Terverifikasi KYC'}
          </span>
        </div>
      </div>

      {filteredClients.length === 0 && (
        <div className="p-8 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] text-center text-sm text-[#69736f]">
          Tidak ada data klien yang cocok dengan pencarian Anda.
        </div>
      )}

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className={`p-5 rounded-xl border shadow-xs transition space-y-3 ${
              client.verified
                ? 'bg-[#fbfaf7] border-[#dfddd6] hover:border-[#2d6958]'
                : 'bg-amber-50/40 border-amber-300 hover:border-amber-500'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <strong className="text-sm font-semibold text-[#182b29] block truncate">
                  {client.name}
                </strong>
                <span className="text-[10px] text-[#69736f] font-mono">
                  @{client.username} · {client.id}
                </span>
              </div>
              {client.verified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                  <Clock className="w-3 h-3 text-amber-600" /> Menunggu KYC
                </span>
              )}
            </div>

            <div className="text-xs space-y-1.5 pt-2 border-t border-[#dfddd6] text-[#55635f]">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#2d6958] shrink-0" />
                <span className="font-mono text-[11px] truncate">NIK: {client.nik}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#762e3b] shrink-0" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#2d6958] shrink-0" />
                <span>{client.phone}</span>
              </div>
            </div>

            {!client.verified && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={verifyingId === client.id}
                  onClick={() => handleVerify(client.id)}
                  className="w-full py-2 px-3 rounded-lg bg-[#2d6958] hover:bg-[#235345] disabled:bg-slate-300 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  {verifyingId === client.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {verifyingId === client.id
                      ? 'Memverifikasi Identitas...'
                      : 'Verifikasi KYC Sekarang'}
                  </span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-[#dfddd6] flex items-center justify-between text-[11px] text-[#69736f]">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-[#182b29]" />
                <strong className="text-[#182b29]">{client.documentsCount} Akta</strong> Aktif
              </span>
              <span>Terdaftar: {client.registeredDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
