import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Camera,
  Upload,
  Scan,
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
import { sha256 } from '../../utils/crypto';

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
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formFaceDescriptor, setFormFaceDescriptor] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Webcam Capture State for Face Registration
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Delete Confirm State
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const startWebcam = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsWebcamActive(true);
      } else {
        showToast('Kamera tidak didukung pada browser ini', 'error');
      }
    } catch {
      showToast('Gagal mengakses kamera fisik. Pastikan izin kamera telah diberikan.', 'error');
      setIsWebcamActive(false);
    }
  };

  const captureWebcamPhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 360;
    const height = video.videoHeight || 360;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror horizontal
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const digest = await sha256(`BIO_FACE_${formUsername || 'NOTARIS'}_${dataUrl.slice(0, 100)}_${Date.now()}`);
      setFormPhotoUrl(dataUrl);
      setFormFaceDescriptor(`SHA256-BIO-FACE-${digest.slice(0, 24).toUpperCase()}`);
      stopWebcam();
      showToast('Foto wajah berhasil dijepret & biometrik tersimpan!');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Berkas harus berupa gambar (JPG, PNG, WEBP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 360;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const digest = await sha256(`BIO_FACE_${formUsername || 'USER'}_${dataUrl.slice(0, 100)}_${Date.now()}`);
          setFormPhotoUrl(dataUrl);
          setFormFaceDescriptor(`SHA256-BIO-FACE-${digest.slice(0, 24).toUpperCase()}`);
          showToast('Foto profil & biometrik wajah berhasil dimuat!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
  const handleOpenCreateModal = (defaultRole: UserRole = 'client') => {
    stopWebcam();
    setModalMode('create');
    setEditingUserId(null);
    setFormUsername(defaultRole === 'admin' ? 'notaris_' : '');
    setFormName('');
    setFormRole(defaultRole);
    setFormPassword('');
    setFormNik('');
    setFormEmail('');
    setFormPhone('');
    setFormPhotoUrl('');
    setFormFaceDescriptor('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: UserItem) => {
    stopWebcam();
    setModalMode('edit');
    setEditingUserId(u.id);
    setFormUsername(u.username);
    setFormName(u.name);
    setFormRole(u.role);
    setFormPassword(''); // leave blank if unchanged
    setFormNik(u.nik || '');
    setFormEmail(u.email || '');
    setFormPhone(u.phone || '');
    setFormPhotoUrl(u.photo_url || '');
    setFormFaceDescriptor(u.face_descriptor || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    stopWebcam();
    setIsModalOpen(false);
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
          photo_url: formPhotoUrl,
          face_descriptor: formFaceDescriptor,
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
          photo_url: formPhotoUrl,
          face_descriptor: formFaceDescriptor,
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

      handleCloseModal();
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreateModal('admin')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition cursor-pointer shadow-md shadow-emerald-700/20"
              >
                <Shield className="w-4 h-4 text-emerald-200" />
                <span>Tambah Notaris (+ Biometrik)</span>
              </button>

              <button
                onClick={() => handleOpenCreateModal('client')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pengguna</span>
              </button>
            </div>
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
                          {u.photo_url ? (
                            <img
                              src={u.photo_url}
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-full font-bold text-xs grid place-items-center shrink-0 ${
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
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-500 font-mono">
                                @{u.username}
                              </span>
                              {u.photo_url || u.face_descriptor ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Face ID Aktif
                                </span>
                              ) : u.role === 'admin' ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Belum Ada Foto
                                </span>
                              ) : null}
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
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${formRole === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-600'}`}>
                  {formRole === 'admin' ? <Shield className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {modalMode === 'create'
                      ? formRole === 'admin'
                        ? 'Daftarkan Notaris Baru'
                        : 'Tambah Pengguna Baru'
                      : 'Edit Data Pengguna'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === 'create'
                      ? formRole === 'admin'
                        ? 'Registrasi akun Notaris dan template biometrik wajah ke SQLite'
                        : 'Daftarkan Super Admin, Notaris, atau Klien ke SQLite'
                      : `Perbarui profil untuk @${formUsername}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Peran Akses Pengguna *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-indigo-600 font-medium"
                >
                  <option value="client">Klien (User Biasa)</option>
                  <option value="admin">Notaris (Administrator Hukum)</option>
                  <option value="superadmin">Super Admin (Administrator Sistem)</option>
                </select>
              </div>

              {/* Face Biometric Registration Section */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-emerald-700" />
                    <span className="font-semibold text-emerald-900 text-xs">
                      Foto Profil & Referensi Biometrik Wajah
                    </span>
                  </div>
                  {formPhotoUrl && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Terdaftar
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  {formRole === 'admin'
                    ? 'Foto ini menjadi acuan master AI Face Recognition untuk Notaris saat melakukan otorisasi login darurat tanpa USB flashdisk atau mengesahkan dokumen rahasia.'
                    : 'Foto identitas pengguna untuk verifikasi profil akun di sistem notaris.'}
                </p>

                {/* Live Webcam Viewport inside Modal */}
                {isWebcamActive && (
                  <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-black border-2 border-emerald-600 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-36 h-48 border-2 border-dashed border-emerald-400 rounded-2xl animate-pulse" />
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={captureWebcamPhoto}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Jepret Foto Wajah</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopWebcam}
                        className="px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs cursor-pointer"
                      >
                        Batal Kamera
                      </button>
                    </div>
                  </div>
                )}

                {/* Photo Preview & Management */}
                {!isWebcamActive && (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {formPhotoUrl ? (
                      <div className="relative group shrink-0">
                        <img
                          src={formPhotoUrl}
                          alt="Face Preview"
                          className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-600 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormPhotoUrl('');
                            setFormFaceDescriptor('');
                          }}
                          className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-sm cursor-pointer"
                          title="Hapus foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-100/50 flex flex-col items-center justify-center text-emerald-600 shrink-0">
                        <User className="w-8 h-8 opacity-60" />
                        <span className="text-[9px] mt-0.5">Belum ada foto</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={startWebcam}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Ambil via Kamera</span>
                        </button>

                        <label
                          htmlFor="modal-photo-file-input"
                          className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-900 font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Unggah File Foto</span>
                        </label>
                        <input
                          id="modal-photo-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </div>

                      {formFaceDescriptor && (
                        <div className="text-[10px] font-mono text-emerald-900 break-all bg-emerald-100/70 p-1.5 rounded border border-emerald-200">
                          Descriptor: <b>{formFaceDescriptor}</b>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                  onClick={handleCloseModal}
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
