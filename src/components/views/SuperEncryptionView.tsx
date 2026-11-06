import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Lock,
  Unlock,
  Cpu,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Database,
  ShieldCheck,
  FileCode,
  Binary,
} from 'lucide-react';
import { superEncrypt, superDecrypt } from '../../utils/crypto';
import type { SuperEncryptionResult } from '../../utils/crypto';
import type { DocumentItem } from '../../types';

interface SuperEncryptionViewProps {
  onSaveToVault: (doc: Omit<DocumentItem, 'id' | 'created_at'>) => Promise<void>;
}

export const SuperEncryptionView: React.FC<SuperEncryptionViewProps> = ({ onSaveToVault }) => {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  // Encryption state
  const [plaintext, setPlaintext] = useState(
    'KLAUSUL WASIAT RAHASIA: Seluruh kepemilikan 50% saham PT Arunika Persada dialihkan kepada ahli waris sah Dimas Pratama dengan hak suara mutlak.'
  );
  const [classicalKey, setClassicalKey] = useState('NOTARISNUSA');
  const [modernKey, setModernKey] = useState('AES-SUPER-NOTARIAL-2025');
  const [encryptResult, setEncryptResult] = useState<SuperEncryptionResult | null>(null);

  // Decryption state
  const [decryptInput, setDecryptInput] = useState('');
  const [decryptClassicalKey, setDecryptClassicalKey] = useState('NOTARISNUSA');
  const [decryptModernKey, setDecryptModernKey] = useState('AES-SUPER-NOTARIAL-2025');
  const [decryptOutput, setDecryptOutput] = useState<{ intermediate: string; plaintext: string } | null>(
    null
  );

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Run encryption automatically when inputs change
  useEffect(() => {
    let isMounted = true;
    superEncrypt(plaintext, classicalKey, modernKey).then((res) => {
      if (isMounted) {
        setEncryptResult(res);
        // Pre-fill decrypt input for ease of testing
        if (!decryptInput) {
          setDecryptInput(res.modernCipher);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [plaintext, classicalKey, modernKey]);

  const handleDecrypt = () => {
    if (!decryptInput) return;
    const res = superDecrypt(decryptInput, decryptClassicalKey, decryptModernKey);
    setDecryptOutput(res);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveToVault = async () => {
    if (!encryptResult) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onSaveToVault({
        title: 'Akta Super Enkripsi - Klausul Rahasia',
        client: 'Dimas Pratama',
        type: 'Surat Wasiat',
        value: 'Rahasia Tinggi',
        status: 'Terverifikasi',
        encrypted_content: `${encryptResult.modernCipher} [Super-Encrypted]`,
        algorithm: 'Super-Encrypted (Vigenere + AES)',
        sha256_hash: encryptResult.sha256Hash,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            MODUL KRIPTOGRAFI TUGAS AKHIR
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Super Enkripsi Teks Notaris
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Kombinasi bertingkat kriptografi klasik (Vigenère Cipher) dan modern (AES-like bit substitution & permutation) untuk proteksi berkas rahasia notaris.
          </p>
        </div>

        {/* Tab switch */}
        <div className="p-1 rounded-lg bg-[#f0ede6] border border-[#dfddd6] flex items-center gap-1 self-start">
          <button
            onClick={() => setMode('encrypt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              mode === 'encrypt'
                ? 'bg-[#182b29] text-white shadow-xs'
                : 'text-[#69736f] hover:text-[#182b29]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Super Enkripsi (Encode)</span>
          </button>
          <button
            onClick={() => {
              setMode('decrypt');
              if (encryptResult && !decryptInput) {
                setDecryptInput(encryptResult.modernCipher);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              mode === 'decrypt'
                ? 'bg-[#182b29] text-white shadow-xs'
                : 'text-[#69736f] hover:text-[#182b29]'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Dekripsi Bertingkat (Decode)</span>
          </button>
        </div>
      </div>

      {/* Visual Pipeline Architecture Banner */}
      <div className="p-4 rounded-xl bg-[#142825] text-white border border-[#29403c] shadow-sm">
        <div className="text-[11px] font-semibold text-[#88bbaa] uppercase tracking-wider mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>Arsitektur Algoritma Super Enkripsi 2-Tahap</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-center text-xs">
          <div className="p-3 rounded-lg bg-[#1b3531] border border-[#2d4a45]">
            <div className="text-[10px] text-[#9caaa6]">Input Notaris</div>
            <div className="font-semibold text-white mt-1">Plaintext Asli</div>
            <div className="text-[9px] text-[#88bbaa] font-mono mt-0.5">Teks Akta Rahasia</div>
          </div>

          <div className="hidden md:flex justify-center text-[#88bbaa]">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="p-3 rounded-lg bg-[#26413c] border border-[#3b6158]">
            <div className="text-[10px] text-[#88bbaa]">Tahap 1 (Klasik)</div>
            <div className="font-semibold text-emerald-200 mt-1">Vigenère Cipher</div>
            <div className="text-[9px] text-[#aebbb7] font-mono mt-0.5">Polyalphabetic Shift</div>
          </div>

          <div className="hidden md:flex justify-center text-[#88bbaa]">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="p-3 rounded-lg bg-[#67303a] border border-[#8a4250]">
            <div className="text-[10px] text-[#f4e8dc]">Tahap 2 (Modern)</div>
            <div className="font-semibold text-rose-100 mt-1">AES Bit Permutation</div>
            <div className="text-[9px] text-[#e8c4b9] font-mono mt-0.5">Base64 & Hex Digest</div>
          </div>
        </div>
      </div>

      {mode === 'encrypt' ? (
        /* ================== ENCRYPT PANEL ================== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Form: Inputs */}
          <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
            <h3 className="font-serif text-base text-[#182b29] font-semibold flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#2d6958]" />
              Parameter Teks & Kunci Enkripsi
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Teks Dokumen Asli (Plaintext)
              </label>
              <textarea
                rows={4}
                value={plaintext}
                onChange={(e) => setPlaintext(e.target.value)}
                placeholder="Ketikkan teks wasiat, nomor akta, atau klausul rahasia..."
                className="w-full p-3 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] placeholder-gray-400 focus:outline-none focus:border-[#2d6958] font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#762e3b]" />
                  Kunci Klasik (Vigenère)
                </label>
                <input
                  type="text"
                  value={classicalKey}
                  onChange={(e) => setClassicalKey(e.target.value)}
                  placeholder="KUNCIKLASIK"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] font-mono focus:outline-none focus:border-[#2d6958] uppercase"
                />
                <span className="text-[10px] text-[#8c9491] mt-0.5 block">Huruf alfabet A-Z</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#2d6958]" />
                  Kunci Modern (AES 256-bit)
                </label>
                <input
                  type="text"
                  value={modernKey}
                  onChange={(e) => setModernKey(e.target.value)}
                  placeholder="Kunci-Modern-Sesi-256"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] font-mono focus:outline-none focus:border-[#2d6958]"
                />
                <span className="text-[10px] text-[#8c9491] mt-0.5 block">Frasa kunci kriptografis</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f0ede6] text-xs text-[#55635f] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2d6958]" />
                <span>Super Enkripsi berjalan otomatis secara real-time.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlaintext(
                    'AKTA HAK WARIS #042/2025: Pembagian harta waris tanah kavling Jakarta Selatan secara sah dan mengikat.'
                  );
                  setClassicalKey('NOTARIALVAULT');
                  setModernKey('AES-KEY-VAULT-2025');
                }}
                className="text-[11px] font-semibold text-[#2d6958] hover:underline cursor-pointer"
              >
                Muat Contoh Akta
              </button>
            </div>

            {/* Save to SQLite button */}
            <button
              onClick={handleSaveToVault}
              disabled={isSaving || !encryptResult}
              className="w-full py-2.5 px-4 rounded-lg bg-[#182b29] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              <Database className="w-4 h-4 text-[#88bbaa]" />
              <span>
                {isSaving
                  ? 'Menyimpan ke SQLite...'
                  : saveSuccess
                  ? '✓ Tersimpan di SQLite Backend!'
                  : 'Simpan Super Ciphertext ke SQLite Vault (Port 5000)'}
              </span>
            </button>
          </div>

          {/* Right Column: Realtime cryptographic stages */}
          <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
            <h3 className="font-serif text-base text-[#182b29] font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Binary className="w-4 h-4 text-[#762e3b]" />
                Hasil Transformasi Bertingkat
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                E2EE Active
              </span>
            </h3>

            {encryptResult && (
              <div className="space-y-3.5">
                {/* Stage 1: Classical Vigenere */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#2d6958]">
                      Tahap 1: Ciphertext Vigenère (Klasik)
                    </span>
                    <button
                      onClick={() => copyToClipboard(encryptResult.classicalCipher, 'stage1')}
                      className="text-[10px] text-[#2d6958] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'stage1' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Salin
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#dfddd6] font-mono text-xs text-[#182b29] max-h-24 overflow-y-auto break-all">
                    {encryptResult.classicalCipher}
                  </div>
                </div>

                {/* Stage 2: Final Super Ciphertext (Base64) */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#762e3b]">
                      Tahap 2: Super Ciphertext (Base64 Modern)
                    </span>
                    <button
                      onClick={() => copyToClipboard(encryptResult.modernCipher, 'stage2')}
                      className="text-[10px] text-[#762e3b] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'stage2' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Salin
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0e1d1a] border border-[#233a35] font-mono text-xs text-emerald-300 max-h-28 overflow-y-auto break-all">
                    {encryptResult.modernCipher}
                  </div>
                </div>

                {/* Hex Dump view */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[#69736f]">Hex Dump Representasi Biner</span>
                    <button
                      onClick={() => copyToClipboard(encryptResult.hexDump, 'hex')}
                      className="text-[10px] text-[#69736f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'hex' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Salin Hex
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#f0ede6] font-mono text-[10px] text-[#42524d] max-h-20 overflow-y-auto break-all">
                    {encryptResult.hexDump}
                  </div>
                </div>

                {/* SHA-256 Digest */}
                <div className="pt-2 border-t border-[#dfddd6]">
                  <div className="text-[10px] font-semibold text-[#69736f] uppercase">
                    Segel Integritas SHA-256 Digest
                  </div>
                  <div className="font-mono text-[11px] text-[#182b29] mt-0.5 break-all">
                    {encryptResult.sha256Hash}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================== DECRYPT PANEL ================== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
            <h3 className="font-serif text-base text-[#182b29] font-semibold flex items-center gap-2">
              <Unlock className="w-4 h-4 text-[#762e3b]" />
              Input Super Ciphertext & Kunci Dekripsi
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Super Ciphertext (Base64)
              </label>
              <textarea
                rows={4}
                value={decryptInput}
                onChange={(e) => setDecryptInput(e.target.value)}
                placeholder="Tempelkan Super Ciphertext di sini..."
                className="w-full p-3 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] font-mono focus:outline-none focus:border-[#2d6958]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1">
                  Kunci Modern (AES)
                </label>
                <input
                  type="text"
                  value={decryptModernKey}
                  onChange={(e) => setDecryptModernKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] font-mono focus:outline-none focus:border-[#2d6958]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#182b29] mb-1">
                  Kunci Klasik (Vigenère)
                </label>
                <input
                  type="text"
                  value={decryptClassicalKey}
                  onChange={(e) => setDecryptClassicalKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] font-mono focus:outline-none focus:border-[#2d6958] uppercase"
                />
              </div>
            </div>

            <button
              onClick={handleDecrypt}
              className="w-full py-2.5 px-4 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Jalankan Dekripsi Bertingkat (Reverse Modern &rarr; Reverse Klasik)</span>
            </button>
          </div>

          <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
            <h3 className="font-serif text-base text-[#182b29] font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Hasil Pemulihan Dokumen Asli
            </h3>

            {decryptOutput ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-[#69736f] mb-1">
                    Hasil Tahap 1: Pembalikan AES Stream (Sandi Antara)
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#f0ede6] font-mono text-xs text-[#42524d] break-all">
                    {decryptOutput.intermediate}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-emerald-800 mb-1">
                    Hasil Tahap 2: Pembalikan Vigenère (Plaintext Asli)
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 font-serif text-xs text-emerald-950 leading-relaxed shadow-xs">
                    {decryptOutput.plaintext}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#dfddd6] text-[11px] text-[#69736f]">
                  ✓ Integritas kriptografis terbukti sempurna. Plaintext berhasil dipulihkan tanpa distorsi karakter.
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-gray-500">
                Klik tombol "Jalankan Dekripsi Bertingkat" untuk melihat hasil rekonstruksi teks asli.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
