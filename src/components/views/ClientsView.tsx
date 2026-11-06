import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Shield,
  FileText,
  UserCheck,
} from 'lucide-react';
import type { ClientItem } from '../../types';

interface ClientsViewProps {
  searchQuery: string;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ searchQuery }) => {
  const [clients] = useState<ClientItem[]>([
    {
      id: 'KLN-001',
      name: 'Budi Santoso',
      nik: '3171051204850003',
      email: 'budi.santoso@mentengcapital.id',
      phone: '+62 811-9283-102',
      address: 'Jl. Teuku Umar No. 14, Menteng, Jakarta Pusat',
      documentsCount: 4,
      verified: true,
      registeredDate: '12 Jan 2024',
    },
    {
      id: 'KLN-002',
      name: 'Rina Hartono',
      nik: '3174094508900001',
      email: 'rina.hartono@familytrust.co.id',
      phone: '+62 812-4456-7890',
      address: 'Kebayoran Baru, Jakarta Selatan',
      documentsCount: 2,
      verified: true,
      registeredDate: '05 Mei 2024',
    },
    {
      id: 'KLN-003',
      name: 'Dimas Pratama',
      nik: '3275031902920005',
      email: 'dimas@arunikapersada.com',
      phone: '+62 813-8901-2345',
      address: 'Kuningan Barat, Setiabudi, Jakarta Selatan',
      documentsCount: 3,
      verified: true,
      registeredDate: '18 Nov 2024',
    },
    {
      id: 'KLN-004',
      name: 'PT Wahana Logistik Indonesia',
      nik: '01.345.678.9-012.000 (NPWP Badan)',
      email: 'legal@wahanalogistik.co.id',
      phone: '+62 21-8902-3400',
      address: 'Kawasan Industri GIIC Cikarang Pusat, Bekasi',
      documentsCount: 6,
      verified: true,
      registeredDate: '02 Feb 2025',
    },
    {
      id: 'KLN-005',
      name: 'Dr. Hendra Wijaya, Sp.A.',
      nik: '3172081507780004',
      email: 'hendra.wijaya@medikacenter.id',
      phone: '+62 818-0912-3456',
      address: 'Kelapa Gading Permai, Jakarta Utara',
      documentsCount: 1,
      verified: false,
      registeredDate: '19 Jun 2025',
    },
  ]);

  const filteredClients = clients.filter((c) =>
    `${c.name} ${c.nik} ${c.email} ${c.phone}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            REGISTRASI IDENTITAS & KLIEN HUKUM
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Daftar Klien Terverifikasi
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Data identitas KTP/NPWP pemilik hak atas tanah, wasiat, dan akta perseroan yang tersimpan dalam brankas.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold self-start">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>Biometrik & KYC Terintegrasi</span>
        </div>
      </div>

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs hover:border-[#2d6958] transition space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <strong className="text-sm font-semibold text-[#182b29] block">
                  {client.name}
                </strong>
                <span className="text-[10px] text-[#69736f] font-mono">{client.id}</span>
              </div>
              {client.verified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
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
