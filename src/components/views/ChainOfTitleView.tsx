import React, { useState, useEffect } from 'react';
import {
  Link2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Flame,
} from 'lucide-react';
import type { BlockItem } from '../../types';
import { calculateBlockHash, verifyChainIntegrity, sha256 } from '../../utils/crypto';

export const ChainOfTitleView: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    brokenIndex?: number;
    reason?: string;
  } | null>(null);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isTampered, setIsTampered] = useState(false);

  // Initialize initial blockchain
  useEffect(() => {
    const initChain = async () => {
      const b0Prev = '0000000000000000000000000000000000000000000000000000000000000000';
      const b0Time = '2025-06-20T08:00:00.000Z';
      const b0DataHash = await sha256('GENESIS_BLOCK_ARSIPNUSA_NOTARIAL_VAULT');
      const b0Hash = await calculateBlockHash(0, b0Prev, b0Time, b0DataHash, 100);

      const b1Prev = b0Hash;
      const b1Time = '2025-06-21T09:30:00.000Z';
      const b1DataHash = await sha256('SHM-01428/JKT_Tanah Kavling Menteng_Budi Santoso');
      const b1Hash = await calculateBlockHash(1, b1Prev, b1Time, b1DataHash, 245);

      const b2Prev = b1Hash;
      const b2Time = '2025-06-22T14:15:00.000Z';
      const b2DataHash = await sha256('WST-2025-0087_Wasiat Keluarga Hartono_Rina Hartono');
      const b2Hash = await calculateBlockHash(2, b2Prev, b2Time, b2DataHash, 389);

      const b3Prev = b2Hash;
      const b3Time = '2025-06-23T11:45:00.000Z';
      const b3DataHash = await sha256('SK-ARU/104/25_Kepemilikan Saham PT Arunika_Dimas Pratama');
      const b3Hash = await calculateBlockHash(3, b3Prev, b3Time, b3DataHash, 512);

      const initialChain: BlockItem[] = [
        {
          index: 0,
          timestamp: b0Time,
          previousHash: b0Prev,
          hash: b0Hash,
          dataHash: b0DataHash,
          data: {
            documentId: 'GENESIS-000',
            title: 'Genesis Block - Notarial Vault Ledger Inception',
            client: 'Kantor Notaris Natasha S.H., M.Kn.',
            type: 'Sistem Ledger',
          },
          nonce: 100,
        },
        {
          index: 1,
          timestamp: b1Time,
          previousHash: b1Prev,
          hash: b1Hash,
          dataHash: b1DataHash,
          data: {
            documentId: 'SHM-01428/JKT',
            title: 'Sertifikat Tanah Kavling Menteng',
            client: 'Budi Santoso',
            type: 'Sertifikat Tanah',
          },
          nonce: 245,
        },
        {
          index: 2,
          timestamp: b2Time,
          previousHash: b2Prev,
          hash: b2Hash,
          dataHash: b2DataHash,
          data: {
            documentId: 'WST-2025-0087',
            title: 'Surat Wasiat Keluarga Hartono',
            client: 'Rina Hartono',
            type: 'Surat Wasiat',
          },
          nonce: 389,
        },
        {
          index: 3,
          timestamp: b3Time,
          previousHash: b3Prev,
          hash: b3Hash,
          dataHash: b3DataHash,
          data: {
            documentId: 'SK-ARU/104/25',
            title: 'Akta Saham PT Arunika Persada',
            client: 'Dimas Pratama',
            type: 'Kepemilikan Saham',
          },
          nonce: 512,
        },
      ];

      setBlocks(initialChain);
    };

    initChain();
  }, []);

  const handleValidateIntegrity = async () => {
    setIsValidating(true);
    setTimeout(async () => {
      const res = await verifyChainIntegrity(blocks);
      setValidationResult(res);
      setIsValidating(false);
    }, 600);
  };

  const handleSimulateTamper = async () => {
    if (blocks.length < 2) return;
    setIsTampered(true);

    // Tamper with Block #1's payload without recalculating hashes
    const tampered = blocks.map((b, idx) => {
      if (idx === 1) {
        return {
          ...b,
          data: {
            ...b.data,
            title: 'Sertifikat Palsu (Data Diubah Secara Ilegal)',
            client: 'Penyerang Tidak Dikenal',
          },
          dataHash: '9999999999999999999999999999999999999999999999999999999999999999',
        };
      }
      return b;
    });

    setBlocks(tampered);

    // Automatically trigger validation to show failure
    const res = await verifyChainIntegrity(tampered);
    setValidationResult(res);
  };

  const handleRestoreChain = async () => {
    setIsTampered(false);

    // Recalculate authentic Block #1
    const b0Hash = blocks[0].hash;
    const b1Time = '2025-06-21T09:30:00.000Z';
    const b1DataHash = await sha256('SHM-01428/JKT_Tanah Kavling Menteng_Budi Santoso');
    const b1Hash = await calculateBlockHash(1, b0Hash, b1Time, b1DataHash, 245);

    const restored = blocks.map((b, idx) => {
      if (idx === 1) {
        return {
          ...b,
          timestamp: b1Time,
          previousHash: b0Hash,
          hash: b1Hash,
          dataHash: b1DataHash,
          data: {
            documentId: 'SHM-01428/JKT',
            title: 'Sertifikat Tanah Kavling Menteng',
            client: 'Budi Santoso',
            type: 'Sertifikat Tanah',
          },
          nonce: 245,
        };
      }
      return b;
    });

    setBlocks(restored);
    const res = await verifyChainIntegrity(restored);
    setValidationResult(res);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            BUKU BESAR BLOCKCHAIN NOTARIAL
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Chain of Title (Jejak Kepemilikan Anti-Tamper)
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Setiap pendaftaran akta dirantai secara kriptografis menggunakan algoritma SHA-256. Perubahan 1 bit data akan merusak rantai hash seluruh blok berikutnya.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            onClick={handleValidateIntegrity}
            disabled={isValidating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isValidating ? 'Memeriksa Hash...' : 'Audit Validasi Rantai'}</span>
          </button>

          {!isTampered ? (
            <button
              onClick={handleSimulateTamper}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-900/10 hover:bg-rose-900/20 text-rose-800 border border-rose-300 text-xs font-semibold transition cursor-pointer"
              title="Demonstrasi manipulasi data untuk presentasi proyek akhir"
            >
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Simulasi Serangan / Tamper</span>
            </button>
          ) : (
            <button
              onClick={handleRestoreChain}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-emerald-700" />
              <span>Pulihkan Integritas Rantai</span>
            </button>
          )}
        </div>
      </div>

      {/* Validation Status Banner */}
      {validationResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3.5 animate-in fade-in ${
            validationResult.isValid
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          {validationResult.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <strong className="text-sm font-semibold block">
              {validationResult.isValid
                ? 'Integritas Seluruh Blok Rantai Sah (100% Anti-Tamper Valid)'
                : 'Peringatan Keamanan Kriptografis: Terdeteksi Manipulasi Data!'}
            </strong>
            <p className="text-xs mt-0.5">
              {validationResult.isValid
                ? 'Semua tautan hash induk (Previous Hash) dan kalkulasi digest SHA-256 cocok sempurna tanpa distorsi.'
                : validationResult.reason}
            </p>
          </div>
        </div>
      )}

      {/* Blockchain Blocks Flow */}
      <div className="space-y-4">
        {blocks.map((block, idx) => {
          const isGenesis = block.index === 0;
          const isThisBlockTampered = isTampered && block.index === 1;

          return (
            <div key={block.index} className="relative">
              {/* Connector line between blocks */}
              {idx < blocks.length - 1 && (
                <div className="absolute left-6 top-full h-4 w-0.5 bg-[#2d6958]/30 -translate-x-1/2 z-0" />
              )}

              <div
                className={`p-5 rounded-xl border transition shadow-xs relative z-10 ${
                  isThisBlockTampered
                    ? 'bg-rose-50/90 border-rose-400'
                    : isGenesis
                    ? 'bg-[#142825] text-white border-[#29403c]'
                    : 'bg-[#fbfaf7] border-[#dfddd6] text-[#182b29]'
                }`}
              >
                {/* Block header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/10">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                        isGenesis
                          ? 'bg-[#26413c] text-emerald-300'
                          : isThisBlockTampered
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-[#f0ede6] text-[#182b29]'
                      }`}
                    >
                      BLOCK #{block.index.toString().padStart(3, '0')}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        isGenesis ? 'text-white' : 'text-[#182b29]'
                      }`}
                    >
                      {block.data.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span
                      className={`flex items-center gap-1 font-mono ${
                        isGenesis ? 'text-[#88bbaa]' : 'text-[#69736f]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(block.timestamp).toLocaleString('id-ID')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        isGenesis
                          ? 'bg-[#1b3531] text-[#9caaa6]'
                          : 'bg-[#eee] text-[#69736f]'
                      }`}
                    >
                      Nonce: {block.nonce}
                    </span>
                  </div>
                </div>

                {/* Block Body: Payload & Hashes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                  {/* Left: Payload */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-[#8c9491]">
                      Payload Akta / Transaksi Notarial
                    </div>
                    <div
                      className={`p-3 rounded-lg border font-mono text-[11px] space-y-1 ${
                        isGenesis
                          ? 'bg-[#0e1d1a] border-[#233a35] text-[#dce8e4]'
                          : 'bg-white border-[#dfddd6] text-[#182b29]'
                      }`}
                    >
                      <div>
                        <span className="text-[#8c9491]">Nomor Akta:</span> {block.data.documentId}
                      </div>
                      <div>
                        <span className="text-[#8c9491]">Klien Terdaftar:</span> {block.data.client}
                      </div>
                      <div>
                        <span className="text-[#8c9491]">Klasifikasi:</span> {block.data.type}
                      </div>
                    </div>
                  </div>

                  {/* Right: Cryptographic Hashes */}
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#8c9491] flex items-center justify-between">
                        <span>Previous Hash (Tautan Blok Sebelumnya)</span>
                        <Link2 className="w-3 h-3 text-[#2d6958]" />
                      </div>
                      <div
                        onClick={() => copyToClipboard(block.previousHash)}
                        className={`p-2 rounded font-mono text-[10px] truncate cursor-pointer mt-0.5 ${
                          isGenesis
                            ? 'bg-[#0e1d1a] text-[#88bbaa]'
                            : 'bg-[#f0ede6] text-[#42524d]'
                        }`}
                        title="Klik untuk menyalin"
                      >
                        {block.previousHash}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#8c9491] flex items-center justify-between">
                        <span>Current Block Hash (SHA-256)</span>
                        <button
                          onClick={() => copyToClipboard(block.hash)}
                          className="text-[10px] text-[#2d6958] hover:underline flex items-center gap-1"
                        >
                          {copiedHash === block.hash ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Salin
                        </button>
                      </div>
                      <div
                        className={`p-2 rounded font-mono text-[10px] font-semibold break-all mt-0.5 border ${
                          isThisBlockTampered
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : isGenesis
                            ? 'bg-[#1b3531] text-emerald-300 border-[#2d4a45]'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {block.hash}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
