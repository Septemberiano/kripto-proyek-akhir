# ArsipNusa: Notarial Cryptographic Vault & Client Trust Portal

Dokumentasi Resmi Proyek Akhir Kriptografi  
Sistem Manajemen Brankas Digital Notaris, Pejabat Pembuat Akta Tanah (PPAT), Portal Klien, dan Konsol Sysadmin berbasis Kriptografi Modern & SQLite (`node:sqlite`).

---

## 1. Ringkasan Eksekutif

ArsipNusa adalah aplikasi brankas digital kenotariatan yang dirancang untuk mencegah pemalsuan warkah, sengketa kepemilikan sertifikat tanah, kebocoran surat wasiat rahasia, serta manipulasi akta otentik. Sistem ini menggabungkan kriptografi klasik dan modern berstandar industri (AEAD), tanda tangan digital asimetris ECDSA P-256 dengan alur *Dual-Signature*, steganografi citra digital LSB, buku besar rantai kepemilikan (*Chain of Title* Blockchain PoW dengan verifikasi efek domino), pemisahan hak akses 3 peran (*Super Admin*, *Notaris*, dan *Klien*), serta penyimpanan persisten SQLite.

---

## 2. Arsitektur Kriptografi Sistem

### 2.1. Enkripsi Simetris AEAD & Super Enkripsi
Seluruh payload warkah/akta rahasia dan catatan permohonan dienkripsi secara nyata menggunakan Web Crypto API dan implementasi Node `crypto` yang saling kompatibel:
- **AES-256-GCM (NIST SP 800-38D):** Derivasi kunci PBKDF2-SHA256 (`10.000` iterasi, *salt* acak 16-byte, IV 12-byte, tag autentikasi 128-bit) dengan format paket `AESGCM1:<salt_b64>:<iv_b64>:<cipher+tag_b64>`.
- **ChaCha20-Poly1305 (RFC 8439):** Implementasi murni TypeScript (klien) & OpenSSL/Node `crypto` (server) dengan PBKDF2-SHA256 (`10.000` iterasi, *nonce* 12-byte, MAC Poly1305 16-byte) berformat `CHACHA1:<salt_b64>:<nonce_b64>:<cipher_b64>:<tag_b64>`.
- **Super Enkripsi (Vigenère + AES-256-GCM):**
  - **Lapisan 1 (Klasik):** Vigenère Cipher ($C_i = (P_i + K_i) \bmod 26$) untuk menyamarkan pola frekuensi bahasa teks asli.
  - **Lapisan 2 (Modern):** Hasil Vigenère dienkripsi ulang dengan **AES-256-GCM**.
  - **Dekripsi:** AES-256-GCM Decrypt (verifikasi tag autentikasi) $\rightarrow$ Sandi Vigenère Antara $\rightarrow$ Inversi Vigenère $\rightarrow$ Plaintext asli.
- **Enkripsi File Biner (`.enc`):** Modul *Berkas Terenkripsi* mengenkripsi berkas unggahan (mis. `.pdf`) pada level `Uint8Array` menjadi paket JSON terstruktur `ArsipNusa-EncryptedFile-v1`, lengkap dengan verifikasi ulang SHA-256 serta fitur pemulihan (*Dekripsi `.enc`*).

### 2.2. Tanda Tangan Digital Asimetris (ECDSA P-256) & Alur Dual-Signature
- Pengesahan akta memakai kurva eliptik **ECDSA P-256 (`SHA-256`)** pada Web Crypto API (`signPayloadECDSA` / `verifyPayloadECDSA`) dan dapat diverifikasi langsung melalui tombol **Verifikasi TTD ECDSA P-256** di detail dokumen.
- **Alur 2 Arah (Dual-Signature):**
  1. Notaris menerbitkan draf akta terenkripsi $\rightarrow$ status `Menunggu tanda tangan`.
  2. **Tahap 1 (Klien):** Klien meninjau & menandatangani akta dengan konfirmasi sandi akun + tanda tangan ECDSA P-256 $\rightarrow$ status berubah ke `Dalam peninjauan`.
  3. **Tahap 2 (Notaris):** Notaris mengesahkan & menyegel akhir memakai USB Dongle `.key` atau Face Recognition + tanda tangan ECDSA P-256 $\rightarrow$ status resmi `Terverifikasi`.

### 2.3. Autentikasi Kredensial (`scrypt`), USB Dongle `.key` & Biometrik Wajah
- **Penyimpanan Password (`scrypt`):** Di `server.js`, ringkasan SHA-256 dari klien di-hash ulang dengan garam acak (*salted scrypt*, `scrypt:<salt>:<hex>`) sebelum disimpan di SQLite, serta diperiksa menggunakan `crypto.timingSafeEqual`.
- **Sertifikat Hardware Dongle (`.key` v2.5.0):** Modul `src/utils/dongle.ts` menerbitkan dan memverifikasi berkas kunci flashdisk menggunakan **ECDSA P-256** (`publicKeyJwk` + sidik jari SHA-256, dengan dukungan mundur `2.4.1`). Tersedia juga fitur pencabutan token (*Revoke*) ke tabel `security_tokens` (tersinkron dengan fallback `localStorage`).
- **Face Recognition Darurat:** Apabila dongle fisik hilang, verifikasi darurat webcam mengekstrak vektor **luminansi 16×16, gradien spasial, dan krominans YCbCr** untuk dibandingkan terhadap foto master notaris di SQLite.

### 2.4. Buku Besar Rantai Kepemilikan (Chain of Title Blockchain + Domino PoW)
- Setiap akta membentuk blok dinamis setelah Genesis Block (`#001`) dengan penambangan **Proof-of-Work prefix `'00'`** (`mineBlockWithPoW`).
- Hash blok dihitung dari `Index|PreviousHash|Timestamp|DataHash|Nonce`.
- **Verifikasi Efek Domino (`verifyChainIntegrity`):** Jika payload/hash pada Block ke-$k$ diubah (baik dengan atau tanpa re-hash lokal), sistem mendeteksi ketidaksesuaian tautan hilir dan menandai **seluruh blok $k \dots N$** tidak valid secara beruntun.

### 2.5. Steganografi Citra Digital (LSB)
- Menyisipkan dan mengekstrak pesan rahasia pada kanal warna RGB gambar PNG (`Canvas ImageData`) dengan header panjang 32-bit dan kanal Alpha tetap utuh.

---

## 3. Pemisahan Peran (Strict RBAC)

1. **Super Admin (`superadmin`):** Manajemen akun pengguna (`users`), statistik database SQLite, penerbitan & pencabutan USB Dongle Token, pendaftaran foto biometrik, dan Audit Log Global.
2. **Notaris / Admin (`admin`):** Konsol utama brankas notaris (*Ikhtisar*, *Permohonan Klien*, *Aset & Sertifikat*, *Wasiat & Akta*, *Klien + Verifikasi KYC*, *Berkas Terenkripsi*, *Chain of Title*, *Super Enkripsi*, dan *Steganografi*).
3. **Klien (`client`):** Portal terisolasi (*Beranda*, *Aset Saya*, *Dokumen Saya*, *Permintaan* dengan catatan terenkripsi AES-256-GCM, *Riwayat Kepemilikan*, dan *Cek Keaslian Berkas*). Setiap klien hanya melihat dokumen milik dirinya sendiri.

---

## 4. Struktur Direktori Utama

```text
├── server.js                              # Backend Express 5 + SQLite (node:sqlite) & Node Crypto
├── vault.sqlite                           # Database SQLite persisten lokal (auto-create jika dihapus)
├── package.json                           # Dependensi & npm scripts
└── src/
    ├── App.tsx                            # Pengontrol sesi, RBAC, dan routing view
    ├── types/index.ts                     # Definisi tipe TypeScript
    ├── services/api.ts                    # REST client + fallback localStorage
    ├── utils/
    │   ├── crypto.ts                      # AES-256-GCM, ChaCha20-Poly1305, Vigenère, ECDSA P-256, PoW & Domino
    │   └── dongle.ts                      # Generator & verifier file USB Dongle .key (ECDSA P-256 v2.5.0)
    └── components/
        ├── LoginPage.tsx                  # Login, Register, Demo Cepat, USB Dongle & Face ID
        ├── Header.tsx / Sidebar.tsx       # Navigasi peran & metrik dinamis
        ├── AddDocumentModal.tsx           # Pembuatan akta baru + enkripsi real-time
        ├── DocumentSignModal.tsx          # Modal tanda tangan ECDSA Dual-Signature
        ├── DongleManagerModal.tsx         # Penerbitan & pencabutan USB Dongle Notaris
        ├── FaceRecognitionModal.tsx       # Scanner biometrik wajah darurat
        ├── client/ClientRequestModal.tsx  # Pengajuan permintaan + enkripsi catatan AES-256-GCM
        └── views/
            ├── OverviewView.tsx           # Dashboard ringkasan Notaris
            ├── NotaryRequestsView.tsx     # Meja kerja pengesahan permohonan klien
            ├── DocumentsView.tsx          # Tabel & modal dekripsi nyata + verifikasi ECDSA
            ├── ClientsView.tsx            # Daftar klien SQLite + tombol Verifikasi KYC
            ├── EncryptedFilesView.tsx     # Enkripsi/dekripsi file binary (.enc) nyata
            ├── ChainOfTitleView.tsx       # Simulasi Blockchain PoW & pengujian serangan domino
            ├── SuperEncryptionView.tsx    # Laboratorium Vigenère + AES-256-GCM
            ├── SteganographyView.tsx      # Encode/Decode LSB image watermark
            ├── SuperAdminView.tsx         # Manajemen user, dongle, biometrik & status SQLite
            └── client/                    # ClientOverviewView.tsx & ClientRequestsView.tsx
```

---

## 5. Panduan Instalasi & Menjalankan Sistem (Yang Harus Dilakukan)

### Prasyarat
- **Node.js v22.0.0+** (wajib karena `server.js` memakai modul bawaan `node:sqlite`).
- Browser modern (Chrome / Edge / Firefox) yang mendukung Web Crypto API.

### Langkah Menjalankan Aplikasi (2 Terminal)
1. **Install dependensi (cukup sekali di awal):**
   ```powershell
   npm install
   ```
2. **Terminal 1 — Jalankan Backend SQLite Express (Port `5000`):**
   ```powershell
   npm run server
   ```
   Pastikan muncul pesan:  
   `[ArsipNusa Vault] SQLite Express Server berjalan di http://localhost:5000`
3. **Terminal 2 — Jalankan Frontend Vite (Port `5173`):**
   ```powershell
   npm run dev
   ```
4. Buka browser di `http://localhost:5173`.

> **Penting:** Selalu nyalakan `npm run server` sebelum mendemokan aplikasi agar verifikasi KYC, registrasi akun, tanda tangan ECDSA, dan penyimpanan akta tersinkron ke `vault.sqlite` (bukan mode fallback lokal).

### Verifikasi Build & Kode
```powershell
node --check server.js
npx tsc -b --noEmit
npx oxlint src/
npm run build
```

---

## 6. Cara Reset Database (`vault.sqlite`) ke Kondisi Bersih

Jika database terisi data uji coba yang ingin dibersihkan sebelum demo/presentasi:

### Opsi A — Reset Total (Mengembalikan Semua Tabel ke Seed Bawaan)
1. Hentikan `npm run server` (`Ctrl + C`) agar file tidak terkunci Windows.
2. Hapus `vault.sqlite`:
   ```powershell
   Remove-Item .\vault.sqlite* -Force
   ```
3. Jalankan ulang backend untuk membuat `vault.sqlite` baru beserta 5 dokumen terenkripsi asli (`AESGCM1` / `CHACHA1`) dan 5 akun demo:
   ```powershell
   npm run server
   ```
4. Bersihkan cache browser melalui DevTools (`F12`) $\rightarrow$ **Console**:
   ```js
   localStorage.clear(); sessionStorage.clear(); location.reload();
   ```

### Opsi B — Menghapus Dokumen Tertentu Tanpa Menghapus User Terdaftar
Hentikan `npm run server`, lalu jalankan di PowerShell (ganti ID sesuai kebutuhan):
```powershell
node --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; new DatabaseSync("./vault.sqlite").prepare(`DELETE FROM documents WHERE id IN (?, ?)`).run("ID-1", "ID-2");'
```

---

## 7. Akun Demo & Kunci Default Vault

### Kredensial Bawaan
| Peran | Username | Kata Sandi | Nama Tampilan | Keterangan Demo |
|---|---|---|---|---|
| **Super Admin** | `superadmin` | `superadmin123` | Ahmad Fauzi (Sysadmin) | Manajemen user, status DB & token dongle |
| **Notaris (Admin)** | `admin` | `admin123` | Natasha S.H., M.Kn. | Akses penuh brankas, pengesahan akta & KYC |
| **Klien 1** | `rina` | `user123` | Rina Hartono | Memiliki `WST-2025-0087` (menunggu TTD) & `SHM-02041/JKS` |
| **Klien 2** | `budi` | `user123` | Budi Santoso | Memiliki `SHM-01428/JKT` (Terverifikasi) |
| **Klien 3** | `hendra` | `user123` | Dr. Hendra Wijaya, Sp.A. | Status awal `Menunggu KYC` (`kyc_verified = 0`) |

### Kunci Enkripsi Default Vault
- **Kunci Modern (AES-256-GCM / ChaCha20-Poly1305):** `AES-NOTARIAL-SECRET-2025`
- **Kunci Klasik (Vigenère Layer 1 pada Super Enkripsi):** `NOTARISNUSA`

---

## 8. Rekomendasi Alur Demo Presentasi (Step-by-Step)

1. **Verifikasi KYC Klien Baru (Notaris):** Login sebagai `admin` $\rightarrow$ buka menu **Klien** $\rightarrow$ terlihat `Dr. Hendra Wijaya, Sp.A.` berstatus `Menunggu KYC` $\rightarrow$ klik **Verifikasi KYC Sekarang**.
2. **Dekripsi Nyata & Uji Anti-Tamper (Notaris):** Buka **Aset & Sertifikat** atau **Wasiat & Akta** $\rightarrow$ klik **Buka Detail** pada salah satu dokumen bawaan $\rightarrow$ klik **Dekripsi Ciphertext Sekarang** dengan kunci `AES-NOTARIAL-SECRET-2025` (coba ubah 1 huruf kunci untuk membuktikan tag autentikasi AEAD langsung menolak).
3. **Super Enkripsi (Vigenère + AES-256-GCM):** Buka menu **Super Enkripsi** $\rightarrow$ ubah plaintext/kunci $\rightarrow$ isi metadata vault $\rightarrow$ klik **Simpan Super Ciphertext ke SQLite Vault** $\rightarrow$ uji dekripsi baik di tab Dekripsi maupun dari tabel **Wasiat & Akta**.
4. **Dual-Signature ECDSA P-256 (Klien $\leftrightarrow$ Notaris):**
   - Login sebagai `rina` $\rightarrow$ buka **Dokumen Saya** $\rightarrow$ klik **Tandatangani** pada `WST-2025-0087` (`Menunggu tanda tangan`) $\rightarrow$ status naik ke `Dalam peninjauan`.
   - Login kembali sebagai `admin` $\rightarrow$ klik **Sahkan & Segel** pada `WST-2025-0087` $\rightarrow$ status menjadi `Terverifikasi` $\rightarrow$ buka detailnya dan klik **Verifikasi TTD ECDSA P-256**.
5. **Enkripsi & Pemulihan File `.enc`:** Buka **Berkas Terenkripsi** $\rightarrow$ unggah file atau pakai contoh $\rightarrow$ unduh `.enc` $\rightarrow$ pindah ke tab **Dekripsi .enc** untuk memulihkan file asli dan mengecek SHA-256.
6. **Simulasi Serangan Domino Blockchain:** Buka **Chain of Title** / **Riwayat Kepemilikan** $\rightarrow$ pilih & edit payload pada **Block #5** $\rightarrow$ sistem otomatis menandai **Block #5 sampai blok terakhir** merah (*efek domino rantai hash SHA-256*), lalu klik reset/pulihkan rantai.
7. **Steganografi LSB:** Buka **Steganografi** $\rightarrow$ sisipkan pesan ke gambar sertifikat $\rightarrow$ unduh PNG $\rightarrow$ uji ekstraksi pesan kembali.

---

## 9. Ringkasan Endpoint REST API (`server.js`)

| Metode & Endpoint | Fungsi |
|---|---|
| `GET /api/health` | Status server & koneksi SQLite |
| `POST /api/users/login` / `POST /api/users/register` | Login (`scrypt` verified + auto-upgrade) & pendaftaran klien |
| `GET / POST /api/users`, `PUT / DELETE /api/users/:id` | Manajemen pengguna oleh Admin/SuperAdmin |
| `PUT /api/users/:id/kyc` | Verifikasi KYC klien (`kyc_verified = 1`) |
| `GET /api/system/stats` | Statistik ringkasan database untuk SuperAdmin |
| `GET / POST /api/documents` | Ambil daftar dokumen terenkripsi / simpan dokumen baru |
| `POST /api/documents/:id/sign` | Pembubuhan tanda tangan ECDSA klien/notaris (`Dual-Signature`) |
| `GET / POST /api/requests`, `PUT /api/requests/:id` | Pengajuan & pembaruan status permohonan layanan klien |
| `POST /api/requests/:id/sign` | Penerbitan draf / pengesahan akta dari permohonan klien |
| `GET / POST /api/audit-logs` | Ambil & catat riwayat audit kriptografis |
| `GET / POST /api/tokens`, `POST /api/tokens/revoke` | Kelola & cabut sertifikat USB Dongle `.key` |

---

## 10. Kepatuhan Regulasi
Dirancang mengacu pada prinsip UU No. 2 Tahun 2014 tentang Jabatan Notaris (UUJN), UU ITE, kontrol kriptografi ISO/IEC 27001, serta konsep token perangkat keras FIPS 140-2.
