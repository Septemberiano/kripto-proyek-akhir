import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Usb,
  Cpu,
  Eye,
  EyeOff,
  Sparkles,
  UserPlus,
  Mail,
  Phone,
  CreditCard,
  Users,
  Server,
  Camera,
  HardDrive,
} from 'lucide-react';
import { loginUser, registerUser, fetchSecurityTokens, fetchUsers } from '../services/api';
import type { UserSession, UserRole, UserItem } from '../types';
import { FaceRecognitionModal } from './FaceRecognitionModal';
import { verifyDongleKeyFile } from '../utils/dongle';

export type LoginMode = 'login-superadmin' | 'login-admin' | 'login-client' | 'register';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Mode: 'login-superadmin' | 'login-admin' | 'login-client' | 'register'
  const [activeMode, setActiveMode] = useState<LoginMode>('login-admin');

  // Registered Notaries list from SQLite
  const [notariesList, setNotariesList] = useState<UserItem[]>([]);
  const [selectedNotaryId, setSelectedNotaryId] = useState<string>('usr-admin-1');

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dongleConnected, setDongleConnected] = useState(true);
  const [verifiedSerial, setVerifiedSerial] = useState<string | null>('FIPS-NATASHA-2026-9901');
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  // Load Notaries from DB on mount
  useEffect(() => {
    fetchUsers()
      .then((users) => {
        const notaries = users.filter((u) => u.role === 'admin');
        if (notaries.length > 0) {
          setNotariesList(notaries);
        }
      })
      .catch(() => {});
  }, []);

  const activeNotary: UserItem =
    notariesList.find((n) => n.id === selectedNotaryId) ||
    notariesList[0] || {
      id: 'usr-admin-1',
      username: 'admin',
      role: 'admin',
      name: 'Natasha S.H., M.Kn.',
      photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      face_descriptor: 'SHA256-BIO-NATASHA-DEMO-DESCRIPTOR-9901',
      created_at: new Date().toISOString(),
    };

  // Handle Loading Key from Physical Flashdisk
  const handleFlashdiskKeySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Berkas bukan format kunci JSON yang valid.');
      }

      const res = await verifyDongleKeyFile(parsed);
      if (!res.isValid || !res.token) {
        throw new Error(res.error || 'Berkas kunci tidak valid.');
      }

      // Check if token is revoked in database
      const latestTokens = await fetchSecurityTokens();
      const match = latestTokens.find((t) => t.serial_number === res.token!.serialNumber);
      if (match && match.status === 'REVOKED') {
        setDongleConnected(false);
        setVerifiedSerial(null);
        throw new Error(
          `AKSES DITOLAK: Token "${res.token.serialNumber}" telah DIBLOKIR / DILAPORKAN HILANG di sistem!`
        );
      }

      setDongleConnected(true);
      setVerifiedSerial(res.token.serialNumber);
      setSuccessMsg(`Flashdisk USB Terverifikasi: Serial ${res.token.serialNumber} sah.`);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca kunci flashdisk.');
      setDongleConnected(false);
    } finally {
      e.target.value = '';
    }
  };

  // Handle Emergency Login with Face Recognition
  const handleFaceAuthSuccess = async (_result: {
    signerName: string;
    confidence: number;
    biometricHash: string;
  }) => {
    setIsLoading(true);
    try {
      const targetUser = activeNotary.username || username || 'admin';
      const targetPass = password || (targetUser === 'admin' ? 'admin123' : '');
      const res = await loginUser(targetUser, targetPass, 'admin');
      if (res.success && res.session) {
        onLoginSuccess({
          ...res.session,
          isDongleConnected: false, // Mark that they entered via emergency biometric bypass
        });
      } else {
        // Emergency bypass allowed via Face Recognition match against database template
        onLoginSuccess({
          username: activeNotary.username,
          displayName: activeNotary.name,
          role: 'admin',
          loginTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          isDongleConnected: false,
          token: `AN-VAULT-EMERGENCY-${_result.biometricHash.slice(0, 12)}`,
          photo_url: activeNotary.photo_url || '',
          face_descriptor: activeNotary.face_descriptor || '',
          nik: activeNotary.nik,
          email: activeNotary.email,
          phone: activeNotary.phone,
        });
      }
    } catch {
      setErrorMsg('Gagal memproses otorisasi biometrik wajah.');
    } finally {
      setIsLoading(false);
    }
  };

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regNik, setRegNik] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const isSuperAdminMode = activeMode === 'login-superadmin';
  const isAdminMode = activeMode === 'login-admin';
  const isClientMode = activeMode === 'login-client';
  const isUserMode = isClientMode || activeMode === 'register';

  const switchMode = (mode: LoginMode) => {
    setActiveMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    if (mode === 'login-superadmin') {
      setUsername('superadmin');
      setPassword('superadmin123');
    } else if (mode === 'login-admin') {
      setUsername(activeNotary.username || 'admin');
      setPassword(activeNotary.username === 'admin' ? 'admin123' : '');
    } else if (mode === 'login-client') {
      setUsername('rina');
      setPassword('user123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const effectiveIsSuperAdmin = isSuperAdminMode || cleanUser === 'superadmin';

    if (isAdminMode && !effectiveIsSuperAdmin && !dongleConnected) {
      setErrorMsg(
        'Akses Ditolak: USB Flashdisk Dongle Notaris tidak terdeteksi! Silakan colokkan flashdisk (pilih .key), atau gunakan opsi darurat "Face Recognition" jika dongle Anda hilang.'
      );
      setIsLoading(false);
      return;
    }

    try {
      const targetRole: UserRole = effectiveIsSuperAdmin
        ? 'superadmin'
        : isAdminMode
        ? 'admin'
        : 'client';

      const result = await loginUser(username, password, targetRole);

      if (!result.success || !result.session) {
        setErrorMsg(result.error || 'Kredensial tidak valid.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess(result.session);
    } catch {
      setErrorMsg('Terjadi kesalahan saat memverifikasi enkripsi hash kredensial.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regUsername.trim() || !regPassword.trim() || !regName.trim()) {
      setErrorMsg('Username, kata sandi, dan nama lengkap wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerUser({
        username: regUsername,
        password: regPassword,
        name: regName,
        role: 'client',
        nik: regNik,
        email: regEmail,
        phone: regPhone,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal mendaftarkan akun.');
        setIsLoading(false);
        return;
      }

      // Successful registration: switch to client login
      setSuccessMsg(`Akun klien "${regName}" berhasil dibuat di SQLite! Silakan masuk.`);
      setUsername(regUsername.trim().toLowerCase());
      setPassword(regPassword);
      setActiveMode('login-client');

      // Clear register form
      setRegUsername('');
      setRegPassword('');
      setRegName('');
      setRegNik('');
      setRegEmail('');
      setRegPhone('');
    } catch {
      setErrorMsg('Gagal memproses pendaftaran akun pengguna.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between relative overflow-hidden font-sans transition-all duration-500 ${
        isSuperAdminMode
          ? 'bg-gradient-to-br from-[#070e1b] via-[#0f1d38] to-[#1e293b] text-[#e2e8f0]'
          : isAdminMode
          ? 'bg-gradient-to-br from-[#07241c] via-[#0f4435] to-[#f0fdf4] text-[#e7ece9]'
          : 'bg-gradient-to-br from-[#0c382e] via-[#145744] to-[#ffffff] text-slate-800'
      }`}
    >
      {/* Background ambient lighting */}
      <div
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isSuperAdminMode ? 'bg-indigo-500/20' : 'bg-emerald-400/25'
        }`}
      />
      <div className="absolute top-1/4 -right-24 w-80 h-80 rounded-full bg-white/30 blur-3xl pointer-events-none" />
      <div
        className={`absolute -bottom-32 left-1/3 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isSuperAdminMode ? 'bg-amber-500/15' : 'bg-emerald-500/20'
        }`}
      />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/40 blur-3xl pointer-events-none" />

      {/* Security grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top security bar */}
      <header
        className={`w-full px-6 py-4 flex items-center justify-between border-b backdrop-blur-md z-10 transition-colors ${
          isSuperAdminMode
            ? 'border-indigo-900/60 bg-[#0a1222]/90 text-white'
            : isAdminMode
            ? 'border-emerald-800/40 bg-[#0a2720]/90 text-white'
            : 'border-emerald-100 bg-white/95 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 grid place-items-center border rotate-45 transition-colors shadow-sm ${
              isSuperAdminMode
                ? 'bg-[#1e293b] border-[#475569]'
                : isAdminMode
                ? 'bg-[#772e3a] border-[#a57b6d]'
                : 'bg-emerald-700 border-emerald-500'
            }`}
          >
            <span className="-rotate-45 text-[#f4e8dc] font-serif font-bold text-xs">AN</span>
          </div>
          <div>
            <h1
              className={`font-serif text-lg tracking-wide leading-tight ${
                isUserMode ? 'text-slate-900 font-semibold' : 'text-white'
              }`}
            >
              ArsipNusa
            </h1>
            <p
              className={`text-[10px] tracking-widest uppercase font-medium ${
                isSuperAdminMode
                  ? 'text-indigo-300'
                  : isAdminMode
                  ? 'text-emerald-300/80'
                  : 'text-emerald-700'
              }`}
            >
              {isSuperAdminMode
                ? 'SUPER ADMIN · PUSAT KENDALI SISTEM & PENGGUNA'
                : isAdminMode
                ? 'NOTARIAL VAULT · RUANG KERJA NOTARIS'
                : 'CLIENT TRUST PORTAL · PORTAL PRIBADI KLIEN'}
            </p>
          </div>
        </div>

        {/* Live Security Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors shadow-xs ${
            isSuperAdminMode
              ? 'border-indigo-700/60 bg-[#132038]/90 text-indigo-100'
              : isAdminMode
              ? 'border-emerald-700/60 bg-[#143d33]/90 text-emerald-100'
              : 'border-emerald-200 bg-white text-slate-700'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSuperAdminMode ? 'bg-indigo-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isSuperAdminMode ? 'bg-indigo-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          {isSuperAdminMode ? (
            <>
              <Server className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-indigo-100 text-[11px] font-medium hidden sm:inline">
                Akses Root Administrator · Isolasi Tingkat Tinggi
              </span>
            </>
          ) : isAdminMode ? (
            <>
              <Usb className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-emerald-100 text-[11px] font-medium hidden sm:inline">
                Mode Notaris Aman - Dongle {dongleConnected ? 'Terhubung' : 'Terlepas'}
              </span>
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-700 text-[11px] font-medium hidden sm:inline">
                Akses Klien Aman - KYC & Biometrik Aktif
              </span>
            </>
          )}
        </div>
      </header>

      {/* Center login box */}
      <main className="flex-1 flex items-center justify-center p-4 z-10 my-6">
        <div
          className={`w-full max-w-lg border rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative transition-all duration-300 ${
            isSuperAdminMode
              ? 'bg-[#0f192b]/95 border-indigo-500/40 text-white shadow-[0_20px_50px_rgba(15,25,43,0.5)] ring-1 ring-indigo-500/20'
              : isUserMode
              ? 'bg-white border-2 border-emerald-100 text-slate-800 shadow-[0_20px_50px_rgba(12,56,46,0.15)] ring-1 ring-emerald-500/10'
              : 'bg-[#0d2a22]/95 border border-emerald-600/40 text-white shadow-2xl'
          }`}
        >
          {/* ================= ROLE SELECTION TABS ================= */}
          <div className="mb-6">
            <label
              className={`block text-[11px] font-bold tracking-widest uppercase mb-2 text-center ${
                isSuperAdminMode
                  ? 'text-indigo-200/80'
                  : isUserMode
                  ? 'text-slate-600'
                  : 'text-emerald-200/80'
              }`}
            >
              PILIH PERAN AKSES KE DALAM SISTEM:
            </label>
            <div
              className={`grid grid-cols-4 gap-1 p-1 rounded-xl text-xs font-semibold ${
                isSuperAdminMode
                  ? 'bg-black/40 border border-indigo-500/20'
                  : isUserMode
                  ? 'bg-emerald-50/80 border border-emerald-200/70'
                  : 'bg-black/30 border border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => switchMode('login-superadmin')}
                className={`py-2 px-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition cursor-pointer text-center ${
                  activeMode === 'login-superadmin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isUserMode
                    ? 'text-slate-600 hover:text-indigo-800 hover:bg-white/60'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Server className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('login-admin')}
                className={`py-2 px-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition cursor-pointer text-center ${
                  activeMode === 'login-admin'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : isUserMode
                    ? 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Notaris</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('login-client')}
                className={`py-2 px-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition cursor-pointer text-center ${
                  activeMode === 'login-client'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isUserMode
                    ? 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Klien</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2 px-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition cursor-pointer text-center ${
                  activeMode === 'register'
                    ? 'bg-emerald-800 text-white shadow-md'
                    : isUserMode
                    ? 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Daftar</span>
              </button>
            </div>
          </div>

          {/* Mode contextual notice */}
          {activeMode === 'login-superadmin' && (
            <div className="mb-5 p-3 rounded-xl border border-indigo-500/50 bg-[#081224]/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-900/80 text-indigo-300">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    Pusat Kendali Super Admin
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                      ROOT RBAC
                    </span>
                  </div>
                  <div className="text-[10px] text-indigo-200/70">
                    Wewenang khusus manajemen pengguna, notaris, status server & database
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMode === 'login-admin' && (
            <div className="mb-5 p-3.5 rounded-xl border border-emerald-700/60 bg-[#07241c]/95 space-y-3 text-xs">
              {/* Notary Identity & Photo Card */}
              <div className="p-2.5 rounded-lg bg-[#0d3329] border border-emerald-600/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {activeNotary.photo_url ? (
                    <img
                      src={activeNotary.photo_url}
                      alt={activeNotary.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-900 border border-emerald-500 font-bold text-xs grid place-items-center text-emerald-300 shrink-0">
                      {activeNotary.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0].toUpperCase())
                        .join('')}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate text-xs">
                      {activeNotary.name}
                    </div>
                    <div className="text-[10px] text-emerald-300/80 font-mono truncate">
                      @{activeNotary.username} · Notaris & PPAT
                    </div>
                  </div>
                </div>

                {/* Notary Selector (if multiple notaries registered) */}
                {notariesList.length > 1 ? (
                  <select
                    value={selectedNotaryId}
                    onChange={(e) => {
                      const nId = e.target.value;
                      setSelectedNotaryId(nId);
                      const n = notariesList.find((item) => item.id === nId);
                      if (n) {
                        setUsername(n.username);
                        setPassword(n.username === 'admin' ? 'admin123' : '');
                      }
                    }}
                    className="px-2 py-1 rounded bg-[#184a3c] border border-emerald-500 text-white text-[10px] focus:outline-none cursor-pointer"
                  >
                    {notariesList.map((n) => (
                      <option key={n.id} value={n.id} className="bg-[#07241c] text-white">
                        {n.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 shrink-0">
                    Akun Notaris Aktif
                  </span>
                )}
              </div>

              {/* Hardware Dongle Connection Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg ${
                      dongleConnected
                        ? 'bg-emerald-900/80 text-emerald-300'
                        : 'bg-amber-950/80 text-amber-300'
                    }`}
                  >
                    <Usb className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      Ruang Kerja Notaris Utama
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                        FIPS 140-2
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-200/80">
                      {dongleConnected ? (
                        <span className="text-emerald-300">
                          🔌 Flashdisk Terverifikasi: <b>{verifiedSerial || 'FIPS-NATASHA-2026-9901'}</b>
                        </span>
                      ) : (
                        <span className="text-amber-300">
                          ⚠️ Flashdisk Dongle Fisik Tidak Terdeteksi
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !dongleConnected;
                    setDongleConnected(next);
                    if (!next) setVerifiedSerial(null);
                    else setVerifiedSerial('FIPS-NATASHA-2026-9901');
                  }}
                  className="text-[10px] text-emerald-300 hover:text-white underline cursor-pointer"
                >
                  {dongleConnected ? 'Lepas Token' : 'Sambung Simulasi'}
                </button>
              </div>

              {/* Physical Flashdisk Actions & Emergency Face Recognition */}
              <div className="pt-2 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label
                    htmlFor="login-flashdisk-key-input"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#163f35] hover:bg-[#1f5447] text-emerald-200 text-[11px] font-medium border border-emerald-700/60 cursor-pointer transition shadow-xs"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Colokkan Flashdisk (Pilih .key)</span>
                  </label>
                  <input
                    id="login-flashdisk-key-input"
                    type="file"
                    accept=".key,.json"
                    onChange={handleFlashdiskKeySelect}
                    className="hidden"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsFaceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-200 text-[11px] font-medium border border-amber-700/60 transition cursor-pointer"
                  title="Masuk menggunakan pemindaian wajah biometrik darurat"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dongle Hilang? Face Recognition</span>
                </button>
              </div>
            </div>
          )}

          {activeMode === 'login-client' && (
            <div className="mb-5 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/90 flex items-center justify-between text-xs text-slate-700 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    Client Trust Portal
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                      Portal Pribadi
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Akses aman untuk memeriksa kepemilikan aset, wasiat, dan akta pribadi
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {errorMsg && (
            <div
              className={`mb-5 p-3 rounded-lg border text-xs flex items-start gap-2.5 animate-in fade-in ${
                isUserMode
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-rose-900/60 bg-rose-950/40 text-rose-200'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${isUserMode ? 'text-rose-600' : 'text-rose-400'}`}
              />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              className={`mb-5 p-3 rounded-lg border text-xs flex items-start gap-2.5 animate-in fade-in ${
                isUserMode
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-emerald-900/60 bg-emerald-950/40 text-emerald-200'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${isUserMode ? 'text-emerald-600' : 'text-emerald-400'}`}
              />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= FORM 1: LOGIN ================= */}
          {activeMode !== 'register' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-semibold mb-1.5 ${
                    isSuperAdminMode
                      ? 'text-indigo-200'
                      : isUserMode
                      ? 'text-slate-700'
                      : 'text-emerald-100'
                  }`}
                >
                  {isSuperAdminMode
                    ? 'Username Super Administrator'
                    : isAdminMode
                    ? 'Username Notaris / Admin'
                    : 'Username Klien Terdaftar'}
                </label>
                <div className="relative">
                  <span
                    className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                      isSuperAdminMode
                        ? 'text-indigo-400'
                        : isUserMode
                        ? 'text-slate-400'
                        : 'text-emerald-300/60'
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUsername(val);
                      if (val.trim().toLowerCase() === 'superadmin' && activeMode !== 'login-superadmin') {
                        setActiveMode('login-superadmin');
                      }
                    }}
                    required
                    placeholder={
                      isSuperAdminMode
                        ? 'superadmin'
                        : isAdminMode
                        ? 'admin'
                        : 'Contoh: rina atau budi'
                    }
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm transition focus:outline-none ${
                      isSuperAdminMode
                        ? 'bg-black/40 border border-indigo-500/30 text-white placeholder-indigo-300/40 focus:border-indigo-400'
                        : isUserMode
                        ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs'
                        : 'bg-black/40 border border-white/10 text-white placeholder-emerald-200/40 focus:border-emerald-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1.5 ${
                    isSuperAdminMode
                      ? 'text-indigo-200'
                      : isUserMode
                      ? 'text-slate-700'
                      : 'text-emerald-100'
                  }`}
                >
                  Kata Sandi (Enkripsi SHA-256)
                </label>
                <div className="relative">
                  <span
                    className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                      isSuperAdminMode
                        ? 'text-indigo-400'
                        : isUserMode
                        ? 'text-slate-400'
                        : 'text-emerald-300/60'
                    }`}
                  >
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Kata sandi akun"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-lg text-sm font-mono transition focus:outline-none ${
                      isSuperAdminMode
                        ? 'bg-black/40 border border-indigo-500/30 text-white placeholder-indigo-300/40 focus:border-indigo-400'
                        : isUserMode
                        ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs'
                        : 'bg-black/40 border border-white/10 text-white placeholder-emerald-200/40 focus:border-emerald-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer ${
                      isSuperAdminMode
                        ? 'text-indigo-300/60 hover:text-white'
                        : isUserMode
                        ? 'text-slate-400 hover:text-slate-700'
                        : 'text-emerald-300/60 hover:text-white'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick default credential autofills */}
              <div
                className={`pt-1 flex flex-col gap-1.5 text-[11px] p-2.5 rounded-lg border ${
                  isSuperAdminMode
                    ? 'bg-indigo-950/40 border-indigo-700/40 text-indigo-200'
                    : isUserMode
                    ? 'bg-emerald-50/70 border-emerald-200/70 text-slate-700'
                    : 'bg-black/20 border-white/5 text-emerald-200/70'
                }`}
              >
                <span
                  className={`font-semibold ${
                    isSuperAdminMode
                      ? 'text-indigo-200'
                      : isUserMode
                      ? 'text-slate-800'
                      : 'text-gray-300'
                  }`}
                >
                  Pilihan Demo Kredensial Cepat:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {isSuperAdminMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('superadmin');
                        setPassword('superadmin123');
                        setErrorMsg('');
                      }}
                      className="px-2.5 py-1 rounded bg-indigo-900 border border-indigo-600 text-indigo-200 hover:text-white flex items-center gap-1 font-mono transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" /> Super Admin: superadmin / superadmin123
                    </button>
                  )}
                  {isAdminMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('admin');
                        setPassword('admin123');
                        setErrorMsg('');
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 hover:text-white flex items-center gap-1 font-mono transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Notaris: admin / admin123
                    </button>
                  )}
                  {isClientMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setUsername('rina');
                          setPassword('user123');
                          setErrorMsg('');
                        }}
                        className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 font-mono font-medium transition cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" /> Klien Rina: rina / user123
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUsername('budi');
                          setPassword('user123');
                          setErrorMsg('');
                        }}
                        className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 font-mono font-medium transition cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" /> Klien Budi: budi / user123
                      </button>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full mt-2 py-2.5 px-4 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-60 ${
                  isSuperAdminMode
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/40'
                    : isAdminMode
                    ? 'bg-emerald-700 hover:bg-emerald-600 shadow-emerald-950/40'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Hash Kriptografis...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      {isSuperAdminMode
                        ? 'Masuk ke Pusat Kendali Super Admin'
                        : isAdminMode
                        ? 'Buka Ruang Kerja Notaris (Admin)'
                        : 'Masuk ke Portal Pribadi (Klien)'}
                    </span>
                  </>
                )}
              </button>

              <div
                className={`text-center pt-2 text-xs ${
                  isSuperAdminMode
                    ? 'text-indigo-300/80'
                    : isUserMode
                    ? 'text-slate-600'
                    : 'text-gray-400'
                }`}
              >
                Belum memiliki akun klien?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                >
                  Daftar Akun Klien Baru Disini
                </button>
              </div>
            </form>
          ) : (
            /* ================= FORM 2: REGISTRATION ================= */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="text-center mb-2">
                <h3 className="font-serif text-lg text-slate-900 font-semibold">
                  Registrasi Akun Klien Baru
                </h3>
                <p className="text-[11px] text-slate-600">
                  Daftarkan diri Anda untuk mengakses brankas akta, wasiat, dan sertifikat tanah pribadi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Lengkap Pemilik Akun *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Contoh: Ahmad Dahlan S.E."
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nomor NIK KTP (16 Digit) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <CreditCard className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      value={regNik}
                      onChange={(e) => setRegNik(e.target.value)}
                      placeholder="3171051204850003"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Alamat Email Aktif
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="ahmad@email.com"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+62 812-3456-7890"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Username Akun Baru *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Contoh: ahmad"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-mono shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kata Sandi *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-mono shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 shadow-md shadow-emerald-700/20"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Mendaftarkan ke Database SQLite...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftarkan Akun Klien Sekarang</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2 text-xs text-slate-600">
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login-client')}
                  className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </form>
          )}

          {/* Security Features Bottom Checklist */}
          <div
            className={`mt-6 pt-4 border-t grid grid-cols-2 gap-2 text-[10px] ${
              isSuperAdminMode
                ? 'border-indigo-500/20 text-indigo-200/70'
                : isUserMode
                ? 'border-slate-200 text-slate-600'
                : 'border-white/10 text-emerald-200/70'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 shrink-0 ${
                  isSuperAdminMode ? 'text-indigo-400' : 'text-emerald-500'
                }`}
              />
              <span>Tiga Tingkat Peran (Three-Tier RBAC)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 shrink-0 ${
                  isSuperAdminMode ? 'text-indigo-400' : 'text-emerald-500'
                }`}
              />
              <span>Isolasi Dashboard Penuh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 shrink-0 ${
                  isSuperAdminMode ? 'text-indigo-400' : 'text-emerald-500'
                }`}
              />
              <span>Otentikasi Hash SHA-256</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 shrink-0 ${
                  isSuperAdminMode ? 'text-indigo-400' : 'text-emerald-500'
                }`}
              />
              <span>Database SQLite Persisten</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`w-full px-6 py-4 border-t text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-2 z-10 transition-colors ${
          isSuperAdminMode
            ? 'border-indigo-900/60 bg-[#08101d]/90 text-indigo-200/80'
            : isAdminMode
            ? 'border-emerald-900/50 bg-[#061e18]/90 text-emerald-200/80'
            : 'border-emerald-100 bg-white/95 text-slate-600 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2">
          <Cpu
            className={`w-4 h-4 ${
              isSuperAdminMode
                ? 'text-indigo-400'
                : isAdminMode
                ? 'text-emerald-400'
                : 'text-emerald-600'
            }`}
          />
          <span>ArsipNusa v2.4.1 · Notarial Cryptographic Vault Architecture</span>
        </div>
        <div>
          <span>Proyek Akhir Kriptografi · Hak Cipta Dilindungi Undang-Undang</span>
        </div>
      </footer>

      {/* Emergency Face Recognition Modal */}
      <FaceRecognitionModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onSuccess={handleFaceAuthSuccess}
        purposeTitle="Masuk Darurat Ruang Kerja Notaris (Dongle Absen)"
        expectedName={activeNotary.name}
        signerUsername={activeNotary.username}
        registeredPhotoUrl={activeNotary.photo_url}
      />
    </div>
  );
};
