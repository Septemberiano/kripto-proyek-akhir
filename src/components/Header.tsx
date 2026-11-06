import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  Shield,
  Database,
  RefreshCw,
  X,
  Lock,
  Server,
} from 'lucide-react';
import type { UserSession } from '../types';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenAddModal: () => void;
  isBackendOnline: boolean;
  onRefreshBackend: () => void;
  session: UserSession;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  searchQuery,
  setSearchQuery,
  onOpenAddModal,
  isBackendOnline,
  onRefreshBackend,
  session,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(2850); // ~47 mins
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshBackend();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#fbfaf7]/95 border-b border-[#dfddd6] px-4 md:px-8 flex items-center justify-between gap-4 backdrop-blur-md">
      {/* Left section: mobile hamburger & search input */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-[#182b29] hover:bg-[#eae8e1] transition cursor-pointer"
          aria-label="Buka navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#78817d]">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari akta, nomor SHM, klien, atau hash..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#f5f3ee] border border-[#dcdad3] text-xs text-[#17221f] placeholder-[#8c9491] focus:outline-none focus:border-[#2d6958] focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#8c9491] hover:text-[#17221f]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right section: System statuses & actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend SQLite status pill */}
        <button
          onClick={handleManualRefresh}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium border transition cursor-pointer ${
            isBackendOnline
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title="Klik untuk mengecek kembali status koneksi REST API Express / SQLite"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isBackendOnline ? 'SQLite: Online (5000)' : 'SQLite: Cache Lokal'}</span>
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Live session countdown */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0ede6] text-[#42524d] text-xs font-medium">
          <Lock className="w-3.5 h-3.5 text-[#2d6958]" />
          <span>Sesi aman:</span>
          <strong className="font-mono text-[#182b29]">{formatTimer(secondsRemaining)}</strong>
        </div>

        {/* Status pill: Super Admin, Notaris, or Klien */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
            session.role === 'superadmin'
              ? 'bg-[#101f38] text-indigo-200'
              : session.role === 'admin'
              ? 'bg-[#142825] text-[#dce8e4]'
              : 'bg-[#263640] text-[#dbe9ed]'
          }`}
        >
          {session.role === 'superadmin' ? (
            <Server className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <Shield
              className={`w-3.5 h-3.5 ${
                session.role === 'admin' ? 'text-emerald-400' : 'text-cyan-300'
              }`}
            />
          )}
          <span>
            {session.role === 'superadmin'
              ? `Super Admin: ${session.displayName.split(' ')[0]}`
              : session.role === 'admin'
              ? `Dongle: ${session.displayName.split(' ')[0]}`
              : `Portal: ${session.displayName.split(' ')[0]}`}
          </span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg text-[#55635f] hover:text-[#182b29] hover:bg-[#eae8e1] transition cursor-pointer"
            aria-label="Notifikasi sistem"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#762e3b]" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#dfddd6] rounded-xl shadow-xl p-4 z-50 animate-in fade-in-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#eee]">
                <strong className="text-xs font-semibold text-[#182b29]">Pemberitahuan Kriptografis</strong>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 text-xs text-[#55635f]">
                <div className="p-2 rounded bg-emerald-50 text-emerald-900 border border-emerald-100">
                  <div className="font-semibold text-[11px]">Audit Integritas Chain of Title</div>
                  <div className="text-[10px] text-emerald-700">
                    Seluruh 4 blok tersegel dengan tanda tangan SHA-256 yang valid.
                  </div>
                </div>
                <div className="p-2 rounded bg-amber-50 text-amber-900 border border-amber-100">
                  <div className="font-semibold text-[11px]">Wasiat Menunggu Tanda Tangan</div>
                  <div className="text-[10px] text-amber-700">
                    Klien Rina Hartono menunggu otorisasi kunci privat USB Token.
                  </div>
                </div>
                <div className="p-2 rounded bg-[#f5f3ee] text-[#182b29]">
                  <div className="font-semibold text-[11px]">Koneksi SQLite REST API</div>
                  <div className="text-[10px] text-gray-500">
                    Endpoint http://localhost:5000/api/documents aktif dan tersinkronisasi.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenAddModal}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-white text-xs font-semibold shadow-sm transition cursor-pointer ${
            session.role === 'admin'
              ? 'bg-[#2d6958] hover:bg-[#235345]'
              : 'bg-[#3f606e] hover:bg-[#334f5b]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">
            {session.role === 'admin' ? 'Tambah Dokumen' : 'Ajukan Permintaan'}
          </span>
          <span className="sm:hidden">
            {session.role === 'admin' ? 'Tambah' : 'Ajukan'}
          </span>
        </button>
      </div>
    </header>
  );
};
