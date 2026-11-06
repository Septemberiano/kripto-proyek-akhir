import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Server,
  FileText,
  Shield,
  UserPlus,
  Trash2,
  Edit2,
  Database,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  User,
  HardDrive,
  RefreshCw,
  X,
} from 'lucide-react';
import type { UserItem, SystemStats, AuditLogItem, UserRole } from '../../types';
import {
  fetchUsers,
  createUserByAdmin,
  updateUser,
  deleteUser,
  fetchSystemStats,
  fetchAuditLogs,
} from '../../services/api';

interface SuperAdminViewProps {
  activeTab: 'Manajemen Pengguna' | 'Status Sistem & Database' | 'Audit Log Global';
  searchQuery: string;
  onRefreshStats?: () => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  activeTab,
  searchQuery,
}) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('client');
  const [formPassword, setFormPassword] = useState('');
  const [formNik, setFormNik] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [uList, sStats, logs] = await Promise.all([
        fetchUsers(),
        fetchSystemStats(),
        fetchAuditLogs(),
      ]);
      setUsers(uList);
      setStats(sStats);
      setAuditLogs(logs);
    } catch {
      showToast('Gagal memuat data dari server SQLite', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingUserId(null);
    setFormUsername('');
    setFormName('');
    setFormRole('client');
    setFormPassword('');
    setFormNik('');
    setFormEmail('');
    setFormPhone('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: UserItem) => {
    setModalMode('edit');
    setEditingUserId(u.id);
    setFormUsername(u.username);
    setFormName(u.name);
    setFormRole(u.role);
    setFormPassword(''); // leave blank if unchanged
    setFormNik(u.nik || '');
    setFormEmail(u.email || '');
    setFormPhone(u.phone || '');
    setIsModalOpen(true);
  };

  // Submit Modal
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formName.trim()) {
      showToast('Username dan nama lengkap wajib diisi!', 'error');
      return;
    }
    if (modalMode === 'create' && !formPassword.trim()) {
      showToast('Kata sandi wajib diisi untuk pengguna baru!', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      if (modalMode === 'create') {
        const res = await createUserByAdmin({
          username: formUsername,
          name: formName,
          role: formRole,
          password: formPassword,
          nik: formNik,
          email: formEmail,
          phone: formPhone,
        });

        if (!res.success || !res.user) {
          showToast(res.error || 'Gagal menambahkan pengguna.', 'error');
          setFormSubmitting(false);
          return;
        }

        setUsers((prev) => [res.user!, ...prev]);
        showToast(`Pengguna "${res.user.name}" (${res.user.role.toUpperCase()}) berhasil disimpan di SQLite!`);
      } else if (modalMode === 'edit' && editingUserId) {
        const payload: any = {
          name: formName,
          role: formRole,
          nik: formNik,
          email: formEmail,
          phone: formPhone,
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }

        const res = await updateUser(editingUserId, payload);
        if (!res.success || !res.user) {
          showToast(res.error || 'Gagal memperbarui pengguna.', 'error');
          setFormSubmitting(false);
          return;
        }

        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? res.user! : u)));
        showToast(`Data pengguna "${res.user.name}" berhasil diperbarui.`);
      }

      setIsModalOpen(false);
      // Refresh stats
      const updatedStats = await fetchSystemStats();
      setStats(updatedStats);
    } catch {
      showToast('Terjadi kesalahan saat memproses data pengguna.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete User
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      const res = await deleteUser(deletingUser.id);
      if (!res.success) {
        showToast(res.error || 'Gagal menghapus pengguna.', 'error');
        setDeletingUser(null);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      showToast(`Pengguna "${deletingUser.name}" berhasil dihapus dari sistem.`);
      setDeletingUser(null);

      // Refresh stats
      const updatedStats = await fetchSystemStats();
      setStats(updatedStats);
    } catch {
      showToast('Gagal menghapus pengguna.', 'error');
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = `${u.name} ${u.username} ${u.nik || ''} ${u.email || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Server className="w-3 h-3 text-indigo-600" /> Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Shield className="w-3 h-3 text-emerald-600" /> Notaris
          </span>
        );
      case 'client':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <User className="w-3 h-3 text-sky-600" /> Klien
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-white border shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-[#0f1d38] border-indigo-500/40'
              : 'bg-rose-950 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 uppercase">
              ROOT RBAC CONTROL PANEL
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">
              SUPER ADMINISTRATOR
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-slate-900 font-semibold tracking-tight mt-1">
            {activeTab === 'Manajemen Pengguna' && 'Manajemen Pengguna & Otorisasi'}
            {activeTab === 'Status Sistem & Database' && 'Kesehatan Server, Database & Enkripsi'}
            {activeTab === 'Audit Log Global' && 'Audit Trail Kriptografis Global'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {activeTab === 'Manajemen Pengguna' &&
              'Kelola akun Super Admin, Notaris rekanan, dan Klien terdaftar di database SQLite terenkripsi.'}
            {activeTab === 'Status Sistem & Database' &&
              'Pantau kapasitas penyimpanan SQLite, status modul kriptografi, dan persistensi berkas vault.'}
            {activeTab === 'Audit Log Global' &&
              'Catatan tamper-evident immutable seluruh aktivitas sistem yang disegel dengan SHA-256 block hash.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition cursor-pointer shadow-xs"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Segarkan</span>
          </button>

          {activeTab === 'Manajemen Pengguna' && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Pengguna Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Pengguna
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.users.total ?? users.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats?.users.admin ?? 0} Notaris · {stats?.users.client ?? 0} Klien ·{' '}
              {stats?.users.superadmin ?? 0} Admin
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* SQLite Database */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Database SQLite
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.databaseSizeKb ? `${stats.databaseSizeKb} KB` : '40 KB'}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{stats?.databaseStatus || 'Online (Persisten)'}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Database className="w-6 h-6" />
          </div>
        </div>

        {/* Total Documents in Vault */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Dokumen Hukum
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.documents.total ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats?.documents.verified ?? 0} Tersegel & Sah
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Cryptographic Engine */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Mesin Kriptografi
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1">
              <span>AES-256</span>
              <span className="text-slate-400">&</span>
              <span>ChaCha20</span>
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
              Super-Enkripsi + Stegano LSB
            </div>
          </div>
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ================= TAB 1: MANAJEMEN PENGGUNA ================= */}
      {activeTab === 'Manajemen Pengguna' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-1.5 self-start">
              <span className="text-xs font-semibold text-slate-700 mr-2">Filter Peran:</span>
              {(['all', 'superadmin', 'admin', 'client'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    roleFilter === r
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {r === 'all'
                    ? 'Semua'
                    : r === 'superadmin'
                    ? 'Super Admin'
                    : r === 'admin'
                    ? 'Notaris'
                    : 'Klien'}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500">
              Menampilkan <strong className="text-slate-800">{filteredUsers.length}</strong> pengguna
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Pengguna & Akun</th>
                  <th className="py-3 px-4">Peran Sistem</th>
                  <th className="py-3 px-4">Identitas (NIK)</th>
                  <th className="py-3 px-4">Kontak (Email / HP)</th>
                  <th className="py-3 px-4">Terdaftar Sejak</th>
                  <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Tidak ada pengguna yang sesuai dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full font-bold text-xs grid place-items-center shrink-0 ${
                              u.role === 'superadmin'
                                ? 'bg-indigo-100 text-indigo-700'
                                : u.role === 'admin'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0].toUpperCase())
                              .join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">{getRoleBadge(u.role)}</td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {u.nik || <span className="text-slate-400 italic">Tidak ada NIK</span>}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div className="space-y-0.5">
                          {u.email && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{u.email}</span>
                            </div>
                          )}
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                          {!u.email && !u.phone && (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit data pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {u.username !== 'superadmin' && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: STATUS SISTEM & DATABASE ================= */}
      {activeTab === 'Status Sistem & Database' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database SQLite Card */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Arsitektur Database SQLite</h3>
                    <p className="text-xs text-slate-500">File lokal tunggal dengan sinkronisasi REST API</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                  SQLite Sync
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Path Berkas Database:</span>
                  <span className="font-mono text-slate-800">vault.sqlite</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Kapasitas Penyimpanan:</span>
                  <span className="font-semibold text-slate-800">
                    {stats?.databaseSizeKb ? `${stats.databaseSizeKb} KB` : '40 KB'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Mode Transaksi:</span>
                  <span className="text-slate-800">ACID Compliant · Synchronous Normal</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Tabel Aktif:</span>
                  <span className="font-mono text-slate-800">users, documents, audit_logs, client_requests</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Waktu Server:</span>
                  <span className="font-mono text-slate-800">
                    {new Date(stats?.timestamp || Date.now()).toLocaleTimeString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Security Engine Card */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Spesifikasi Modul Kriptografi</h3>
                    <p className="text-xs text-slate-500">Standar keamanan FIPS 140-2 terintegrasi</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-100 text-indigo-800">
                  Aktif
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Enkripsi Simetris Utama:</span>
                  <span className="font-semibold text-slate-800">AES-256-GCM & ChaCha20-Poly1305</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Super-Encryption:</span>
                  <span className="font-semibold text-slate-800">Vigenere Cipher + AES-256</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Fungsi Hash & Otentikasi:</span>
                  <span className="font-mono text-slate-800">SHA-256 Digest (256-bit)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Steganografi Berkas:</span>
                  <span className="text-slate-800">LSB (Least Significant Bit) Image Watermarking</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Struktur Rantai Kepemilikan:</span>
                  <span className="text-slate-800">Chain of Title Blockchain Proof-of-Work</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: AUDIT LOG GLOBAL ================= */}
      {activeTab === 'Audit Log Global' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Catatan Audit Trail Kriptografis</h3>
              <p className="text-xs text-slate-500">
                Seluruh aktivitas mutasi dokumen, pembuatan wasiat, dan enkripsi tercatat permanen.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-medium">
              {auditLogs.length} Entri Log
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">{log.action}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                      {log.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{log.detail}</p>
                  {log.block_hash && (
                    <div className="text-[10px] font-mono text-slate-400 truncate max-w-md">
                      Hash: {log.block_hash}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">{log.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH / EDIT PENGGUNA ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {modalMode === 'create' ? 'Tambah Pengguna Baru' : 'Edit Data Pengguna'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === 'create'
                      ? 'Daftarkan Super Admin, Notaris, atau Klien ke SQLite'
                      : `Perbarui profil untuk @${formUsername}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Peran Akses Pengguna *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="client">Klien (User Biasa)</option>
                  <option value="admin">Notaris (Administrator Hukum)</option>
                  <option value="superadmin">Super Admin (Administrator Sistem)</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Natasha S.H., M.Kn."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Contoh: notaris_natasha"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {modalMode === 'create' ? 'Kata Sandi *' : 'Kata Sandi Baru (Kosongkan jika tidak diubah)'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={modalMode === 'create' ? 'Minimal 6 karakter' : 'Tetap menggunakan kata sandi lama'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* NIK */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor NIK KTP</label>
                <input
                  type="text"
                  value={formNik}
                  onChange={(e) => setFormNik(e.target.value)}
                  placeholder="16 digit NIK"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@arsipnusa.id"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+62 812-..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition cursor-pointer shadow-md disabled:opacity-60"
                >
                  {formSubmitting
                    ? 'Menyimpan...'
                    : modalMode === 'create'
                    ? 'Simpan Pengguna'
                    : 'Perbarui Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI HAPUS ================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="p-3 rounded-full bg-rose-50 text-rose-600 w-fit">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus akun <strong>{deletingUser.name}</strong> (@
                {deletingUser.username}) dari database SQLite? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer shadow-md shadow-rose-600/20"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
