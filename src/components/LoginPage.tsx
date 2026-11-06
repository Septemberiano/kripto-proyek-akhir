import React, { useState } from 'react';
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
} from 'lucide-react';
import { loginUser, registerUser } from '../services/api';
import type { UserSession } from '../types';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Mode: 'login-admin' | 'login-client' | 'register'
  const [activeMode, setActiveMode] = useState<'login-admin' | 'login-client' | 'register'>('login-admin');

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dongleConnected, setDongleConnected] = useState(true);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regNik, setRegNik] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const isAdminMode = activeMode === 'login-admin';

  const switchMode = (mode: 'login-admin' | 'login-client' | 'register') => {
    setActiveMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    if (mode === 'login-admin') {
      setUsername('admin');
      setPassword('admin123');
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

    try {
      const targetRole = isAdminMode ? 'admin' : 'client';
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
      className={`min-h-screen text-[#e7ece9] flex flex-col justify-between relative overflow-hidden font-sans transition-colors duration-500 ${
        isAdminMode ? 'bg-[#10231f]' : 'bg-[#1a2830]'
      }`}
    >
      {/* Background ambient glow */}
      <div
        className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isAdminMode ? 'bg-[#2d6958]/20' : 'bg-[#3b5d6e]/25'
        }`}
      />
      <div
        className={`absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isAdminMode ? 'bg-[#762e3b]/20' : 'bg-[#526d78]/20'
        }`}
      />

      {/* Top security bar */}
      <header
        className={`w-full px-6 py-4 flex items-center justify-between border-b backdrop-blur-md z-10 transition-colors ${
          isAdminMode
            ? 'border-[#29403c] bg-[#142825]/80'
            : 'border-[#304552] bg-[#20323c]/85'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 grid place-items-center border rotate-45 shadow-[inset_0_0_0_2px_#142825] transition-colors ${
              isAdminMode
                ? 'bg-[#772e3a] border-[#a57b6d]'
                : 'bg-[#526d78] border-[#93a6ad]'
            }`}
          >
            <span className="-rotate-45 text-[#f4e8dc] font-serif font-bold text-xs">AN</span>
          </div>
          <div>
            <h1 className="font-serif text-lg tracking-wide text-white leading-tight">ArsipNusa</h1>
            <p className="text-[10px] tracking-widest text-[#9caaa6] uppercase">
              {isAdminMode ? 'NOTARIAL VAULT · RUANG KERJA NOTARIS' : 'CLIENT TRUST PORTAL · PORTAL PRIBADI KLIEN'}
            </p>
          </div>
        </div>

        {/* Live Dongle / Biometric Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${
            isAdminMode
              ? 'border-[#2d4a45] bg-[#19302c]/90'
              : 'border-[#364d5c] bg-[#263c47]/90'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          {isAdminMode ? (
            <>
              <Usb className="w-3.5 h-3.5 text-[#88bbaa]" />
              <span className="text-[#dce8e4] text-[11px] font-medium hidden sm:inline">
                Mode Aman Aktif - Dongle {dongleConnected ? 'Terhubung' : 'Terlepas'}
              </span>
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5 text-[#8db3b9]" />
              <span className="text-[#dce8e4] text-[11px] font-medium hidden sm:inline">
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
            isAdminMode
              ? 'bg-[#162e2a]/95 border-[#2d4a45]'
              : 'bg-[#223540]/95 border-[#344d5a]'
          }`}
        >
          {/* ================= ROLE SELECTION TABS ================= */}
          <div className="mb-6">
            <label className="block text-[11px] font-bold tracking-widest text-[#8c9e99] uppercase mb-2 text-center">
              PILIH PERAN AKSES KE DALAM SISTEM:
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/30 border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchMode('login-admin')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                  activeMode === 'login-admin'
                    ? 'bg-[#2d6958] text-white shadow-md'
                    : 'text-[#8c9e99] hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Notaris (Admin)</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('login-client')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                  activeMode === 'login-client'
                    ? 'bg-[#3f606e] text-white shadow-md'
                    : 'text-[#8c9e99] hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Klien (User)</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                  activeMode === 'register'
                    ? 'bg-[#762e3b] text-white shadow-md'
                    : 'text-[#8c9e99] hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Daftar Akun</span>
              </button>
            </div>
          </div>

          {/* Mode contextual notice */}
          {activeMode === 'login-admin' && (
            <div className="mb-5 p-3 rounded-lg border border-[#2d4a45] bg-[#10231f]/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-[#1f3a35] text-[#88bbaa]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-[#e7ece9] flex items-center gap-1.5">
                    Ruang Kerja Notaris Utama
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      FIPS 140-2
                    </span>
                  </div>
                  <div className="text-[10px] text-[#81938e]">
                    Memerlukan kredensial notaris & otorisasi USB Dongle
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDongleConnected(!dongleConnected)}
                className="text-[10px] text-[#88bbaa] hover:text-white underline cursor-pointer"
              >
                {dongleConnected ? 'Cabut' : 'Sambung'}
              </button>
            </div>
          )}

          {activeMode === 'login-client' && (
            <div className="mb-5 p-3 rounded-lg border border-[#344d5a] bg-[#1b2b34]/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-[#2b414d] text-[#8db3b9]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-[#e7ece9] flex items-center gap-1.5">
                    Client Trust Portal
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Portal Pribadi
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8db3b9]/80">
                    Akses aman untuk memeriksa kepemilikan aset, wasiat, dan akta
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-md border border-rose-900/60 bg-rose-950/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= FORM 1: LOGIN (ADMIN & CLIENT) ================= */}
          {activeMode !== 'register' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#c4d2ce] mb-1.5">
                  {isAdminMode ? 'Username Notaris / Admin' : 'Username Klien Terdaftar'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71817d]">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder={isAdminMode ? 'admin' : 'Contoh: rina atau budi'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c4d2ce] mb-1.5">
                  Kata Sandi (Enkripsi SHA-256)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71817d]">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Kata sandi akun"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick default credential autofills */}
              <div className="pt-1 flex flex-col gap-1.5 text-[11px] text-[#81938e] bg-black/20 p-2.5 rounded-lg border border-white/5">
                <span className="font-semibold text-gray-300">Pilihan Demo Kredensial Cepat:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {isAdminMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('admin');
                        setPassword('admin123');
                        setErrorMsg('');
                      }}
                      className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:text-white flex items-center gap-1 font-mono transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Notaris: admin / admin123
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setUsername('rina');
                          setPassword('user123');
                          setErrorMsg('');
                        }}
                        className="px-2 py-1 rounded bg-[#27404d] border border-[#3b5d6e] text-cyan-200 hover:text-white flex items-center gap-1 font-mono transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Klien Rina: rina / user123
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUsername('budi');
                          setPassword('user123');
                          setErrorMsg('');
                        }}
                        className="px-2 py-1 rounded bg-[#27404d] border border-[#3b5d6e] text-cyan-200 hover:text-white flex items-center gap-1 font-mono transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Klien Budi: budi / user123
                      </button>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full mt-2 py-2.5 px-4 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-60 ${
                  isAdminMode
                    ? 'bg-[#2d6958] hover:bg-[#387e6b]'
                    : 'bg-[#3f606e] hover:bg-[#4d7485]'
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
                      {isAdminMode
                        ? 'Buka Ruang Kerja Notaris (Admin)'
                        : 'Masuk ke Portal Pribadi (Klien)'}
                    </span>
                  </>
                )}
              </button>

              <div className="text-center pt-2 text-xs text-gray-400">
                Belum memiliki akun klien?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  Daftar Akun Klien Baru Disini
                </button>
              </div>
            </form>
          ) : (
            /* ================= FORM 2: REGISTRATION (BUAT AKUN SENDIRI) ================= */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="text-center mb-2">
                <h3 className="font-serif text-lg text-white font-medium">Registrasi Akun Klien Baru</h3>
                <p className="text-[11px] text-gray-400">
                  Daftarkan diri Anda untuk mengakses brankas akta, wasiat, dan sertifikat tanah pribadi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#c4d2ce] mb-1">
                    Nama Lengkap Pemilik Akun *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Contoh: Ahmad Dahlan S.E."
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#c4d2ce] mb-1">
                    Nomor NIK KTP (16 Digit) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <CreditCard className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      value={regNik}
                      onChange={(e) => setRegNik(e.target.value)}
                      placeholder="3171051204850003"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#c4d2ce] mb-1">
                    Alamat Email Aktif
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="ahmad@email.com"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#c4d2ce] mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+62 812-3456-7890"
                      className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/10">
                <div>
                  <label className="block text-[11px] font-medium text-[#c4d2ce] mb-1">
                    Username Akun Baru *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Contoh: ahmad"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#c4d2ce] mb-1">
                    Kata Sandi *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-2.5 px-4 rounded-lg bg-[#2d6958] hover:bg-[#387e6b] text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 shadow-md"
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

              <div className="text-center pt-2 text-xs text-gray-400">
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login-client')}
                  className="text-cyan-400 hover:underline font-semibold cursor-pointer"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </form>
          )}

          {/* Security Features Bottom Checklist */}
          <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>SHA-256 Digest Validation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Peran Admin & Klien Terpisah</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Chain of Title Blockchain</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Database SQLite Persisten</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 border-t border-white/10 bg-black/40 text-center text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>ArsipNusa v2.4.1 · Notarial Cryptographic Vault Architecture</span>
        </div>
        <div>
          <span>Proyek Akhir Kriptografi · Hak Cipta Dilindungi Undang-Undang</span>
        </div>
      </footer>
    </div>
  );
};
