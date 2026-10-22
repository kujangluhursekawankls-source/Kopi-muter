import React from 'react';
import { formatDateIndo } from '../utils/formatters';

export const DashboardView: React.FC = () => {
  const todayFormatted = formatDateIndo(new Date());

  return (
    <div className="space-y-6 pb-6">
      {/* Brand Hero Card (Logo, Name, Date) - STRICTLY NON-INTERACTIVE */}
      <div className="bg-[#24140B] text-white rounded-3xl p-6 shadow-xl border border-[#3E2516] relative overflow-hidden text-center">
        {/* Subtle decorative glow in background */}
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#C58940]/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#C58940]/10 blur-2xl pointer-events-none" />

        {/* Central Logo */}
        <div className="flex justify-center mb-3">
          <div className="relative">
            <img
              src="/icon.svg"
              alt="Logo Puri Kopi"
              className="w-24 h-24 rounded-2xl shadow-lg border-2 border-[#C58940]/50 object-cover"
            />
            <div className="absolute -inset-1 rounded-2xl bg-[#C58940]/20 -z-10 blur-sm" />
          </div>
        </div>

        {/* Nama Puri Kopi & Tema Kopi Keliling */}
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#FAF3EB] mb-1">
          Puri Kopi
        </h1>
        <p className="text-sm text-[#F5B041] font-bold tracking-wide uppercase mb-1">
          Kopi Keliling &amp; Minuman Sachet Segar
        </p>
        <p className="text-xs text-[#D7C3B2] mb-3">
          Seduhan Cepat • Dingin Segar &amp; Hangat Mantap
        </p>

        {/* Tanggal Hari Ini */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3D2314] border border-[#C58940]/30 text-xs font-semibold text-[#EADBCC]">
          <span>Hari ini:</span>
          <span className="text-[#F5C27D] font-bold">{todayFormatted}</span>
        </div>
      </div>

      {/* Area Banner Promosi Kopi Keliling */}
      <div className="rounded-3xl overflow-hidden shadow-lg border border-[#EADBCC] bg-[#231209]">
        <img
          src="/banner-promo.svg"
          alt="Banner Promosi Puri Kopi Keliling"
          className="w-full h-auto object-cover block"
        />
      </div>

      {/* Desain Dekoratif: Semangat Kopi Keliling (Strictly Decorative, Non-Clickable) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EADBCC] space-y-4">
        <div className="flex items-center gap-3 border-b border-[#F0E4D8] pb-3">
          <div className="w-10 h-10 rounded-xl bg-[#FDF8F2] border border-[#EADBCC] flex items-center justify-center text-xl">
            🚲
          </div>
          <div>
            <h2 className="text-base font-bold text-[#24140B] font-serif">
              Semangat Kopi Keliling
            </h2>
            <p className="text-xs text-[#7A6455]">
              Pelepas dahaga praktis sahabat setia jalanan
            </p>
          </div>
        </div>

        <p className="text-sm text-[#4A382C] leading-relaxed">
          Kopi keliling hadir menyapa setiap sudut kota. Menyajikan aneka minuman sachet favorit masyarakat—mulai dari kopi hitam seduh panas, kopi susu es yang kental nikmat, hingga kesegaran es sari buah pelepas penat.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC]/80">
            <span className="text-xs font-bold text-[#C58940] uppercase tracking-wide block mb-1">
              Pilihan Sachet
            </span>
            <span className="text-sm font-bold text-[#24140B] block">
              Kopi &amp; Aneka Rasa
            </span>
            <span className="text-xs text-[#7A6455]">
              Good Day, Kopi Hitam, Tea Jus, Nutrisari &amp; Susu Segar.
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC]/80">
            <span className="text-xs font-bold text-[#C58940] uppercase tracking-wide block mb-1">
              Sajian Lengkap
            </span>
            <span className="text-sm font-bold text-[#24140B] block">
              Es Dingin &amp; Panas
            </span>
            <span className="text-xs text-[#7A6455]">
              Air panas termos selalu siap, es batu kristal segar selalu ada.
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Brand Card */}
      <div className="bg-[#FAF3EB] rounded-2xl p-4 border border-[#E6D7C7] text-center">
        <p className="text-xs text-[#7A6455] italic">
          &ldquo;Panas atau dingin, seduhan sachet mengiringi ikhtiar dan rezeki setiap hari.&rdquo;
        </p>
        <span className="text-[11px] font-bold text-[#C58940] tracking-wider uppercase block mt-1">
          — Puri Kopi Keliling Official —
        </span>
      </div>
    </div>
  );
};
