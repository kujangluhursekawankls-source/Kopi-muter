import React from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ArrowDownRight,
  BarChart3,
  Coffee,
  QrCode,
  Flame,
  Award,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ActiveTab, Expense, Product, Sale } from '../types';
import {
  calculateDailyRecap,
  formatDateIndo,
  formatRupiah,
  toDateInputValue,
} from '../utils/formatters';

interface DashboardViewProps {
  products?: Product[];
  sales?: Sale[];
  expenses?: Expense[];
  onNavigate?: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products = [],
  sales = [],
  expenses = [],
  onNavigate,
}) => {
  const todayFormatted = formatDateIndo(new Date());
  const todayStr = toDateInputValue();

  // Real-time calculation for today's store performance
  const todayRecap = calculateDailyRecap(sales, expenses, todayStr, products);

  // Active products in catalog
  const activeProductsCount = products.filter((p) => p.is_active).length;

  // Margin calculation
  const marginPercentage =
    todayRecap.totalSales > 0
      ? Math.round((todayRecap.netProfit / todayRecap.totalSales) * 100)
      : 0;

  // Average order value
  const aov =
    todayRecap.totalTransactions > 0
      ? Math.round(todayRecap.totalSales / todayRecap.totalTransactions)
      : 0;

  return (
    <div className="space-y-5 pb-6">
      {/* Brand Hero Card */}
      <div className="bg-[#24140B] text-white rounded-3xl p-5 shadow-xl border border-[#3E2516] relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#C58940]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#C58940]/10 blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3.5 mb-3">
          <img
            src="/icon.svg"
            alt="Logo Puri Kopi"
            className="w-14 h-14 rounded-2xl shadow-md border border-[#C58940]/50 object-cover flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#FAF3EB]">
                Puri Kopi
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#3D2314] text-[#F5C27D] text-[10px] font-bold border border-[#C58940]/30">
                Pusat Informasi
              </span>
            </div>
            <p className="text-xs text-[#F5B041] font-semibold tracking-wide uppercase">
              Kopi Keliling &amp; Minuman Sachet
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#3D2314] text-xs">
          <div className="flex items-center gap-1.5 text-[#EADBCC]">
            <Calendar className="w-3.5 h-3.5 text-[#F5C27D]" />
            <span className="font-medium">{todayFormatted}</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Toko Aktif
          </span>
        </div>
      </div>

      {/* INFORMASI UTAMA: KEUNTUNGAN BERSIH HARI INI */}
      <div className="bg-gradient-to-br from-[#24140B] via-[#2F1A0F] to-[#24140B] text-white rounded-3xl p-5 shadow-lg border border-[#C58940]/30 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#F5C27D] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#F5C27D]" />
            <span>KEUNTUNGAN BERSIH HARI INI</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF3EB]/10 text-[#F5C27D] border border-[#C58940]/30">
            Laba Bersih
          </span>
        </div>

        <div
          className={`text-3xl font-extrabold font-sans tracking-tight mb-3 ${
            todayRecap.netProfit >= 0 ? 'text-[#FAF3EB]' : 'text-rose-400'
          }`}
        >
          {formatRupiah(todayRecap.netProfit)}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-xs">
          <div className="bg-black/20 p-2.5 rounded-2xl border border-white/5">
            <span className="text-[10px] text-[#D7C3B2] block uppercase font-medium">Omzet Penjualan</span>
            <span className="font-extrabold text-emerald-400 font-sans block text-sm mt-0.5">
              {formatRupiah(todayRecap.totalSales)}
            </span>
          </div>

          <div className="bg-black/20 p-2.5 rounded-2xl border border-white/5">
            <span className="text-[10px] text-[#D7C3B2] block uppercase font-medium">Modal (HPP)</span>
            <span className="font-extrabold text-amber-300 font-sans block text-sm mt-0.5">
              {formatRupiah(todayRecap.totalCost)}
            </span>
          </div>

          <div className="bg-black/20 p-2.5 rounded-2xl border border-white/5">
            <span className="text-[10px] text-[#D7C3B2] block uppercase font-medium">Kas Keluar</span>
            <span className="font-extrabold text-rose-300 font-sans block text-sm mt-0.5">
              {formatRupiah(todayRecap.totalExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* INFORMASI RINGKASAN METRIK OPERASIONAL HARI INI */}
      <div className="grid grid-cols-2 gap-3">
        {/* Laba Kotor */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
            <TrendingUp className="w-4 h-4 text-[#C58940]" />
            <span>LABA KOTOR (HPP)</span>
          </div>
          <div className="text-xl font-extrabold text-[#1C110A] font-sans">
            {formatRupiah(todayRecap.grossProfit)}
          </div>
          <span className="text-[11px] text-[#7A6455] mt-1 block">
            Omzet dikurangi Modal Sachet
          </span>
        </div>

        {/* Total Barang Terjual */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#C58940] mb-1">
            <Coffee className="w-4 h-4" />
            <span>CUP TERJUAL HARI INI</span>
          </div>
          <div className="text-xl font-extrabold text-[#1C110A] font-sans">
            {todayRecap.totalItemsSold} <span className="text-sm font-semibold text-gray-500">Cup / Pcs</span>
          </div>
          <span className="text-[11px] text-[#7A6455] mt-1 block">
            {todayRecap.totalTransactions} Transaksi
          </span>
        </div>

        {/* Saldo Kas Operasional */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>SALDO KAS MASUK</span>
          </div>
          <div className="text-xl font-extrabold text-[#1C110A] font-sans">
            {formatRupiah(todayRecap.netBalance)}
          </div>
          <span className="text-[11px] text-[#7A6455] mt-1 block">
            Uang Penjualan - Kas Keluar
          </span>
        </div>

        {/* Margin Bersih & Rata-rata */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A6455] mb-1">
            <BarChart3 className="w-4 h-4 text-[#C58940]" />
            <span>MARGIN KEUNTUNGAN</span>
          </div>
          <div className="text-xl font-extrabold text-[#1C110A] font-sans">
            {todayRecap.totalSales > 0 ? `${marginPercentage}%` : '-'}
          </div>
          <span className="text-[11px] text-[#7A6455] mt-1 block">
            {aov > 0 ? `Rata-rata ${formatRupiah(aov)}/trx` : 'Rasio laba bersih'}
          </span>
        </div>
      </div>

      {/* INFORMASI MENU TERLARIS HARI INI */}
      <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#F0E4D8] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF3EB] text-[#C58940] flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#24140B] font-serif">
                Menu Terlaris Hari Ini
              </h2>
              <p className="text-[11px] text-[#7A6455]">
                Peringkat minuman sachet paling banyak dibeli
              </p>
            </div>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('rekap')}
              className="text-xs font-bold text-[#C58940] hover:text-[#24140B] flex items-center gap-0.5"
            >
              <span>Lihat Rekap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {todayRecap.productSummaries.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-[#7A6455]">
              Belum ada penjualan tercatat hari ini ({todayFormatted}).
            </p>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('penjualan')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#24140B] text-[#FAF3EB] text-xs font-bold shadow-sm hover:bg-[#3E2516] transition"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#F5C27D]" />
                <span>Buka Menu Penjualan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayRecap.productSummaries.slice(0, 5).map((item, idx) => (
              <div key={item.product_name} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                      idx === 0
                        ? 'bg-[#C58940] text-white'
                        : idx === 1
                        ? 'bg-[#EADBCC] text-[#24140B]'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <strong className="text-sm font-bold text-[#1C110A] block truncate">
                      {item.product_name}
                    </strong>
                    <span className="text-[11px] text-[#7A6455]">
                      {item.transactionCount}x transaksi • Modal: {formatRupiah(item.totalCost)}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="flex items-center justify-end gap-1 mb-0.5">
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-[#24140B] text-white">
                      {item.totalQuantity} pcs
                    </span>
                    <span className="text-xs font-extrabold px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      +{formatRupiah(item.totalProfit)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#C58940]">
                    {formatRupiah(item.totalSales)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INFORMASI KATALOG & STATUS TOKO */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EADBCC] space-y-3">
        <div className="flex items-center gap-2.5 border-b border-[#F0E4D8] pb-3">
          <div className="w-8 h-8 rounded-xl bg-[#FAF3EB] text-[#C58940] flex items-center justify-center">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#24140B] font-serif">
              Status Katalog &amp; Layanan
            </h3>
            <p className="text-[11px] text-[#7A6455]">
              Informasi kesiapan seduhan kopi keliling
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC]">
            <span className="text-[10px] font-bold text-[#7A6455] uppercase block">
              Menu Terdaftar
            </span>
            <span className="text-base font-extrabold text-[#24140B] block mt-0.5">
              {activeProductsCount} Varian Aktif
            </span>
            <span className="text-[11px] text-[#A69383]">
              Siap diseduh es &amp; panas
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC]">
            <span className="text-[10px] font-bold text-[#7A6455] uppercase block">
              Total Riwayat
            </span>
            <span className="text-base font-extrabold text-[#24140B] block mt-0.5">
              {sales.length} Penjualan
            </span>
            <span className="text-[11px] text-[#A69383]">
              Tersimpan aman di memori
            </span>
          </div>
        </div>
      </div>

      {/* NAVIGASI MENU LENGKAP (Pastikan Semua Menu Terhubung) */}
      {onNavigate && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EADBCC] space-y-3">
          <h3 className="text-sm font-bold text-[#24140B] font-serif border-b border-[#F0E4D8] pb-2">
            Akses Cepat Menu Aplikasi
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onNavigate('penjualan')}
              className="p-3 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC] hover:bg-[#FAF3EB] active:scale-98 transition flex items-center gap-2.5 text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-[#24140B] text-[#F5C27D] flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#24140B] block truncate">
                  Menu Penjualan
                </span>
                <span className="text-[10px] text-[#7A6455]">Catat pesanan pembeli</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('produk')}
              className="p-3 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC] hover:bg-[#FAF3EB] active:scale-98 transition flex items-center gap-2.5 text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-[#24140B] text-[#F5C27D] flex items-center justify-center flex-shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#24140B] block truncate">
                  Menu Produk
                </span>
                <span className="text-[10px] text-[#7A6455]">Atur harga modal &amp; jual</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('kas-keluar')}
              className="p-3 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC] hover:bg-[#FAF3EB] active:scale-98 transition flex items-center gap-2.5 text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-[#24140B] text-[#F5C27D] flex items-center justify-center flex-shrink-0">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#24140B] block truncate">
                  Menu Kas Keluar
                </span>
                <span className="text-[10px] text-[#7A6455]">Catat es, bensin, dll</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('rekap')}
              className="p-3 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC] hover:bg-[#FAF3EB] active:scale-98 transition flex items-center gap-2.5 text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-[#24140B] text-[#F5C27D] flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#24140B] block truncate">
                  Menu Rekap
                </span>
                <span className="text-[10px] text-[#7A6455]">Laba bersih &amp; PDF</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('qris')}
              className="col-span-2 p-3 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC] hover:bg-[#FAF3EB] active:scale-98 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#24140B] text-[#F5C27D] flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[#24140B] block">
                    Menu QRIS Pembayaran
                  </span>
                  <span className="text-[10px] text-[#7A6455]">
                    Upload &amp; tampilkan kode QRIS pelanggan
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C58940]" />
            </button>
          </div>
        </div>
      )}

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
