import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, Download, CheckCircle2 } from 'lucide-react';
import { SyncState } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  syncState: SyncState;
  onSyncManual: () => void;
}

export const Header: React.FC<HeaderProps> = ({ syncState, onSyncManual }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const renderSyncBadge = () => {
    switch (syncState.status) {
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E5A962]/20 text-[#E5A962] text-xs font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Menyinkronkan...</span>
          </div>
        );
      case 'offline':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline {syncState.pendingCount > 0 ? `(${syncState.pendingCount} antrean)` : ''}</span>
          </div>
        );
      case 'pending':
        return (
          <button
            onClick={onSyncManual}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold hover:bg-sky-500/30 transition"
            title="Klik untuk menyinkronkan perubahan lokal ke server"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{syncState.pendingCount} Belum Tersinkron</span>
          </button>
        );
      case 'error':
        return (
          <button
            onClick={onSyncManual}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition"
            title="Sinkronisasi gagal. Klik untuk coba lagi."
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Sinkronisasi Gagal</span>
          </button>
        );
      case 'synced':
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Online &amp; Tersinkron</span>
          </div>
        );
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#24140B] text-white border-b border-[#3D2314] shadow-md safe-top">
        <div className="max-w-md mx-auto px-4 h-15 flex items-center justify-between">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.svg"
              alt="Logo Puri Kopi"
              className="w-8 h-8 rounded-lg shadow-sm border border-[#C58940]/40"
            />
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-[#FAF3EB] leading-none block">
                Puri Kopi
              </span>
              <span className="text-[10px] text-[#F5B041] tracking-wider uppercase font-semibold">
                Kasir Kopi Keliling
              </span>
            </div>
          </div>

          {/* Sync indicator & Install button */}
          <div className="flex items-center gap-2">
            {renderSyncBadge()}

            {/* In-App PWA Install Button (Android / Chrome) */}
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C58940] hover:bg-[#D49B55] text-white text-xs font-bold transition shadow-sm"
                aria-label="Pasang Aplikasi di Layar HP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang</span>
              </button>
            )}

            {/* iOS Safari install guidance */}
            {!isInstalled && isIOS && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3D2314] text-[#E5B26E] text-xs font-medium border border-[#C58940]/30 hover:bg-[#4D2D1A] transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#D49B55]/30">
            <div className="flex items-center gap-3 mb-3">
              <img src="/icon.svg" alt="Puri Kopi" className="w-10 h-10 rounded-xl" />
              <div>
                <h3 className="text-base font-bold text-[#24140B]">Pasang Puri Kopi di iOS</h3>
                <p className="text-xs text-gray-500">Agar bisa dibuka langsung dari layar utama</p>
              </div>
            </div>
            <ol className="text-sm text-gray-700 space-y-2.5 my-4 bg-[#FDF8F2] p-3.5 rounded-xl border border-[#EADBCC]">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#C58940]">1.</span>
                <span>Tekan tombol <strong>Bagikan (Share)</strong> pada toolbar Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#C58940]">2.</span>
                <span>Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#C58940]">3.</span>
                <span>Tekan <strong>Tambah (Add)</strong> di pojok kanan atas.</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#24140B] text-white font-semibold text-sm hover:bg-[#3D2314] transition"
            >
              Tutup Petunjuk
            </button>
          </div>
        </div>
      )}
    </>
  );
};
