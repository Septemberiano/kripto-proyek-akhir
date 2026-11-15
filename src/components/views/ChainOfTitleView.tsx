import React, { useState, useEffect, useCallback } from 'react';
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
  Edit3,
  X,
} from 'lucide-react';
import type { BlockItem, DocumentItem } from '../../types';
import {
  calculateBlockHash,
  mineBlockWithPoW,
  verifyChainIntegrity,
  sha256,
  POW_PREFIX,
  type ChainValidationResult,
} from '../../utils/crypto';

interface ChainOfTitleViewProps {
  documents?: DocumentItem[];
  isClient?: boolean;
}

async function buildDynamicChain(documents: DocumentItem[]): Promise<BlockItem[]> {
  const b0Prev = '0000000000000000000000000000000000000000000000000000000000000000';
  const b0Time = '2025-06-20T08:00:00.000Z';
  const b0DataHash = await sha256('GENESIS_BLOCK_ARSIPNUSA_NOTARIAL_VAULT');
  const b0Pow = await mineBlockWithPoW(0, b0Prev, b0Time, b0DataHash, POW_PREFIX);

  const chain: BlockItem[] = [
    {
      index: 0,
      timestamp: b0Time,
      previousHash: b0Prev,
      hash: b0Pow.hash,
      dataHash: b0DataHash,
      data: {
        documentId: 'GENESIS-000',
        title: 'Genesis Block - Notarial Vault Ledger Inception',
        client: 'Kantor Notaris Natasha S.H., M.Kn.',
        type: 'Sistem Ledger',
      },
      nonce: b0Pow.nonce,
    },
  ];

  // Sort chronologically (oldest first so new documents append at the end of the chain)
  const orderedDocs = [...documents].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (let i = 0; i < orderedDocs.length; i++) {
    const doc = orderedDocs[i];
    const index = i + 1;
    const prevBlock = chain[chain.length - 1];
    const timestamp = doc.created_at || new Date().toISOString();
    const dataHash = await sha256(
      `${doc.id}_${doc.title}_${doc.client}_${doc.type}_${doc.sha256_hash}`
    );
    const pow = await mineBlockWithPoW(index, prevBlock.hash, timestamp, dataHash, POW_PREFIX);

    chain.push({
      index,
      timestamp,
      previousHash: prevBlock.hash,
      hash: pow.hash,
      dataHash,
      data: {
        documentId: doc.id,
        title: doc.title,
        client: doc.client,
        type: doc.type,
      },
      nonce: pow.nonce,
    });
  }

  return chain;
}

export const ChainOfTitleView: React.FC<ChainOfTitleViewProps> = ({
  documents = [],
  isClient = false,
}) => {
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ChainValidationResult | null>(null);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [tamperedIndices, setTamperedIndices] = useState<number[]>([]);

  // Per-block Tamper Simulator Modal state
  const [editingBlock, setEditingBlock] = useState<BlockItem | null>(null);
  const [tamperDocId, setTamperDocId] = useState('');
  const [tamperTitle, setTamperTitle] = useState('');
  const [tamperClient, setTamperClient] = useState('');
  const [tamperType, setTamperType] = useState('');
  const [recalculateLocalHash, setRecalculateLocalHash] = useState(false);

  const rebuildAuthenticChain = useCallback(async () => {
    const chain = await buildDynamicChain(documents);
    setBlocks(chain);
    setTamperedIndices([]);
    return chain;
  }, [documents]);

  useEffect(() => {
    let active = true;
    buildDynamicChain(documents).then((chain) => {
      if (active) {
        setBlocks(chain);
        setTamperedIndices([]);
        setValidationResult(null);
      }
    });
    return () => {
      active = false;
    };
  }, [documents]);

  const handleValidateIntegrity = async () => {
    setIsValidating(true);
    setTimeout(async () => {
      const res = await verifyChainIntegrity(blocks, tamperedIndices);
      setValidationResult(res);
      setIsValidating(false);
    }, 350);
  };

  // Quick tamper on Block #1 (or first document block)
  const handleQuickTamper = async () => {
    if (blocks.length < 2) return;
    const targetIdx = 1;
    const target = blocks[targetIdx];
    const modifiedData = {
      ...target.data,
      title: `${target.data.title} [DIUBAH ILEGAL]`,
      client: 'Penyerang Tidak Dikenal',
    };
    const newDataHash = await sha256(
      `${modifiedData.documentId}_${modifiedData.title}_${modifiedData.client}_${modifiedData.type}_TAMPERED`
    );

    const updated = blocks.map((b) =>
      b.index === targetIdx
        ? {
            ...b,
            data: modifiedData,
            dataHash: newDataHash,
          }
        : b
    );

    const nextTampered = tamperedIndices.includes(targetIdx)
      ? tamperedIndices
      : [...tamperedIndices, targetIdx];
    setBlocks(updated);
    setTamperedIndices(nextTampered);
    const res = await verifyChainIntegrity(updated, nextTampered);
    setValidationResult(res);
  };

  const openTamperModal = (block: BlockItem) => {
    setEditingBlock(block);
    setTamperDocId(block.data.documentId);
    setTamperTitle(block.data.title);
    setTamperClient(block.data.client);
    setTamperType(block.data.type);
    setRecalculateLocalHash(false);
  };

  const handleApplyPayloadTamper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;

    const targetIdx = editingBlock.index;
    const modifiedData = {
      documentId: tamperDocId.trim() || editingBlock.data.documentId,
      title: tamperTitle.trim() || editingBlock.data.title,
      client: tamperClient.trim() || editingBlock.data.client,
      type: tamperType.trim() || editingBlock.data.type,
    };

    const newDataHash = await sha256(
      `${modifiedData.documentId}_${modifiedData.title}_${modifiedData.client}_${modifiedData.type}_MODIFIED`
    );

    let newHash = editingBlock.hash;
    if (recalculateLocalHash && targetIdx < blocks.length - 1) {
      newHash = await calculateBlockHash(
        editingBlock.index,
        editingBlock.previousHash,
        editingBlock.timestamp,
        newDataHash,
        editingBlock.nonce
      );
    }

    const updated = blocks.map((b) =>
      b.index === targetIdx
        ? {
            ...b,
            data: modifiedData,
            dataHash: newDataHash,
            hash: newHash,
          }
        : b
    );

    const nextTampered = tamperedIndices.includes(targetIdx)
      ? tamperedIndices
      : [...tamperedIndices, targetIdx];
    setBlocks(updated);
    setTamperedIndices(nextTampered);
    setEditingBlock(null);

    const res = await verifyChainIntegrity(updated, nextTampered);
    setValidationResult(res);
  };

  const handleRestoreChain = async () => {
    const chain = await rebuildAuthenticChain();
    const res = await verifyChainIntegrity(chain, []);
    setValidationResult(res);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const isTampered = tamperedIndices.length > 0;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            {isClient ? 'RIWAYAT KEPEMILIKAN PRIBADI (BLOCKCHAIN)' : 'BUKU BESAR BLOCKCHAIN NOTARIAL'}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            {isClient ? 'Riwayat Kepemilikan Anti-Tamper' : 'Chain of Title (Jejak Kepemilikan Anti-Tamper)'}
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Terbentuk dinamis dari {documents.length} dokumen SQLite ({blocks.length} blok total termasuk Genesis). Perubahan 1 bit payload pada blok mana pun akan memutus verifikasi SHA-256.
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

          {!isTampered && blocks.length > 1 && (
            <button
              onClick={handleQuickTamper}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-900/10 hover:bg-rose-900/20 text-rose-800 border border-rose-300 text-xs font-semibold transition cursor-pointer"
              title="Ubah paksa payload Block #001 untuk demo serangan cepat"
            >
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Simulasi Serangan Cepat</span>
            </button>
          )}

          {isTampered && (
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
                : `Peringatan Keamanan Kriptografis: Rantai Putus di Block #${validationResult.brokenIndex
                    ?.toString()
                    .padStart(3, '0')}!`}
            </strong>
            <p className="text-xs mt-0.5">
              {validationResult.isValid
                ? `Semua ${blocks.length} blok memiliki tautan Previous Hash dan kalkulasi digest SHA-256 yang cocok sempurna.`
                : validationResult.reason}
            </p>
          </div>
        </div>
      )}

      {/* Blockchain Blocks Flow */}
      <div className="space-y-4">
        {blocks.map((block, idx) => {
          const isGenesis = block.index === 0;
          const isEditedBlock = tamperedIndices.includes(block.index);
          const isInvalidBlock = Boolean(
            validationResult &&
              !validationResult.isValid &&
              validationResult.invalidIndices.includes(block.index)
          );
          const isBrokenPoint = Boolean(
            validationResult &&
              !validationResult.isValid &&
              validationResult.brokenIndex === block.index
          );
          const isCascadeBroken = isInvalidBlock && !isBrokenPoint && !isEditedBlock;
          const isHighlightedDanger = isEditedBlock || isInvalidBlock;
          const blockErrorReason = validationResult?.blockReasons?.[block.index];

          return (
            <div key={block.index} className="relative">
              {/* Connector line between blocks */}
              {idx < blocks.length - 1 && (
                <div
                  className={`absolute left-6 top-full h-4 w-0.5 -translate-x-1/2 z-0 ${
                    isHighlightedDanger ? 'bg-rose-500' : 'bg-[#2d6958]/30'
                  }`}
                />
              )}

              <div
                className={`p-5 rounded-xl border transition shadow-xs relative z-10 ${
                  isHighlightedDanger
                    ? 'bg-rose-50/90 border-rose-400 text-[#182b29]'
                    : isGenesis
                    ? 'bg-[#142825] text-white border-[#29403c]'
                    : 'bg-[#fbfaf7] border-[#dfddd6] text-[#182b29]'
                }`}
              >
                {/* Block header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/10">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                        isGenesis && !isHighlightedDanger
                          ? 'bg-[#26413c] text-emerald-300'
                          : isHighlightedDanger
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-[#f0ede6] text-[#182b29]'
                      }`}
                    >
                      BLOCK #{block.index.toString().padStart(3, '0')}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        isGenesis && !isHighlightedDanger ? 'text-white' : 'text-[#182b29]'
                      }`}
                    >
                      {block.data.title}
                    </span>
                    {isBrokenPoint && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-700 text-white text-[10px] font-bold">
                        TITIK PUTUS RANTAI
                      </span>
                    )}
                    {isCascadeBroken && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                        DOMINO ERROR (RANTAI HILIR RUSAK)
                      </span>
                    )}
                    {isEditedBlock && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                        PAYLOAD DIUBAH
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap text-[11px]">
                    <span
                      className={`flex items-center gap-1 font-mono ${
                        isGenesis && !isHighlightedDanger ? 'text-[#88bbaa]' : 'text-[#69736f]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(block.timestamp).toLocaleString('id-ID')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        isGenesis && !isHighlightedDanger
                          ? 'bg-[#1b3531] text-[#9caaa6]'
                          : 'bg-[#eee] text-[#69736f]'
                      }`}
                    >
                      Nonce: {block.nonce}
                    </span>
                    <button
                      onClick={() => openTamperModal(block)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                        isGenesis && !isHighlightedDanger
                          ? 'bg-[#26413c] hover:bg-[#335750] text-amber-200 border border-[#3a5c55]'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                      title="Otak-atik payload blok ini untuk menguji deteksi serangan SHA-256"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Uji Tamper Payload</span>
                    </button>
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
                        isGenesis && !isHighlightedDanger
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
                      <div className="pt-1 border-t border-black/5 text-[10px] truncate">
                        <span className="text-[#8c9491]">Data Hash:</span> {block.dataHash}
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
                          isGenesis && !isHighlightedDanger
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
                          className="text-[10px] text-[#2d6958] hover:underline flex items-center gap-1 cursor-pointer"
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
                          isHighlightedDanger
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : isGenesis
                            ? 'bg-[#1b3531] text-emerald-300 border-[#2d4a45]'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {block.hash}
                      </div>
                    </div>

                    {blockErrorReason && (
                      <div className="p-2 rounded-md bg-rose-100 border border-rose-300 text-[10px] text-rose-950 font-medium">
                        ⚠️ {blockErrorReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Per-Block Payload Tamper Simulator */}
      {editingBlock && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#fbfaf7] border border-[#dfddd6] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-rose-950 text-white flex items-center justify-between border-b border-rose-900">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-rose-300" />
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-rose-200 block">
                    SIMULASI SERANGAN MANIPULASI DATA
                  </span>
                  <h3 className="font-serif text-base font-semibold">
                    Ubah Payload BLOCK #{editingBlock.index.toString().padStart(3, '0')}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setEditingBlock(null)}
                className="p-1 rounded text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyPayloadTamper} className="p-5 space-y-3.5 text-xs">
              <p className="text-[#55635f] text-[11px] bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                Simulasi ini hanya mengubah payload di memori tampilan (tidak merusak database SQLite) untuk menguji apakah <b>Audit Validasi Rantai SHA-256</b> berhasil mendeteksi manipulasi pada blok ini.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#182b29] mb-1">Nomor Akta</label>
                  <input
                    type="text"
                    value={tamperDocId}
                    onChange={(e) => setTamperDocId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] font-mono text-xs text-[#182b29] focus:outline-none focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#182b29] mb-1">Klasifikasi</label>
                  <input
                    type="text"
                    value={tamperType}
                    onChange={(e) => setTamperType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#182b29] mb-1">Judul Akta / Dokumen</label>
                <input
                  type="text"
                  value={tamperTitle}
                  onChange={(e) => setTamperTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#182b29] mb-1">Nama Klien Terdaftar</label>
                <input
                  type="text"
                  value={tamperClient}
                  onChange={(e) => setTamperClient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] focus:outline-none focus:border-rose-600"
                />
              </div>

              {editingBlock.index < blocks.length - 1 && (
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recalculateLocalHash}
                    onChange={(e) => setRecalculateLocalHash(e.target.checked)}
                    className="mt-0.5 rounded border-rose-400 text-rose-700"
                  />
                  <span className="text-[11px] text-rose-950 leading-relaxed">
                    <b>Uji Efek Domino:</b> Penyerang ikut menghitung ulang Hash Block #
                    {editingBlock.index.toString().padStart(3, '0')} agar terlihat sah secara lokal —{' '}
                    <i>Block #{(editingBlock.index + 1).toString().padStart(3, '0')} akan tetap mendeteksi putusnya rantai Previous Hash!</i>
                  </span>
                </label>
              )}

              <div className="pt-2 border-t border-[#dfddd6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBlock(null)}
                  className="px-4 py-2 rounded-lg border border-[#dfddd6] hover:bg-[#f0ede6] text-xs font-semibold text-[#182b29] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Terapkan Tamper & Uji Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
