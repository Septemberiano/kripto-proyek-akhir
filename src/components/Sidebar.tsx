import React from 'react';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Archive,
  Link2,
  KeyRound,
  Image,
  Shield,
  Usb,
  Database,
  LogOut,
  X,
  FileCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { UserSession } from '../types';

export type NavTab =
  | 'Ikhtisar'
  | 'Aset & Sertifikat'
  | 'Wasiat & Akta'
  | 'Klien'
  | 'Berkas Terenkripsi'
  | 'Chain of Title'
  | 'Super Enkripsi'
  | 'Steganografi'
  // Client tabs
  | 'Beranda'
  | 'Aset Saya'
  | 'Dokumen Saya'
  | 'Permintaan'
  | 'Riwayat Kepemilikan'
  | 'Cek Keaslian Berkas';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onLogout: () => void;
  isBackendOnline: boolean;
  documentsCount: number;
  requestsCount?: number;
  onSwitchRolePreview?: (role: 'admin' | 'client') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  session,
  onLogout,
  isBackendOnline,
  documentsCount,
  requestsCount = 2,
  onSwitchRolePreview,
}) => {
  const isAdmin = session.role === 'admin';

  // Admin Navigation Items
  const adminNavItems: { label: NavTab; icon: React.ReactNode; badge?: string | number }[] = [
    { label: 'Ikhtisar', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Aset & Sertifikat', icon: <Building2 className="w-4 h-4" /> },
    { label: 'Wasiat & Akta', icon: <FileText className="w-4 h-4" />, badge: documentsCount },
    { label: 'Klien', icon: <Users className="w-4 h-4" />, badge: '67' },
    { label: 'Berkas Terenkripsi', icon: <Archive className="w-4 h-4" /> },
    { label: 'Chain of Title', icon: <Link2 className="w-4 h-4" />, badge: 'BLOCK' },
    { label: 'Super Enkripsi', icon: <KeyRound className="w-4 h-4" /> },
    { label: 'Steganografi', icon: <Image className="w-4 h-4" /> },
  ];

  // Client Navigation Items
  const clientNavItems: { label: NavTab; icon: React.ReactNode; badge?: string | number }[] = [
    { label: 'Beranda', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Aset Saya', icon: <Building2 className="w-4 h-4" /> },
    { label: 'Dokumen Saya', icon: <FileText className="w-4 h-4" />, badge: '3' },
    { label: 'Permintaan', icon: <Clock className="w-4 h-4" />, badge: requestsCount },
    { label: 'Riwayat Kepemilikan', icon: <Link2 className="w-4 h-4" /> },
    { label: 'Cek Keaslian Berkas', icon: <Image className="w-4 h-4" /> },
  ];

  const navItems = isAdmin ? adminNavItems : clientNavItems;

  const initials = session.displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r text-[#e7ece9] flex flex-col p-4 transition-all duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isAdmin
            ? 'bg-[#142825] border-[#29403c]'
            : 'bg-[#263640] border-[#3a4c56]'
        }`}
      >
        {/* Brand header */}
        <div
          className={`flex items-center justify-between pb-4 border-b ${
            isAdmin ? 'border-[#233a35]' : 'border-[#334651]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 grid place-items-center border rotate-45 shadow-[inset_0_0_0_2px] ${
                isAdmin
                  ? 'bg-[#772e3a] border-[#a57b6d] shadow-[#142825]'
                  : 'bg-[#526d78] border-[#93a6ad] shadow-[#263640]'
              }`}
            >
              <span className="-rotate-45 text-[#f4e8dc] font-serif font-bold text-xs">AN</span>
            </div>
            <div>
              <strong className="font-serif text-lg tracking-wide text-white block leading-tight">
                ArsipNusa
              </strong>
              <span className="text-[10px] tracking-widest text-[#9caaa6] uppercase">
                {isAdmin ? 'Notarial Vault' : 'Client Trust Portal'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md text-[#81938e] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Switcher preview (only available if admin wants to preview client) */}
        {onSwitchRolePreview && (
          <div
            className={`grid grid-cols-2 gap-1 my-3 p-1 rounded-lg border text-xs font-semibold ${
              isAdmin
                ? 'bg-[#10231f] border-[#304743]'
                : 'bg-[#202e36] border-[#42535c]'
            }`}
          >
            <button
              onClick={() => onSwitchRolePreview('admin')}
              className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isAdmin ? 'bg-[#29433e] text-white shadow-xs' : 'text-[#7f918c] hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => onSwitchRolePreview('client')}
              className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
                !isAdmin ? 'bg-[#405966] text-white shadow-xs' : 'text-[#7f918c] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Klien</span>
            </button>
          </div>
        )}

        {/* Workspace label */}
        <div className="pt-2 pb-2 px-2 text-[10px] font-bold tracking-widest text-[#8c9e99] uppercase flex items-center justify-between">
          <span>{isAdmin ? 'RUANG KERJA NOTARIS' : 'PORTAL PRIBADI KLIEN'}</span>
          <FileCheck className="w-3.5 h-3.5 text-[#88bbaa]" />
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto py-1 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = activeTab === item.label;
            return (
              <button
                key={item.label}
                onClick={() => {
                  setActiveTab(item.label);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? isAdmin
                      ? 'bg-[#26413c] text-white shadow-xs border-l-3 border-[#b88070]'
                      : 'bg-[#3b525e] text-white shadow-xs border-l-3 border-[#9bb7c0]'
                    : isAdmin
                    ? 'text-[#aebbb7] hover:text-white hover:bg-[#1b3531]'
                    : 'text-[#9bb7c0] hover:text-white hover:bg-[#30434d]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-[#8c9e99]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isActive
                        ? isAdmin
                          ? 'bg-[#67303a] text-[#e8c4b9]'
                          : 'bg-[#526d78] text-[#dbe9ed]'
                        : 'bg-black/20 text-gray-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Security & System Footer */}
        <div
          className={`pt-3 border-t space-y-2.5 ${
            isAdmin ? 'border-[#233a35]' : 'border-[#334651]'
          }`}
        >
          {/* SQLite Backend Status */}
          <div
            className={`px-3 py-1.5 rounded-lg border flex items-center justify-between text-[11px] ${
              isAdmin ? 'bg-[#0e1d1a] border-[#233a35]' : 'bg-[#1e2c34] border-[#344855]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#88bbaa]" />
              <span className="text-gray-300">SQLite REST API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isBackendOnline ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {isBackendOnline ? 'Port 5000' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Dongle / Biometric Security Card */}
          <div
            className={`p-3 rounded-lg border ${
              isAdmin
                ? 'border-[#2d4a45] bg-[#19302c]'
                : 'border-[#405660] bg-[#2d414b]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#dce8e4]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#88bbaa]" />
                <span>{isAdmin ? 'Mode Aman Aktif' : 'Akses Pribadi Aman'}</span>
              </div>
              {isAdmin ? (
                <Usb className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
              )}
            </div>
            <p className="text-[10px] text-gray-300 mt-1 mb-2">
              {isAdmin
                ? 'Dongle terhubung · Sesi terenkripsi AES-256'
                : 'Biometrik aktif · Data terenkripsi'}
            </p>
            <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full w-5/6 ${
                  isAdmin ? 'bg-emerald-500' : 'bg-[#8db3b9]'
                }`}
              />
            </div>
          </div>

          {/* User profile with logout button */}
          <div
            className={`p-2 rounded-lg border flex items-center justify-between ${
              isAdmin
                ? 'bg-[#10231f] border-[#233a35]'
                : 'bg-[#202e36] border-[#364b58]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full font-serif font-bold text-xs grid place-items-center shrink-0 ${
                  isAdmin
                    ? 'bg-[#77323d] text-[#f0dfda]'
                    : 'bg-[#526d78] text-[#e8f0f2]'
                }`}
              >
                {initials || 'US'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#e0e7e5] truncate">
                  {session.displayName}
                </div>
                <div className="text-[9px] text-[#82928e] truncate">
                  {isAdmin ? 'Notaris Utama · Administrator' : 'Klien Terverifikasi'}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-md text-[#81938e] hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
              title="Keluar / Kunci Sesi"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
