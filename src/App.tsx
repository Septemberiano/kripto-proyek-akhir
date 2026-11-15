import { useState, useEffect, useCallback, useMemo } from 'react';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/views/OverviewView';
import { DocumentsView } from './components/views/DocumentsView';
import { EncryptedFilesView } from './components/views/EncryptedFilesView';
import { ChainOfTitleView } from './components/views/ChainOfTitleView';
import { SuperEncryptionView } from './components/views/SuperEncryptionView';
import { SteganographyView } from './components/views/SteganographyView';
import { ClientsView } from './components/views/ClientsView';
import { SuperAdminView } from './components/views/SuperAdminView';
import { AddDocumentModal } from './components/AddDocumentModal';
import { ClientOverviewView } from './components/views/client/ClientOverviewView';
import { ClientRequestsView } from './components/views/client/ClientRequestsView';
import { ClientRequestModal } from './components/client/ClientRequestModal';
import { NotaryRequestsView } from './components/views/NotaryRequestsView';
import { DongleManagerModal } from './components/DongleManagerModal';
import { DocumentSignModal } from './components/DocumentSignModal';

import type {
  DocumentItem,
  AuditLogItem,
  UserSession,
  ClientRequestItem,
  UserRole,
  UserItem,
} from './types';
import {
  fetchDocuments,
  createDocument,
  signDocument,
  fetchAuditLogs,
  checkBackendHealth,
  fetchClientRequests,
  fetchUsers,
  verifyClientKyc,
  updateClientRequestStatus,
  signClientRequest,
} from './services/api';
import { CheckCircle2, Shield, Server } from 'lucide-react';

const SESSION_STORAGE_KEY = 'arsipnusa_user_session';

const getDefaultTab = (role: UserRole): NavTab => {
  if (role === 'superadmin') return 'Manajemen Pengguna';
  if (role === 'admin') return 'Ikhtisar';
  return 'Beranda';
};

export function App() {
  // Authentication State
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    return session ? getDefaultTab(session.role) : 'Ikhtisar';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isDongleModalOpen, setIsDongleModalOpen] = useState(false);
  const [signingDoc, setSigningDoc] = useState<DocumentItem | null>(null);

  // Data & Backend State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [clientRequests, setClientRequests] = useState<ClientRequestItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersCount, setUsersCount] = useState<number>(5);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isSuperAdmin = session?.role === 'superadmin';
  const isAdmin = session?.role === 'admin';
  const isClient = session?.role === 'client';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Check backend health and fetch documents from SQLite API
  const loadData = useCallback(async () => {
    const health = await checkBackendHealth();
    setIsBackendOnline(health.isOnline);

    const docRes = await fetchDocuments();
    setDocuments(docRes.data);

    const logs = await fetchAuditLogs();
    setAuditLogs(logs);

    if (session) {
      if (session.role === 'superadmin' || session.role === 'admin') {
        const uList = await fetchUsers();
        setUsers(uList);
        setUsersCount(uList.length);
      }
      const reqs = await fetchClientRequests(session.role === 'client' ? session.displayName : undefined);
      setClientRequests(reqs);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      loadData();
      setActiveTab(getDefaultTab(session.role));
    }
  }, [session, loadData]);

  // Handle Login
  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch {
      // ignore
    }
    setActiveTab(getDefaultTab(newSession.role));
    showToast(
      `Otorisasi Berhasil. Selamat datang di ${
        newSession.role === 'superadmin'
          ? 'Pusat Kendali Super Admin'
          : newSession.role === 'admin'
          ? 'Ruang Kerja Notaris'
          : 'Client Trust Portal'
      }, ${newSession.displayName}!`
    );
  };

  // Handle Logout
  const handleLogout = () => {
    setSession(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    setActiveTab('Ikhtisar');
  };

  // Handle Create Document (POST /api/documents)
  const handleCreateDocument = async (docPayload: Omit<DocumentItem, 'id' | 'created_at'>) => {
    const res = await createDocument(docPayload);
    setDocuments((prev) => [res.data, ...prev]);

    // Refresh audit logs
    const updatedLogs = await fetchAuditLogs();
    setAuditLogs(updatedLogs);

    showToast(
      res.fromBackend
        ? `Dokumen "${res.data.title}" berhasil disimpan di SQLite Database!`
        : `Dokumen "${res.data.title}" tersimpan di Penyimpanan Lokal (Mode Offline).`
    );
  };

  // Handle Request Created by Client
  const handleRequestCreated = (req: ClientRequestItem) => {
    setClientRequests((prev) => [req, ...prev]);
    showToast(`Permintaan "${req.title}" berhasil dikirimkan ke meja kerja Notaris.`);
  };

  // Handle Notary Updating Request Status (e.g. Sedang Diproses, Ditolak)
  const handleUpdateRequestStatus = async (
    id: string,
    status: ClientRequestItem['status'],
    notaryNotes?: string
  ) => {
    const updated = await updateClientRequestStatus(id, status, notaryNotes);
    setClientRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    const logs = await fetchAuditLogs();
    setAuditLogs(logs);
    showToast(`Status permohonan berhasil diperbarui menjadi "${status}".`);
  };

  // Handle Notary Signing Request and Issuing Draft or Official Deed
  const handleSignRequest = async (
    requestId: string,
    deedPayload: {
      title: string;
      client: string;
      type: string;
      value: string;
      encrypted_content: string;
      algorithm: string;
      sha256_hash: string;
      notary_notes?: string;
      signatureMode?: 'dual' | 'direct';
      notaryName?: string;
      authMethod?: string;
    }
  ) => {
    const res = await signClientRequest(requestId, deedPayload);
    if (res.success) {
      setDocuments((prev) => [res.document, ...prev]);
      setClientRequests((prev) => prev.map((r) => (r.id === requestId ? res.request : r)));
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
      showToast(
        deedPayload.signatureMode === 'direct'
          ? `Akta resmi "${res.document.title}" (${res.document.id}) berhasil ditandatangani dan disegel ke dalam brankas!`
          : `Draf akta "${res.document.title}" (${res.document.id}) dikirim ke klien (${res.document.client}) untuk tanda tangan persetujuan!`
      );
    }
  };

  // Handle Dual-Signature on Existing Document (Step 1 Client -> Step 2 Notary)
  const handleSignDocument = async (
    doc: DocumentItem,
    payload: {
      signerRole: 'client' | 'admin';
      signerName: string;
      username?: string;
      passwordHash?: string;
      authMethod?: string;
    }
  ) => {
    const res = await signDocument(doc.id, payload);
    if (res.success) {
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? res.document : d)));
      if (session) {
        const reqs = await fetchClientRequests(
          session.role === 'client' ? session.displayName : undefined
        );
        setClientRequests(reqs);
      }
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
      showToast(res.message);
    }
  };

  const handleVerifyClientKyc = async (userId: string) => {
    const res = await verifyClientKyc(userId);
    if (res.success && res.user) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user! : u)));
      showToast(`Identitas KYC klien ${res.user.name} berhasil diverifikasi.`);
    } else {
      showToast(res.error || 'Gagal memverifikasi KYC klien.');
    }
  };

  // Filter documents specific to the logged-in client (strict RBAC, no fallback leak)
  const clientDocuments = useMemo(() => {
    if (!session || !isClient) return documents;
    const clientNameLower = session.displayName.toLowerCase();
    return documents.filter(
      (d) =>
        d.client.toLowerCase().includes(clientNameLower) ||
        clientNameLower.includes(d.client.toLowerCase())
    );
  }, [documents, session, isClient]);

  const clientsCount = useMemo(
    () => users.filter((u) => u.role === 'client').length,
    [users]
  );

  const sidebarRequestsCount = useMemo(() => {
    if (isClient) {
      return clientRequests.filter((r) => r.status === 'Menunggu TTD Klien').length;
    }
    return clientRequests.filter(
      (r) => r.status === 'Menunggu Peninjauan' || r.status === 'Sedang Diproses'
    ).length;
  }, [clientRequests, isClient]);

  // 1. ACCESS CONTROL: If not authenticated, block dashboard and show Login
  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. MAIN DASHBOARD: Adapt visual styles and workspace depending on Role (Strict RBAC)
  return (
    <div
      className={`app-shell min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isSuperAdmin
          ? 'superadmin-mode bg-[#f8fafc]'
          : isAdmin
          ? 'admin-mode bg-[#f5f3ee]'
          : 'client-mode bg-white'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-white border shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 ${
            isSuperAdmin
              ? 'bg-[#0f1d38] border-[#223b6c]'
              : isAdmin
              ? 'bg-[#142825] border-[#2d4a45]'
              : 'bg-[#263640] border-[#3a4c56]'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation (Strict RBAC - No Role Switcher) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        session={session}
        onLogout={handleLogout}
        isBackendOnline={isBackendOnline}
        documentsCount={documents.length}
        requestsCount={sidebarRequestsCount}
        usersCount={usersCount}
        clientsCount={clientsCount}
        clientDocumentsCount={clientDocuments.length}
        onOpenDongleModal={() => setIsDongleModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="md:pl-64 flex-1 flex flex-col min-w-0">
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenAddModal={() => {
            if (isAdmin) {
              setIsAddModalOpen(true);
            } else if (isClient) {
              setIsRequestModalOpen(true);
            }
          }}
          isBackendOnline={isBackendOnline}
          onRefreshBackend={loadData}
          session={session}
          onOpenDongleModal={() => setIsDongleModalOpen(true)}
          documents={isClient ? clientDocuments : documents}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Emergency Notice if entered via Biometric Face Recognition */}
          {isAdmin && !session.isDongleConnected && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-200 text-amber-900 shrink-0">
                  <Shield className="w-5 h-5 text-amber-900" />
                </div>
                <div>
                  <strong className="text-sm font-semibold block text-amber-950">
                    Mode Pemulihan Darurat Aktif: Masuk via Face Recognition Notaris
                  </strong>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Hardware Token USB Flashdisk fisik tidak terhubung. Jika flashdisk Anda hilang, segera blokir dongle lama dan terbitkan kunci pengganti.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDongleModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shrink-0 transition cursor-pointer"
              >
                Kelola / Blokir Dongle Hilang
              </button>
            </div>
          )}
          {/* ================= 1. SUPER ADMIN VIEWS ================= */}
          {isSuperAdmin && (
            <SuperAdminView
              activeTab={
                activeTab as
                  | 'Manajemen Pengguna'
                  | 'Status Sistem & Database'
                  | 'Audit Log Global'
              }
              searchQuery={searchQuery}
              onRefreshStats={loadData}
            />
          )}

          {/* ================= 2. NOTARIS (ADMIN) VIEWS ================= */}
          {isAdmin && (
            <>
              {activeTab === 'Ikhtisar' && (
                <OverviewView
                  documents={documents}
                  auditLogs={auditLogs}
                  clientRequests={clientRequests}
                  setActiveTab={setActiveTab}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onSignDocument={setSigningDoc}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'Permohonan Klien' && (
                <NotaryRequestsView
                  requests={clientRequests}
                  documents={documents}
                  onUpdateStatus={handleUpdateRequestStatus}
                  onSignRequest={handleSignRequest}
                  onSignDocument={setSigningDoc}
                  onNavigateToDocument={(_docId) => setActiveTab('Wasiat & Akta')}
                  searchQuery={searchQuery}
                  notaryName={session.displayName}
                  notaryUsername={session.username}
                  notaryPhotoUrl={session.photo_url}
                />
              )}

              {activeTab === 'Aset & Sertifikat' && (
                <DocumentsView
                  documents={documents}
                  title="Aset & Sertifikat Tanah"
                  subtitle="Pencatatan hak kepemilikan tanah, gedung, dan saham klien yang tersimpan di database SQLite"
                  categoryLabel="REGISTRASI ASET TANAH & KEPEMILIKAN SAHAM"
                  allowedTypes={['Sertifikat Tanah', 'Kepemilikan Saham']}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  searchQuery={searchQuery}
                  userRole={session.role}
                  onSignDocument={setSigningDoc}
                />
              )}

              {activeTab === 'Wasiat & Akta' && (
                <DocumentsView
                  documents={documents}
                  title="Wasiat & Akta Notarial"
                  subtitle="Buku register surat wasiat rahasia, klausul pewarisan, dan akta notaris terenkripsi"
                  categoryLabel="REGISTRASI SURAT WASIAT & AKTA NOTARIS"
                  allowedTypes={['Surat Wasiat', 'Akta Notaris', 'Perjanjian Bisnis']}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  searchQuery={searchQuery}
                  userRole={session.role}
                  onSignDocument={setSigningDoc}
                />
              )}

              {activeTab === 'Klien' && (
                <ClientsView
                  searchQuery={searchQuery}
                  users={users}
                  documents={documents}
                  onVerifyKyc={handleVerifyClientKyc}
                />
              )}

              {activeTab === 'Berkas Terenkripsi' && <EncryptedFilesView />}

              {activeTab === 'Chain of Title' && <ChainOfTitleView documents={documents} />}

              {activeTab === 'Super Enkripsi' && (
                <SuperEncryptionView onSaveToVault={handleCreateDocument} />
              )}

              {activeTab === 'Steganografi' && <SteganographyView />}
            </>
          )}

          {/* ================= 3. CLIENT (USER) VIEWS ================= */}
          {isClient && (
            <>
              {activeTab === 'Beranda' && (
                <ClientOverviewView
                  session={session}
                  clientDocuments={clientDocuments}
                  clientRequests={clientRequests}
                  onOpenRequestModal={() => setIsRequestModalOpen(true)}
                  onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
                  onSignDocument={setSigningDoc}
                />
              )}

              {activeTab === 'Aset Saya' && (
                <DocumentsView
                  documents={clientDocuments}
                  title="Aset Terdaftar Milik Saya"
                  subtitle="Seluruh sertifikat tanah, properti, dan kepemilikan saham resmi yang terhubung dengan akun Anda"
                  categoryLabel="PORTAL ASET & PROPERTI PRIBADI"
                  allowedTypes={['Sertifikat Tanah', 'Kepemilikan Saham']}
                  onOpenAddModal={() => setIsRequestModalOpen(true)}
                  searchQuery={searchQuery}
                  userRole={session.role}
                  onSignDocument={setSigningDoc}
                />
              )}

              {activeTab === 'Dokumen Saya' && (
                <DocumentsView
                  documents={clientDocuments}
                  title="Dokumen Hukum & Akta Saya"
                  subtitle="Salinan digital akta notaris, surat wasiat keluarga, dan perjanjian hukum sah Anda"
                  categoryLabel="PORTAL SURAT WASIAT & AKTA HUKUM SAYA"
                  allowedTypes={['Surat Wasiat', 'Akta Notaris', 'Perjanjian Bisnis']}
                  onOpenAddModal={() => setIsRequestModalOpen(true)}
                  searchQuery={searchQuery}
                  userRole={session.role}
                  onSignDocument={setSigningDoc}
                />
              )}

              {activeTab === 'Permintaan' && (
                <ClientRequestsView
                  requests={clientRequests}
                  clientDocuments={clientDocuments}
                  onOpenModal={() => setIsRequestModalOpen(true)}
                  onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
                  onSignDocument={setSigningDoc}
                />
              )}

              {activeTab === 'Riwayat Kepemilikan' && (
                <ChainOfTitleView documents={clientDocuments} isClient />
              )}

              {activeTab === 'Cek Keaslian Berkas' && <SteganographyView />}
            </>
          )}
        </main>

        {/* Global Footer */}
        <footer
          className={`w-full px-6 py-4 border-t text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto ${
            isSuperAdmin
              ? 'bg-[#f1f5f9] border-[#cbd5e1] text-slate-600'
              : isAdmin
              ? 'bg-[#fbfaf7] border-[#dfddd6] text-[#69736f]'
              : 'bg-white border-slate-200 text-slate-600 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <Server className="w-4 h-4 text-indigo-600" />
            ) : (
              <Shield className={`w-4 h-4 ${isAdmin ? 'text-[#2d6958]' : 'text-[#3f606e]'}`} />
            )}
            <span>
              {isSuperAdmin
                ? 'Super Admin Control Center · Akses Root & Manajemen Sistem Terisolasi'
                : isAdmin
                ? 'Sistem Notaris Sehat · Pencadangan Terenkripsi Tersegel · Standar ISO 27001'
                : 'Koneksi Klien Aman · Enkripsi Ujung-ke-Ujung Aktif · Verifikasi Identitas Sah'}
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-75">
            ArsipNusa v2.4.1 ·{' '}
            {isSuperAdmin
              ? 'Super Admin Console'
              : isAdmin
              ? 'Notarial Vault Console'
              : 'Client Trust Portal'}
          </span>
        </footer>
      </div>

      {/* Admin Modal: Tambah Dokumen Baru */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateDocument}
        isBackendOnline={isBackendOnline}
      />

      {/* Client Modal: Ajukan Permintaan / Pendaftaran Aset Baru */}
      <ClientRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        clientName={session.displayName}
        onRequestCreated={handleRequestCreated}
      />

      {/* Hardware USB Dongle & Lost Key Mitigation Modal */}
      <DongleManagerModal
        isOpen={isDongleModalOpen}
        onClose={() => setIsDongleModalOpen(false)}
        session={session}
        onTokenStatusChange={(isConnected, serial) => {
          showToast(
            isConnected
              ? `Flashdisk Dongle (${serial || 'Terotorisasi'}) terhubung ke brankas.`
              : 'Flashdisk Dongle dicabut / dilepaskan dari brankas.'
          );
        }}
      />

      {/* Dual-Signature Modal (Client Consent -> Notary Seal) */}
      <DocumentSignModal
        key={signingDoc?.id ?? 'closed'}
        document={signingDoc}
        session={session}
        onClose={() => setSigningDoc(null)}
        onSign={handleSignDocument}
      />
    </div>
  );
}

export default App;
