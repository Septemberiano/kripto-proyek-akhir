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
import { AddDocumentModal } from './components/AddDocumentModal';
import { ClientOverviewView } from './components/views/client/ClientOverviewView';
import { ClientRequestsView } from './components/views/client/ClientRequestsView';
import { ClientRequestModal } from './components/client/ClientRequestModal';

import type { DocumentItem, AuditLogItem, UserSession, ClientRequestItem } from './types';
import {
  fetchDocuments,
  createDocument,
  fetchAuditLogs,
  checkBackendHealth,
  fetchClientRequests,
} from './services/api';
import { CheckCircle2, Shield } from 'lucide-react';

const SESSION_STORAGE_KEY = 'arsipnusa_user_session';

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
  const [activeTab, setActiveTab] = useState<NavTab>('Ikhtisar');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Data & Backend State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [clientRequests, setClientRequests] = useState<ClientRequestItem[]>([]);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAdmin = session?.role === 'admin';

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
      const reqs = await fetchClientRequests(isAdmin ? undefined : session.displayName);
      setClientRequests(reqs);
    }
  }, [session, isAdmin]);

  useEffect(() => {
    if (session) {
      loadData();
      // Set appropriate default tab when logging in
      setActiveTab(session.role === 'admin' ? 'Ikhtisar' : 'Beranda');
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
    setActiveTab(newSession.role === 'admin' ? 'Ikhtisar' : 'Beranda');
    showToast(
      `Otorisasi Berhasil. Selamat datang di ${
        newSession.role === 'admin' ? 'Ruang Kerja Notaris' : 'Client Trust Portal'
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

  // Handle Role Preview Switcher (Allows testing both views effortlessly)
  const handleSwitchRolePreview = (nextRole: 'admin' | 'client') => {
    if (!session) return;
    const switchedSession: UserSession = {
      ...session,
      role: nextRole,
      displayName: nextRole === 'admin' ? 'Natasha S.H., M.Kn.' : 'Rina Hartono',
      isDongleConnected: nextRole === 'admin',
    };
    setSession(switchedSession);
    setActiveTab(nextRole === 'admin' ? 'Ikhtisar' : 'Beranda');
    showToast(`Beralih tampilan pratinjau: ${nextRole === 'admin' ? 'Konsol Notaris' : 'Portal Klien'}`);
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

  // Filter documents specific to the logged-in client
  const clientDocuments = useMemo(() => {
    if (!session || isAdmin) return documents;
    const clientNameLower = session.displayName.toLowerCase();
    const userMatched = documents.filter((d) =>
      d.client.toLowerCase().includes(clientNameLower) ||
      clientNameLower.includes(d.client.toLowerCase())
    );
    // If no strict match, show the demo client assets (e.g. Rina Hartono's deeds)
    return userMatched.length > 0
      ? userMatched
      : documents.filter((d) => d.client.toLowerCase().includes('hartono'));
  }, [documents, session, isAdmin]);

  // 1. ACCESS CONTROL: If not authenticated, block dashboard and show Login
  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. MAIN DASHBOARD: Adapt visual styles and workspace depending on Role
  return (
    <div
      className={`app-shell min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isAdmin ? 'admin-mode bg-[#f5f3ee]' : 'client-mode bg-white'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-white border shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 ${
            isAdmin
              ? 'bg-[#142825] border-[#2d4a45]'
              : 'bg-[#263640] border-[#3a4c56]'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        session={session}
        onLogout={handleLogout}
        isBackendOnline={isBackendOnline}
        documentsCount={documents.length}
        requestsCount={clientRequests.length}
        onSwitchRolePreview={handleSwitchRolePreview}
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
            } else {
              setIsRequestModalOpen(true);
            }
          }}
          isBackendOnline={isBackendOnline}
          onRefreshBackend={loadData}
          session={session}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* ================= ADMIN VIEWS ================= */}
          {isAdmin && (
            <>
              {activeTab === 'Ikhtisar' && (
                <OverviewView
                  documents={documents}
                  auditLogs={auditLogs}
                  setActiveTab={setActiveTab}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'Aset & Sertifikat' && (
                <DocumentsView
                  documents={documents}
                  title="Aset & Sertifikat Tanah"
                  subtitle="Pencatatan hak kepemilikan tanah, gedung, dan surat berharga klien yang tersimpan di database SQLite"
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'Wasiat & Akta' && (
                <DocumentsView
                  documents={documents}
                  title="Wasiat & Akta Notarial"
                  subtitle="Buku register surat wasiat rahasia, klausul pewarisan, dan akta notaris terenkripsi"
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'Klien' && <ClientsView searchQuery={searchQuery} />}

              {activeTab === 'Berkas Terenkripsi' && <EncryptedFilesView />}

              {activeTab === 'Chain of Title' && <ChainOfTitleView />}

              {activeTab === 'Super Enkripsi' && (
                <SuperEncryptionView onSaveToVault={handleCreateDocument} />
              )}

              {activeTab === 'Steganografi' && <SteganographyView />}
            </>
          )}

          {/* ================= CLIENT (USER) VIEWS ================= */}
          {!isAdmin && (
            <>
              {activeTab === 'Beranda' && (
                <ClientOverviewView
                  session={session}
                  clientDocuments={clientDocuments}
                  onOpenRequestModal={() => setIsRequestModalOpen(true)}
                  onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
                />
              )}

              {activeTab === 'Aset Saya' && (
                <DocumentsView
                  documents={clientDocuments}
                  title="Aset Terdaftar Milik Saya"
                  subtitle="Seluruh sertifikat tanah, properti, dan kepemilikan saham resmi yang terhubung dengan akun Anda"
                  onOpenAddModal={() => setIsRequestModalOpen(true)}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'Dokumen Saya' && (
                <DocumentsView
                  documents={clientDocuments}
                  title="Dokumen Hukum & Akta Saya"
                  subtitle="Salinan digital akta notaris, surat wasiat keluarga, dan perjanjian hukum sah Anda"
                  onOpenAddModal={() => setIsRequestModalOpen(true)}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'Permintaan' && (
                <ClientRequestsView
                  requests={clientRequests}
                  onOpenModal={() => setIsRequestModalOpen(true)}
                />
              )}

              {activeTab === 'Riwayat Kepemilikan' && <ChainOfTitleView />}

              {activeTab === 'Cek Keaslian Berkas' && <SteganographyView />}
            </>
          )}
        </main>

        {/* Global Footer */}
        <footer
          className={`w-full px-6 py-4 border-t text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto ${
            isAdmin
              ? 'bg-[#fbfaf7] border-[#dfddd6] text-[#69736f]'
              : 'bg-white border-slate-200 text-slate-600 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${isAdmin ? 'text-[#2d6958]' : 'text-[#3f606e]'}`} />
            <span>
              {isAdmin
                ? 'Sistem Notaris Sehat · Pencadangan Terenkripsi Tersegel · Standar ISO 27001'
                : 'Koneksi Klien Aman · Enkripsi Ujung-ke-Ujung Aktif · Verifikasi Identitas Sah'}
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-75">
            ArsipNusa v2.4.1 · {isAdmin ? 'Notarial Vault Console' : 'Client Trust Portal'}
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
    </div>
  );
}

export default App;
