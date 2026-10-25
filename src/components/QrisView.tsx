import React, { useState, useRef } from 'react';
import {
  QrCode,
  Upload,
  Camera,
  Trash2,
  Check,
  AlertCircle,
  Maximize2,
  X,
  Download,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { QrisData } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface QrisViewProps {
  qrisData: QrisData | null;
  onSaveQris: (data: QrisData) => Promise<void>;
  onDeleteQris: () => Promise<void>;
}

// Client-side image compressor using Canvas
async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Gagal memproses gambar pada canvas.'));
        }

        // Fill white background in case of transparent PNG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal membaca gambar.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membuka file.'));
    reader.readAsDataURL(file);
  });
}

export const QrisView: React.FC<QrisViewProps> = ({
  qrisData,
  onSaveQris,
  onDeleteQris,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState<string>(
    qrisData?.merchantName || 'Puri Kopi Keliling'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap pilih file gambar (JPG, PNG, atau WEBP).');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      const compressedBase64 = await compressImageFile(file);
      setTempImage(compressedBase64);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses gambar QRIS.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const imageToSave = tempImage || qrisData?.imageUrl;
    if (!imageToSave) {
      setErrorMessage('Harap pilih foto QRIS terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      await onSaveQris({
        imageUrl: imageToSave,
        merchantName: merchantName.trim() || 'Puri Kopi Keliling',
        updatedAt: new Date().toISOString(),
      });
      showToast('Barcode QRIS berhasil disimpan!');
      setTempImage(null);
      setIsEditMode(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan QRIS.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await onDeleteQris();
      showToast('Barcode QRIS berhasil dihapus.');
      setShowDeleteModal(false);
      setTempImage(null);
      setIsEditMode(false);
    } catch (err) {
      showToast('Gagal menghapus QRIS');
    }
  };

  const handleDownload = () => {
    const src = qrisData?.imageUrl;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `QRIS-${(qrisData.merchantName || 'Puri-Kopi').replace(/\s+/g, '-')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Gambar QRIS tersimpan di perangkat.');
  };

  const hasQris = !!qrisData?.imageUrl && !isEditMode;

  return (
    <div className="space-y-6 pb-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-[#24140B] to-[#3D2314] rounded-3xl p-5 text-white shadow-md border border-[#4D2E1B]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F5C27D]/20 text-[#F5C27D] flex items-center justify-center flex-shrink-0 ring-1 ring-[#F5C27D]/40">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif text-[#FAF3EB] leading-tight">
              Pembayaran QRIS
            </h2>
            <p className="text-xs text-[#D8C7B8] mt-0.5">
              Tampilkan barcode QRIS ke pembeli untuk pembayaran non-tunai / transfer
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MODE 1: QRIS Tersedia (Display Standee Mode) */}
      {hasQris && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADBCC] text-center">
            {/* Standee Header */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-extrabold uppercase tracking-widest border border-red-200 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              QRIS Nasional
            </div>

            <h3 className="text-xl font-extrabold text-[#24140B] font-serif tracking-tight">
              {qrisData.merchantName || 'Puri Kopi Keliling'}
            </h3>
            <p className="text-xs text-[#7A6455] mb-4">
              NMID / Barcode Pembayaran Resmi
            </p>

            {/* QRIS Image Card with Tap to Zoom */}
            <div
              onClick={() => setIsFullScreen(true)}
              className="relative mx-auto max-w-[280px] aspect-square rounded-2xl overflow-hidden border-2 border-[#24140B] shadow-inner bg-white p-3 cursor-pointer group hover:scale-[1.02] transition-transform"
            >
              <img
                src={qrisData.imageUrl}
                alt="Barcode QRIS"
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold transition-opacity backdrop-blur-[1px]">
                <Maximize2 className="w-8 h-8 mb-1 text-[#F5C27D]" />
                <span>Ketuk Layar Penuh</span>
              </div>
            </div>

            <p className="text-[11px] text-[#A69383] mt-3 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C58940]" />
              Ketuk gambar barcode untuk memperbesar layar penuh saat pembeli scan
            </p>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[#F0E4D8]">
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#24140B] text-[#FAF3EB] text-sm font-bold hover:bg-[#3D2314] transition shadow-sm active:scale-95"
              >
                <Maximize2 className="w-4 h-4 text-[#F5C27D]" />
                <span>Layar Penuh</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition active:scale-95"
              >
                <Download className="w-4 h-4 text-[#C58940]" />
                <span>Unduh Foto</span>
              </button>
            </div>

            {/* Change or Delete Buttons */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTempImage(null);
                  setMerchantName(qrisData.merchantName || 'Puri Kopi Keliling');
                  setIsEditMode(true);
                }}
                className="text-xs font-semibold text-[#7A6455] hover:text-[#24140B] flex items-center gap-1.5 underline underline-offset-4"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ganti Foto Barcode</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus QRIS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: Form Upload / Edit QRIS */}
      {(!hasQris || isEditMode) && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EADBCC] space-y-5">
          <div className="border-b border-[#F0E4D8] pb-3">
            <h3 className="text-base font-bold text-[#24140B] font-serif">
              {qrisData ? 'Perbarui Barcode QRIS' : 'Upload Barcode QRIS'}
            </h3>
            <p className="text-xs text-[#7A6455]">
              Pilih foto QRIS dari Galeri HP Anda atau foto langsung menggunakan Kamera
            </p>
          </div>

          {/* Nama Toko / Merchant Name */}
          <div>
            <label className="block text-sm font-bold text-[#24140B] mb-1.5">
              Nama Merchant / Toko di QRIS
            </label>
            <input
              type="text"
              placeholder="Contoh: PURI KOPI KELILING"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C58940]"
            />
            <span className="text-[11px] text-[#7A6455] mt-1 block">
              Nama ini akan muncul di atas barcode saat ditampilkan ke pembeli.
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Image Upload Area */}
          <div>
            <label className="block text-sm font-bold text-[#24140B] mb-1.5">
              Foto Barcode QRIS
            </label>

            {tempImage || (isEditMode && qrisData?.imageUrl) ? (
              <div className="space-y-3">
                <div className="relative mx-auto max-w-[260px] aspect-square rounded-2xl border-2 border-dashed border-[#C58940] p-2 bg-gray-50 flex items-center justify-center">
                  <img
                    src={tempImage || qrisData?.imageUrl}
                    alt="Preview QRIS"
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Pilih Foto Lain</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempImage(null)}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#C58940]/60 rounded-3xl p-8 text-center bg-[#FAF3EB]/50 hover:bg-[#FAF3EB] cursor-pointer transition space-y-3"
              >
                <div className="w-14 h-14 rounded-full bg-[#24140B] text-[#F5C27D] flex items-center justify-center mx-auto shadow-md">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#24140B]">
                    Klik untuk Ambil Foto atau Pilih dari Galeri
                  </p>
                  <p className="text-xs text-[#7A6455] mt-1">
                    Bisa berupa screenshot QRIS dari m-Banking, GoPay, Dana, Ovo, ShopeePay, dll
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#24140B] text-[#FAF3EB] text-xs font-semibold">
                  <Upload className="w-3.5 h-3.5 text-[#F5C27D]" />
                  <span>Pilih Gambar QRIS</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(false);
                  setTempImage(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition min-h-[48px]"
              >
                Batal
              </button>
            )}

            <button
              type="button"
              disabled={isUploading || (!tempImage && !qrisData?.imageUrl)}
              onClick={handleSave}
              className="flex-2 w-full py-3 px-4 rounded-2xl bg-[#24140B] hover:bg-[#3D2314] active:bg-[#1A0E08] text-white font-bold text-sm transition shadow-md min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-[#F5C27D]" />
              <span>{isUploading ? 'Menyimpan...' : 'Simpan Barcode QRIS'}</span>
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN MODAL FOR SCANNING */}
      {isFullScreen && qrisData?.imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 safe-bottom animate-in fade-in">
          {/* Header */}
          <div className="w-full flex items-center justify-between text-white max-w-sm pt-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#F5C27D] block">
                QRIS Pembayaran
              </span>
              <h4 className="text-base font-bold truncate">
                {qrisData.merchantName || 'Puri Kopi Keliling'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition"
              aria-label="Tutup"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* High brightness white container for easy scanning */}
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center my-auto">
            <div className="w-full flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
              <span className="text-xs font-black text-red-600 tracking-wider">
                QRIS
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                Standar Nasional
              </span>
            </div>

            <div className="w-full aspect-square bg-white flex items-center justify-center p-1">
              <img
                src={qrisData.imageUrl}
                alt="QRIS Barcode"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="w-full text-center mt-3 pt-2 border-t border-gray-100">
              <p className="text-xs font-extrabold text-[#24140B] uppercase">
                {qrisData.merchantName || 'Puri Kopi Keliling'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Buka aplikasi m-Banking atau e-Wallet lalu scan barcode di atas
              </p>
            </div>
          </div>

          {/* Bottom dismiss button */}
          <button
            type="button"
            onClick={() => setIsFullScreen(false)}
            className="w-full max-w-xs py-3 rounded-2xl bg-white text-[#24140B] font-bold text-sm shadow-lg hover:bg-gray-100 transition active:scale-95"
          >
            Tutup Tampilan QRIS
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Hapus Barcode QRIS?"
        message="Apakah Anda yakin ingin menghapus gambar QRIS ini? Pembeli tidak akan bisa melihat barcode hingga Anda mengunggah gambar baru."
        confirmLabel="Hapus QRIS"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
