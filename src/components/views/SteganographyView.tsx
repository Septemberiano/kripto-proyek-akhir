import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Lock,
  Unlock,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Info,
  RefreshCw,
} from 'lucide-react';
import { encodeLSB, decodeLSB } from '../../utils/crypto';

export const SteganographyView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');

  // Encode state
  const [secretText, setSecretText] = useState(
    'METADATA HUKUM RAHASIA: Akta Notaris #01428/JKT disahkan oleh Natasha S.H., M.Kn. pada 24 Juni 2025. Segel Kriptografis Asli.'
  );
  const [selectedTemplate, setSelectedTemplate] = useState<'seal' | 'certificate' | 'thumbprint'>('seal');
  const [encodeSuccess, setEncodeSuccess] = useState(false);
  const [stegoDataUrl, setStegoDataUrl] = useState<string | null>(null);
  const [encodeError, setEncodeError] = useState<string | null>(null);

  // Decode state
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [copiedDecoded, setCopiedDecoded] = useState(false);

  const encodeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw template onto encode canvas
  const drawTemplate = (type: 'seal' | 'certificate' | 'thumbprint') => {
    const canvas = encodeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 300;

    if (type === 'seal') {
      // Elegant Notarial Wax Seal illustration
      ctx.fillStyle = '#f5f3ee';
      ctx.fillRect(0, 0, 400, 300);

      // Outer border
      ctx.strokeStyle = '#dfddd6';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 380, 280);

      // Red Wax Seal Center
      ctx.beginPath();
      ctx.arc(200, 150, 85, 0, Math.PI * 2);
      ctx.fillStyle = '#772e3a';
      ctx.fill();
      ctx.strokeStyle = '#a57b6d';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(200, 150, 70, 0, Math.PI * 2);
      ctx.strokeStyle = '#e8c4b9';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text inside seal
      ctx.fillStyle = '#f4e8dc';
      ctx.font = 'bold 13px serif';
      ctx.textAlign = 'center';
      ctx.fillText('NOTARIS INDONESIA', 200, 120);
      ctx.font = 'bold 22px serif';
      ctx.fillText('ARSIPNUSA', 200, 155);
      ctx.font = '10px sans-serif';
      ctx.fillText('SEAL OF LEGAL AUTHENTICITY', 200, 185);
    } else if (type === 'certificate') {
      // Land Certificate Map Mockup
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, 400, 300);

      ctx.fillStyle = '#e8ecea';
      ctx.fillRect(40, 40, 320, 220);

      ctx.fillStyle = '#2d6958';
      ctx.font = 'bold 14px serif';
      ctx.fillText('BUKTI FISIK SERTIFIKAT TANAH', 60, 70);

      ctx.fillStyle = '#69736f';
      ctx.font = '11px sans-serif';
      ctx.fillText('Nomor: SHM 01428 / Menteng / 2025', 60, 95);
      ctx.fillText('Luas Kavling: 840 m²', 60, 115);

      // Cadastral plot outline
      ctx.strokeStyle = '#762e3b';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 135, 140, 100);

      ctx.fillStyle = '#762e3b';
      ctx.font = '10px monospace';
      ctx.fillText('KAVLING A-14', 90, 190);
    } else {
      // Thumbprint / Biometric
      ctx.fillStyle = '#142825';
      ctx.fillRect(0, 0, 400, 300);

      ctx.strokeStyle = '#88bbaa';
      ctx.lineWidth = 2;
      for (let r = 10; r < 90; r += 12) {
        ctx.beginPath();
        ctx.arc(200, 150, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CAP JEMPOL DIGITAL KLIEN', 200, 260);
    }
  };

  useEffect(() => {
    drawTemplate(selectedTemplate);
    setStegoDataUrl(null);
    setEncodeSuccess(false);
    setEncodeError(null);
  }, [selectedTemplate]);

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = encodeCanvasRef.current;
        if (!canvas) return;
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 400, 300);
        setStegoDataUrl(null);
        setEncodeSuccess(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleEncode = () => {
    const canvas = encodeCanvasRef.current;
    if (!canvas) return;

    setEncodeError(null);
    try {
      const dataUrl = encodeLSB(canvas, secretText);
      setStegoDataUrl(dataUrl);
      setEncodeSuccess(true);
    } catch (err: any) {
      setEncodeError(err.message || 'Gagal menyisipkan pesan LSB.');
    }
  };

  const handleDecodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = decodeCanvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        setDecodedMessage(null);
        setDecodeError(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDecode = () => {
    const canvas = decodeCanvasRef.current;
    if (!canvas) return;

    setIsDecoding(true);
    setDecodeError(null);
    setDecodedMessage(null);

    setTimeout(() => {
      try {
        const message = decodeLSB(canvas);
        setDecodedMessage(message);
      } catch (err: any) {
        setDecodeError(err.message || 'Gagal mengekstrak pesan tersembunyi.');
      } finally {
        setIsDecoding(false);
      }
    }, 400);
  };

  const handleUseCurrentStegoForDecode = () => {
    if (!stegoDataUrl) return;
    setActiveTab('decode');

    const img = new Image();
    img.onload = () => {
      const canvas = decodeCanvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
    };
    img.src = stegoDataUrl;
  };

  const copyDecoded = () => {
    if (!decodedMessage) return;
    navigator.clipboard.writeText(decodedMessage);
    setCopiedDecoded(true);
    setTimeout(() => setCopiedDecoded(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#762e3b] uppercase">
            WATERMARKING DIGITAL & STEGANOGRAFI
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#182b29] font-medium tracking-tight mt-0.5">
            Steganografi Gambar Bukti Fisik
          </h1>
          <p className="text-xs sm:text-sm text-[#69736f] mt-1">
            Menyisipkan metadata notaris, nomor akta, dan segel kriptografis secara kasat mata (invisible) ke dalam piksel gambar bukti menggunakan metode LSB (Least Significant Bit).
          </p>
        </div>

        {/* Tab switch */}
        <div className="p-1 rounded-lg bg-[#f0ede6] border border-[#dfddd6] flex items-center gap-1 self-start">
          <button
            onClick={() => setActiveTab('encode')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'encode'
                ? 'bg-[#182b29] text-white shadow-xs'
                : 'text-[#69736f] hover:text-[#182b29]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sisipkan Pesan (Encode)</span>
          </button>
          <button
            onClick={() => setActiveTab('decode')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'decode'
                ? 'bg-[#182b29] text-white shadow-xs'
                : 'text-[#69736f] hover:text-[#182b29]'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Ekstrak Pesan (Decode)</span>
          </button>
        </div>
      </div>

      {/* Information Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#142825] to-[#1c3935] text-white border border-[#29403c] flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-[#88bbaa] shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="text-white block">Cara Kerja Kriptografis LSB (Least Significant Bit):</strong>
          <p className="text-[#aebbb7] mt-0.5">
            Setiap karakter diubah menjadi 8 bit biner. Bit-bit rahasia kemudian disematkan pada bit terakhir (LSB) dari saluran warna Red, Green, dan Blue di setiap piksel gambar. Perubahan nilai warna hanya sebesar ±1 (misalnya nilai 200 menjadi 201), sehingga secara kasat mata gambar tampak 100% identik dengan aslinya.
          </p>
        </div>
      </div>

      {activeTab === 'encode' ? (
        /* ================== ENCODE TAB ================== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls & Secret Text */}
          <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
            <h3 className="font-serif text-base text-[#182b29] font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#2d6958]" />
              Pilih Gambar Bukti & Masukkan Pesan Rahasia
            </h3>

            {/* Template selector */}
            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1.5">
                Pilih Gambar Template Notaris
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('seal')}
                  className={`p-2.5 rounded-lg border text-xs font-medium text-center transition cursor-pointer ${
                    selectedTemplate === 'seal'
                      ? 'bg-[#182b29] text-white border-[#182b29]'
                      : 'bg-white text-[#55635f] border-[#dfddd6] hover:bg-[#f5f3ee]'
                  }`}
                >
                  Segel Lilin Notaris
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('certificate')}
                  className={`p-2.5 rounded-lg border text-xs font-medium text-center transition cursor-pointer ${
                    selectedTemplate === 'certificate'
                      ? 'bg-[#182b29] text-white border-[#182b29]'
                      : 'bg-white text-[#55635f] border-[#dfddd6] hover:bg-[#f5f3ee]'
                  }`}
                >
                  Denah Sertifikat
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('thumbprint')}
                  className={`p-2.5 rounded-lg border text-xs font-medium text-center transition cursor-pointer ${
                    selectedTemplate === 'thumbprint'
                      ? 'bg-[#182b29] text-white border-[#182b29]'
                      : 'bg-white text-[#55635f] border-[#dfddd6] hover:bg-[#f5f3ee]'
                  }`}
                >
                  Cap Jempol Digital
                </button>
              </div>
            </div>

            {/* Upload custom option */}
            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Atau Unggah Gambar Bukti Fisik Anda (PNG/JPG)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleCustomImageUpload}
                className="w-full text-xs text-[#55635f] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#f0ede6] file:text-[#182b29] hover:file:bg-[#e6e2d8] cursor-pointer"
              />
            </div>

            {/* Secret message textarea */}
            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Pesan Rahasia / Metadata Legal yang Disematkan
              </label>
              <textarea
                rows={4}
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Tuliskan metadata rahasia yang akan disembunyikan..."
                className="w-full p-3 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#182b29] font-mono focus:outline-none focus:border-[#2d6958]"
              />
              <span className="text-[10px] text-[#8c9491] mt-0.5 block">
                Panjang pesan: {secretText.length} karakter · Format LSB UTF-8
              </span>
            </div>

            {encodeError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{encodeError}</span>
              </div>
            )}

            <button
              onClick={handleEncode}
              className="w-full py-2.5 px-4 rounded-lg bg-[#2d6958] hover:bg-[#235345] text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Sisipkan Pesan Kriptografis ke Piksel (LSB Encode)</span>
            </button>
          </div>

          {/* Canvas Preview & Stego Output */}
          <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
            <h3 className="font-serif text-base text-[#182b29] font-semibold flex items-center justify-between">
              <span>Pratinjau Kanvas Gambar Bukti</span>
              {encodeSuccess && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                  ✓ Stego Image Siap
                </span>
              )}
            </h3>

            {/* Canvas */}
            <div className="border border-[#dfddd6] rounded-lg overflow-hidden bg-white flex items-center justify-center p-2 shadow-inner">
              <canvas
                ref={encodeCanvasRef}
                className="max-w-full h-auto rounded shadow-xs"
              />
            </div>

            {encodeSuccess && stegoDataUrl && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <strong className="text-emerald-900">
                    Metadata Rahasia Berhasil Disisipkan ke dalam Bit Piksel!
                  </strong>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Gambar di atas kini memuat data rahasia tanpa mengalami perubahan visual. Silakan unduh gambar berformat PNG tanpa kompresi lossy.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={stegoDataUrl}
                    download="Bukti_Fisik_Stego_LSB.png"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2d6958] text-white text-xs font-semibold hover:bg-[#235345] transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Gambar Stego (.png)</span>
                  </a>
                  <button
                    onClick={handleUseCurrentStegoForDecode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
                  >
                    <span>Uji Ekstrak di Tab Decode</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================== DECODE TAB ================== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
            <h3 className="font-serif text-base text-[#182b29] font-semibold flex items-center gap-2">
              <Unlock className="w-4 h-4 text-[#762e3b]" />
              Unggah Gambar Stego untuk Ekstraksi
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#182b29] mb-1">
                Pilih Berkas Gambar Stego (PNG)
              </label>
              <input
                type="file"
                accept="image/png,image/*"
                onChange={handleDecodeUpload}
                className="w-full text-xs text-[#55635f] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#f0ede6] file:text-[#182b29] hover:file:bg-[#e6e2d8] cursor-pointer"
              />
              <span className="text-[10px] text-[#8c9491] mt-0.5 block">
                Gunakan file PNG hasil encode sebelumnya agar LSB tidak terkompresi.
              </span>
            </div>

            <div className="border border-[#dfddd6] rounded-lg overflow-hidden bg-white p-2 flex items-center justify-center min-h-[200px]">
              <canvas
                ref={decodeCanvasRef}
                className="max-w-full h-auto rounded shadow-xs"
              />
            </div>

            {decodeError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{decodeError}</span>
              </div>
            )}

            <button
              onClick={handleDecode}
              disabled={isDecoding}
              className="w-full py-2.5 px-4 rounded-lg bg-[#182b29] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              {isDecoding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Membaca Bit Piksel Gambar...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Ekstrak Pesan Tersembunyi (LSB Decode)</span>
                </>
              )}
            </button>
          </div>

          <div className="p-5 rounded-xl bg-[#fbfaf7] border border-[#dfddd6] shadow-xs space-y-4">
            <h3 className="font-serif text-base text-[#182b29] font-semibold flex items-center justify-between">
              <span>Hasil Ekstraksi Steganografi</span>
              {decodedMessage && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                  ✓ Berhasil Diekstrak
                </span>
              )}
            </h3>

            {decodedMessage ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-mono leading-relaxed break-all shadow-xs">
                  {decodedMessage}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#69736f]">
                    Panjang data terekstraksi: {decodedMessage.length} karakter
                  </span>
                  <button
                    onClick={copyDecoded}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2d6958] text-white text-xs font-semibold hover:bg-[#235345] transition cursor-pointer"
                  >
                    {copiedDecoded ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDecoded ? 'Tersalin!' : 'Salin Pesan'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#dfddd6] text-xs text-[#55635f]">
                  ✓ Metadata berhasil dibaca dari LSB kanal warna merah, hijau, dan biru tanpa galat parity.
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-gray-400">
                Belum ada pesan yang diekstrak. Unggah berkas stego lalu klik tombol ekstrak.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
