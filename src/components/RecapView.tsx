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
} from 'lucide-react';
import { Expense, Sale } from '../types';
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
  onOpenEditSale?: (sale: Sale) => void;
  onOpenEditExpense?: (expense: Expense) => void;
  onExportBackup?: () => Promise<boolean>;
  onImportBackup?: (json: string) => Promise<boolean>;
}

export const RecapView: React.FC<RecapViewProps> = ({
  sales,
  expenses,
  onExportBackup,
  onImportBackup,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'harian' | 'bulanan'>('harian');
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
  const dailyRecap = calculateDailyRecap(sales, expenses, selectedDate);
  const monthlyRecap = calculateMonthlyRecap(sales, expenses, selectedYear, selectedMonth);

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

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Omzet Penjualan */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>TOTAL PENJUALAN</span>
              </div>
              <div className="text-xl font-extrabold text-[#1C110A] font-sans">
                {formatRupiah(dailyRecap.totalSales)}
              </div>
              <span className="text-[11px] text-[#7A6455] mt-1 block">
                {dailyRecap.totalTransactions} Transaksi
              </span>
            </div>

            {/* Total Kas Keluar */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span>TOTAL KAS KELUAR</span>
              </div>
              <div className="text-xl font-extrabold text-[#1C110A] font-sans">
                {formatRupiah(dailyRecap.totalExpenses)}
              </div>
              <span className="text-[11px] text-[#7A6455] mt-1 block">
                {dailyRecap.expenses.length} Catatan Biaya
              </span>
            </div>

            {/* Saldo Bersih Operasional */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm col-span-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#C58940]">
                  <DollarSign className="w-4 h-4" />
                  <span>SALDO BERSIH OPERASIONAL</span>
                </div>
                <span className="text-[11px] text-[#7A6455]">
                  Penjualan - Kas Keluar
                </span>
              </div>
              <div
                className={`text-2xl font-extrabold font-sans ${
                  dailyRecap.netBalance >= 0 ? 'text-[#24140B]' : 'text-rose-600'
                }`}
              >
                {formatRupiah(dailyRecap.netBalance)}
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 text-xs text-[#7A6455]">
                <PackageCheck className="w-4 h-4 text-[#C58940]" />
                <span>
                  Total Barang Terjual:{' '}
                  <strong className="text-[#24140B]">{dailyRecap.totalItemsSold} pcs</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Section: Penjualan */}
          <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-[#24140B] font-serif border-b pb-2">
              Rincian Penjualan ({dailyRecap.sales.length} Trx)
            </h4>

            {dailyRecap.sales.length === 0 ? (
              <p className="text-xs text-[#7A6455] text-center py-4">
                Belum ada transaksi penjualan pada tanggal ini.
              </p>
            ) : (
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
                        {s.quantity} pcs × {formatRupiah(s.unit_price)}
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

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Omzet Penjualan Bulanan */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>TOTAL OMZET BULANAN</span>
              </div>
              <div className="text-xl font-extrabold text-[#1C110A] font-sans">
                {formatRupiah(monthlyRecap.totalSales)}
              </div>
              <span className="text-[11px] text-[#7A6455] mt-1 block">
                {monthlyRecap.totalTransactions} Transaksi
              </span>
            </div>

            {/* Total Kas Keluar Bulanan */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span>TOTAL KAS KELUAR</span>
              </div>
              <div className="text-xl font-extrabold text-[#1C110A] font-sans">
                {formatRupiah(monthlyRecap.totalExpenses)}
              </div>
              <span className="text-[11px] text-[#7A6455] mt-1 block">
                {monthlyRecap.expenses.length} Catatan Biaya
              </span>
            </div>

            {/* Saldo Bersih Bulanan */}
            <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm col-span-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#C58940]">
                  <DollarSign className="w-4 h-4" />
                  <span>SALDO BERSIH OPERASIONAL</span>
                </div>
                <span className="text-[11px] text-[#7A6455]">
                  Omzet - Kas Keluar
                </span>
              </div>
              <div
                className={`text-2xl font-extrabold font-sans ${
                  monthlyRecap.netBalance >= 0 ? 'text-[#24140B]' : 'text-rose-600'
                }`}
              >
                {formatRupiah(monthlyRecap.netBalance)}
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 text-xs text-[#7A6455]">
                <PackageCheck className="w-4 h-4 text-[#C58940]" />
                <span>
                  Total Barang Terjual:{' '}
                  <strong className="text-[#24140B]">{monthlyRecap.totalItemsSold} pcs</strong>
                </span>
              </div>
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
                      <th className="py-2.5 px-2 font-bold text-right">Kas Keluar</th>
                      <th className="py-2.5 px-2 font-bold text-right">Saldo Bersih</th>
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
                          <td className="py-2.5 px-2 font-bold text-rose-700 text-right whitespace-nowrap">
                            {formatRupiah(day.totalExpenses)}
                          </td>
                          <td
                            className={`py-2.5 px-2 font-extrabold text-right whitespace-nowrap ${
                              day.netBalance >= 0 ? 'text-[#24140B]' : 'text-rose-600'
                            }`}
                          >
                            {formatRupiah(day.netBalance)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
