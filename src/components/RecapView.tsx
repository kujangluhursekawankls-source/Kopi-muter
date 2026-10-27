import React, { useState, useRef } from 'react';
import {
  Calendar,
  Share2,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PackageCheck,
  Check,
  Upload,
  Database,
  ShieldCheck,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { Expense, Product, Sale } from '../types';
import {
  calculateDailyRecap,
  calculateMonthlyRecap,
  formatDateIndo,
  formatDateShortIndo,
  formatRupiah,
  formatTimeIndo,
  getMonthNamesIndo,
  toDateInputValue,
} from '../utils/formatters';
import {
  downloadDailyPdf,
  downloadMonthlyPdf,
  printDailyReport,
  printMonthlyReport,
  shareDailyReport,
  shareMonthlyReport,
} from '../utils/exportPdf';

interface RecapViewProps {
  sales: Sale[];
  expenses: Expense[];
  products?: Product[];
  onOpenEditSale?: (sale: Sale) => void;
  onOpenEditExpense?: (expense: Expense) => void;
  onExportBackup?: () => Promise<boolean>;
  onImportBackup?: (json: string) => Promise<boolean>;
}

export const RecapView: React.FC<RecapViewProps> = ({
  sales,
  expenses,
  products,
  onExportBackup,
  onImportBackup,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'harian' | 'bulanan'>('harian');
  const [dailySalesViewMode, setDailySalesViewMode] = useState<'grouped' | 'transactions'>('grouped');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Daily state
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue());

  // Monthly state
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);

  // Status feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Calculations
  const dailyRecap = calculateDailyRecap(sales, expenses, selectedDate, products);
  const monthlyRecap = calculateMonthlyRecap(sales, expenses, selectedYear, selectedMonth, products);

  const months = getMonthNamesIndo();

  // Handle Export Actions
  const handleShare = async () => {
    if (activeSubTab === 'harian') {
      const ok = await shareDailyReport(dailyRecap);
      if (ok) showToast('Laporan harian siap dibagikan.');
    } else {
      const ok = await shareMonthlyReport(monthlyRecap);
      if (ok) showToast('Laporan bulanan siap dibagikan.');
    }
  };

  const handleDownload = () => {
    if (activeSubTab === 'harian') {
      downloadDailyPdf(dailyRecap);
      showToast('Mengunduh PDF Rekap Harian...');
    } else {
      downloadMonthlyPdf(monthlyRecap);
      showToast('Mengunduh PDF Rekap Bulanan...');
    }
  };

  const handlePrint = () => {
    if (activeSubTab === 'harian') {
      printDailyReport(dailyRecap);
    } else {
      printMonthlyReport(monthlyRecap);
    }
  };

  const handleExportBackup = async () => {
    if (onExportBackup) {
      await onExportBackup();
      showToast('File cadangan berhasil diunduh ke HP Anda!');
    }
  };

  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoring(true);
    try {
      const text = await file.text();
      if (onImportBackup) {
        await onImportBackup(text);
        showToast('Data berhasil dipulihkan dari file cadangan!');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memulihkan data.');
    } finally {
      setIsRestoring(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-18 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sub-tab Navigation (Harian vs Bulanan) */}
      <div className="flex bg-[#EADBCC]/60 p-1 rounded-2xl border border-[#D9C4B0]">
        <button
          type="button"
          onClick={() => setActiveSubTab('harian')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
            activeSubTab === 'harian'
              ? 'bg-[#24140B] text-[#FAF3EB] shadow-md'
              : 'text-[#4A382C] hover:text-[#24140B]'
          }`}
        >
          Rekap Harian
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('bulanan')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
            activeSubTab === 'bulanan'
              ? 'bg-[#24140B] text-[#FAF3EB] shadow-md'
              : 'text-[#4A382C] hover:text-[#24140B]'
          }`}
        >
          Rekap Bulanan
        </button>
      </div>

      {/* ===================== TAB 1: REKAP HARIAN ===================== */}
      {activeSubTab === 'harian' && (
        <div className="space-y-4">
          {/* Date Picker Header */}
          <div className="bg-white rounded-3xl p-4 border border-[#EADBCC] shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C58940]" />
              <div>
                <span className="text-[11px] font-bold text-[#7A6455] uppercase block">
                  Pilih Tanggal Laporan
                </span>
                <span className="text-sm font-extrabold text-[#24140B]">
                  {formatDateIndo(selectedDate)}
                </span>
              </div>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-[#24140B] focus:outline-none focus:ring-2 focus:ring-[#C58940]"
            />
          </div>

          {/* Action Buttons: Bagikan, Unduh PDF, Cetak */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white border border-[#EADBCC] text-[#24140B] font-bold text-xs hover:bg-[#FDF8F2] active:scale-95 transition shadow-sm"
            >
              <Share2 className="w-4 h-4 text-[#C58940]" />
              <span>Bagikan</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-[#24140B] text-white font-bold text-xs hover:bg-[#3E2516] active:scale-95 transition shadow-sm"
            >
              <Download className="w-4 h-4 text-[#F5C27D]" />
              <span>Unduh PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white border border-[#EADBCC] text-[#24140B] font-bold text-xs hover:bg-[#FDF8F2] active:scale-95 transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-[#C58940]" />
              <span>Cetak</span>
            </button>
          </div>

          {/* Hero Highlight: Keuntungan Bersih (Laba Bersih Harian) */}
          <div className="bg-[#24140B] text-white rounded-3xl p-5 border border-[#3E2516] shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#F5C27D] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#F5C27D]" />
                KEUNTUNGAN BERSIH (LABA BERSIH)
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#3D2314] text-[#EADBCC] border border-[#C58940]/40 font-semibold">
                Laba Kotor - Kas Keluar
              </span>
            </div>

            <div
              className={`text-3xl font-extrabold font-sans tracking-tight mb-3 ${
                dailyRecap.netProfit >= 0 ? 'text-[#FAF3EB]' : 'text-rose-400'
              }`}
            >
              {formatRupiah(dailyRecap.netProfit)}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#3D2314] text-xs">
              <div className="bg-[#1A0E07]/60 p-2 rounded-xl">
                <span className="text-[10px] text-[#B8A495] block uppercase font-semibold">Omzet Penjualan</span>
                <span className="font-extrabold text-emerald-400 font-sans block text-sm">
                  {formatRupiah(dailyRecap.totalSales)}
                </span>
              </div>
              <div className="bg-[#1A0E07]/60 p-2 rounded-xl">
                <span className="text-[10px] text-[#B8A495] block uppercase font-semibold">Modal (HPP)</span>
                <span className="font-extrabold text-amber-300 font-sans block text-sm">
                  {formatRupiah(dailyRecap.totalCost)}
                </span>
              </div>
              <div className="bg-[#1A0E07]/60 p-2 rounded-xl">
                <span className="text-[10px] text-[#B8A495] block uppercase font-semibold">Kas Keluar</span>
                <span className="font-extrabold text-rose-300 font-sans block text-sm">
                  {formatRupiah(dailyRecap.totalExpenses)}
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Financial KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Laba Kotor */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                <TrendingUp className="w-4 h-4 text-[#C58940]" />
                <span>LABA KOTOR (GROSS)</span>
              </div>
              <div className="text-xl font-extrabold text-[#1C110A] font-sans">
                {formatRupiah(dailyRecap.grossProfit)}
              </div>
              <span className="text-[11px] text-[#7A6455] mt-1 block">
                Penjualan - Modal HPP
              </span>
            </div>

            {/* Saldo Kas Operasional */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A6455] mb-1">
                <DollarSign className="w-4 h-4 text-[#C58940]" />
                <span>SALDO KAS OPERASIONAL</span>
              </div>
              <div className="text-xl font-extrabold text-[#1C110A] font-sans">
                {formatRupiah(dailyRecap.netBalance)}
              </div>
              <span className="text-[11px] text-[#7A6455] mt-1 block">
                Uang Masuk - Kas Keluar
              </span>
            </div>
          </div>

          {/* Breakdown Section: Penjualan */}
          <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0E4D8] pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#24140B] font-serif flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#C58940]" />
                  <span>Rekap Penjualan ({dailyRecap.totalItemsSold} Pcs • {dailyRecap.totalTransactions} Trx)</span>
                </h4>
                <p className="text-[11px] text-[#7A6455]">
                  {dailySalesViewMode === 'grouped'
                    ? 'Kuantitas disatukan, lengkap dengan Modal & Keuntungan'
                    : 'Rincian transaksi diurutkan berdasarkan waktu'}
                </p>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex items-center bg-[#FAF3EB] p-1 rounded-xl border border-[#EADBCC] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDailySalesViewMode('grouped')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    dailySalesViewMode === 'grouped'
                      ? 'bg-[#24140B] text-[#FAF3EB] shadow-xs'
                      : 'text-[#7A6455] hover:text-[#24140B]'
                  }`}
                >
                  <Layers className="w-3 h-3 text-[#F5C27D]" />
                  <span>Per Produk ({dailyRecap.productSummaries.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDailySalesViewMode('transactions')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    dailySalesViewMode === 'transactions'
                      ? 'bg-[#24140B] text-[#FAF3EB] shadow-xs'
                      : 'text-[#7A6455] hover:text-[#24140B]'
                  }`}
                >
                  <span>Waktu Trx ({dailyRecap.sales.length})</span>
                </button>
              </div>
            </div>

            {dailyRecap.sales.length === 0 ? (
              <p className="text-xs text-[#7A6455] text-center py-5">
                Belum ada transaksi penjualan pada tanggal ini.
              </p>
            ) : dailySalesViewMode === 'grouped' ? (
              /* Grouped by product name */
              <div className="divide-y divide-gray-100">
                {dailyRecap.productSummaries.map((p, index) => (
                  <div key={p.product_name} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#FAF3EB] text-[#7A6455] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#EADBCC]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <strong className="text-sm font-bold text-[#1C110A] block truncate">
                          {p.product_name}
                        </strong>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#7A6455] mt-0.5 flex-wrap">
                          <span className="inline-block px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 font-semibold border border-amber-200">
                            {p.transactionCount}x transaksi
                          </span>
                          <span>• Modal: {formatRupiah(p.totalCost)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-1.5 mb-0.5">
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-[#24140B] text-[#FAF3EB] shadow-xs">
                          {p.totalQuantity} pcs
                        </span>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          +{formatRupiah(p.totalProfit)}
                        </span>
                      </div>
                      <div className="text-sm font-extrabold text-[#C58940]">
                        {formatRupiah(p.totalSales)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Chronological sales transactions */
              <div className="divide-y divide-gray-100 text-xs">
                {dailyRecap.sales.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-gray-500 mr-2 font-mono">
                        {formatTimeIndo(s.transaction_at)}
                      </span>
                      <strong className="text-[#1C110A] text-sm block sm:inline">
                        {s.product_name_snapshot}
                      </strong>
                      <div className="text-[11px] text-gray-500">
                        {s.quantity} pcs {s.items && s.items.length > 1 ? `(${s.items.length} item)` : `× ${formatRupiah(s.unit_price)}`}
                      </div>
                    </div>
                    <div className="text-right font-bold text-sm text-[#1C110A]">
                      {formatRupiah(s.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Breakdown Section: Kas Keluar */}
          <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-[#24140B] font-serif border-b pb-2">
              Rincian Kas Keluar ({dailyRecap.expenses.length} Catatan)
            </h4>

            {dailyRecap.expenses.length === 0 ? (
              <p className="text-xs text-[#7A6455] text-center py-4">
                Belum ada catatan kas keluar pada tanggal ini.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {dailyRecap.expenses.map((e) => (
                  <div key={e.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-gray-500 mr-2 font-mono">
                        {formatTimeIndo(e.transaction_at)}
                      </span>
                      <strong className="text-[#1C110A] text-sm block sm:inline">
                        {e.description}
                      </strong>
                    </div>
                    <div className="text-right font-bold text-sm text-rose-600">
                      {formatRupiah(e.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: REKAP BULANAN ===================== */}
      {activeSubTab === 'bulanan' && (
        <div className="space-y-4">
          {/* Month / Year Selector Header */}
          <div className="bg-white rounded-3xl p-4 border border-[#EADBCC] shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C58940]" />
              <div>
                <span className="text-[11px] font-bold text-[#7A6455] uppercase block">
                  Periode Rekap Bulanan
                </span>
                <span className="text-sm font-extrabold text-[#24140B]">
                  {monthlyRecap.monthName} {monthlyRecap.year}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="px-2 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-[#24140B] focus:outline-none"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-2 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-[#24140B] focus:outline-none"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Bagikan, Unduh PDF, Cetak */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white border border-[#EADBCC] text-[#24140B] font-bold text-xs hover:bg-[#FDF8F2] active:scale-95 transition shadow-sm"
            >
              <Share2 className="w-4 h-4 text-[#C58940]" />
              <span>Bagikan</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-[#24140B] text-white font-bold text-xs hover:bg-[#3E2516] active:scale-95 transition shadow-sm"
            >
              <Download className="w-4 h-4 text-[#F5C27D]" />
              <span>Unduh PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white border border-[#EADBCC] text-[#24140B] font-bold text-xs hover:bg-[#FDF8F2] active:scale-95 transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-[#C58940]" />
              <span>Cetak</span>
            </button>
          </div>

          {/* Hero Highlight: Keuntungan Bersih Bulanan (Laba Bersih) */}
          <div className="bg-[#24140B] text-white rounded-3xl p-5 border border-[#3E2516] shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#F5C27D] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#F5C27D]" />
                KEUNTUNGAN BERSIH BULAN {monthlyRecap.monthName.toUpperCase()}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#3D2314] text-[#EADBCC] border border-[#C58940]/40 font-semibold">
                Laba Kotor - Kas Keluar
              </span>
            </div>

            <div
              className={`text-3xl font-extrabold font-sans tracking-tight mb-3 ${
                monthlyRecap.netProfit >= 0 ? 'text-[#FAF3EB]' : 'text-rose-400'
              }`}
            >
              {formatRupiah(monthlyRecap.netProfit)}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#3D2314] text-xs">
              <div className="bg-[#1A0E07]/60 p-2 rounded-xl">
                <span className="text-[10px] text-[#B8A495] block uppercase font-semibold">Total Omzet</span>
                <span className="font-extrabold text-emerald-400 font-sans block text-sm">
                  {formatRupiah(monthlyRecap.totalSales)}
                </span>
              </div>
              <div className="bg-[#1A0E07]/60 p-2 rounded-xl">
                <span className="text-[10px] text-[#B8A495] block uppercase font-semibold">Total Modal (HPP)</span>
                <span className="font-extrabold text-amber-300 font-sans block text-sm">
                  {formatRupiah(monthlyRecap.totalCost)}
                </span>
              </div>
              <div className="bg-[#1A0E07]/60 p-2 rounded-xl">
                <span className="text-[10px] text-[#B8A495] block uppercase font-semibold">Total Kas Keluar</span>
                <span className="font-extrabold text-rose-300 font-sans block text-sm">
                  {formatRupiah(monthlyRecap.totalExpenses)}
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Financial KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Laba Kotor Bulanan */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                <TrendingUp className="w-4 h-4 text-[#C58940]" />
                <span>LABA KOTOR BULANAN</span>
              </div>
              <div className="text-xl font-extrabold text-[#1C110A] font-sans">
                {formatRupiah(monthlyRecap.grossProfit)}
              </div>
              <span className="text-[11px] text-[#7A6455] mt-1 block">
                Total Omzet - Modal HPP
              </span>
            </div>

            {/* Saldo Kas Operasional Bulanan */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A6455] mb-1">
                <DollarSign className="w-4 h-4 text-[#C58940]" />
                <span>SALDO KAS BULANAN</span>
              </div>
              <div className="text-xl font-extrabold text-[#1C110A] font-sans">
                {formatRupiah(monthlyRecap.netBalance)}
              </div>
              <span className="text-[11px] text-[#7A6455] mt-1 block">
                Omzet - Kas Keluar
              </span>
            </div>
          </div>

          {/* Tabel Ringkasan Per Hari */}
          <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-sm space-y-3 overflow-hidden">
            <h4 className="text-sm font-bold text-[#24140B] font-serif border-b pb-2">
              Tabel Rekap Harian ({monthlyRecap.monthName} {monthlyRecap.year})
            </h4>

            {monthlyRecap.totalTransactions === 0 && monthlyRecap.expenses.length === 0 ? (
              <p className="text-xs text-[#7A6455] text-center py-6">
                Belum ada data pada bulan ini ({monthlyRecap.monthName} {monthlyRecap.year}).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EADBCC] text-[#7A6455]">
                      <th className="py-2.5 px-2 font-bold">Tanggal</th>
                      <th className="py-2.5 px-2 font-bold text-right">Penjualan</th>
                      <th className="py-2.5 px-2 font-bold text-right">Modal HPP</th>
                      <th className="py-2.5 px-2 font-bold text-right">Kas Keluar</th>
                      <th className="py-2.5 px-2 font-bold text-right">Laba Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyRecap.dailySummaries
                      .filter((d) => d.totalSales > 0 || d.totalExpenses > 0)
                      .map((day) => (
                        <tr key={day.date} className="hover:bg-[#FDF8F2]/60">
                          <td className="py-2.5 px-2 font-semibold text-[#1C110A] whitespace-nowrap">
                            {day.formattedDay}
                            {day.transactionCount > 0 && (
                              <span className="text-[10px] text-gray-500 block">
                                {day.transactionCount} trx
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 font-bold text-emerald-800 text-right whitespace-nowrap">
                            {formatRupiah(day.totalSales)}
                          </td>
                          <td className="py-2.5 px-2 font-medium text-gray-600 text-right whitespace-nowrap">
                            {formatRupiah(day.totalCost)}
                          </td>
                          <td className="py-2.5 px-2 font-bold text-rose-700 text-right whitespace-nowrap">
                            {formatRupiah(day.totalExpenses)}
                          </td>
                          <td
                            className={`py-2.5 px-2 font-extrabold text-right whitespace-nowrap ${
                              day.netProfit >= 0 ? 'text-[#24140B]' : 'text-rose-600'
                            }`}
                          >
                            {formatRupiah(day.netProfit)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rekap Produk Terjual Bulan Ini (Kuantitas Disatukan) */}
          {monthlyRecap.productSummaries.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h4 className="text-sm font-bold text-[#24140B] font-serif flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#C58940]" />
                    <span>Rekap Produk Terjual Bulan Ini</span>
                  </h4>
                  <p className="text-[11px] text-[#7A6455]">
                    Total kuantiti produk yang sama digabung selama {monthlyRecap.monthName} {monthlyRecap.year}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FAF3EB] text-[#C58940] border border-[#EADBCC]">
                  {monthlyRecap.productSummaries.length} Menu
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {monthlyRecap.productSummaries.map((p, index) => (
                  <div key={p.product_name} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-[#FAF3EB] text-[#7A6455] font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#EADBCC]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <strong className="text-sm font-bold text-[#1C110A] block truncate">
                          {p.product_name}
                        </strong>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#7A6455] mt-0.5 flex-wrap">
                          <span>{p.transactionCount}x transaksi</span>
                          <span>• Modal: {formatRupiah(p.totalCost)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-1 mb-0.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#24140B] text-white">
                          {p.totalQuantity} pcs
                        </span>
                        <span className="text-xs font-extrabold px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          +{formatRupiah(p.totalProfit)}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-[#C58940]">
                        {formatRupiah(p.totalSales)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cadangkan & Pulihkan Data (Khusus Ganti Gadget / Cadangan Rutin) */}
      <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-sm space-y-3">
        <div className="flex items-center gap-2.5 border-b border-[#F0E4D8] pb-3">
          <div className="w-9 h-9 rounded-xl bg-[#24140B] text-[#F5C27D] flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#24140B] font-serif leading-tight">
              Cadangkan &amp; Pindah Gadget
            </h4>
            <p className="text-xs text-[#7A6455]">
              Simpan &amp; pulihkan data jika ganti HP / browser
            </p>
          </div>
        </div>

        <p className="text-xs text-[#4A382C] leading-relaxed">
          Ingin pindah HP? Tekan <strong>Unduh Cadangan</strong> di HP lama, kirim file ke HP baru (lewat WhatsApp / Drive), lalu di HP baru tekan <strong>Pulihkan Data</strong>.
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-[#24140B] text-white font-bold text-xs hover:bg-[#3E2516] active:scale-95 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-[#F5C27D]" />
            <span>Unduh Cadangan</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerImport}
            disabled={isRestoring}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white border border-[#C58940] text-[#24140B] font-bold text-xs hover:bg-[#FDF8F2] active:scale-95 transition shadow-sm disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-[#C58940]" />
            <span>{isRestoring ? 'Memulihkan...' : 'Pulihkan Data'}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
