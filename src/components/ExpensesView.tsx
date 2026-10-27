import React, { useState } from 'react';
import { ArrowDownRight, Plus, Search, Edit2, Trash2, Calendar, Clock, AlertCircle, Check } from 'lucide-react';
import { Expense } from '../types';
import { formatDateShortIndo, formatRupiah, formatTimeIndo, isSameDay, toDateInputValue } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (data: {
    description: string;
    amount: number;
    transaction_at?: string;
  }) => Promise<Expense>;
  onUpdateExpense: (expense: Expense) => Promise<Expense>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Date and search filters
  const [filterDate, setFilterDate] = useState<string>(toDateInputValue());
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal states
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const quickCategories = [
    'Beli Es Batu Balok / Termos',
    'Kulakan Kopi Sachet & Minuman',
    'Cup Plastik & Sedotan',
    'Kantong Kresek',
    'Bensin Keliling / Tambal Ban',
    'Air Galon / Air Panas',
    'Susu Kental Manis',
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetForm = () => {
    setDescription('');
    setAmount('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setFormError('Keterangan pengeluaran tidak boleh kosong.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Nominal pengeluaran harus berupa angka lebih besar dari Rp0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddExpense({
        description: trimmedDesc,
        amount: numAmount,
      });

      showToast(`Pengeluaran "${trimmedDesc}" sebesar ${formatRupiah(numAmount)} berhasil dicatat.`);
      handleResetForm();
    } catch (err: any) {
      setFormError(err.message || 'Gagal mencatat pengeluaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered expenses
  const filteredExpenses = expenses
    .filter((e) => {
      if (e.deleted_at) return false;
      const matchDate = isSameDay(e.transaction_at, filterDate);
      const matchQuery = e.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDate && matchQuery;
    })
    .sort((a, b) => new Date(b.transaction_at).getTime() - new Date(a.transaction_at).getTime());

  // Today's total expenses
  const todayDateStr = toDateInputValue();
  const todayTotalExpenses = expenses
    .filter((e) => !e.deleted_at && isSameDay(e.transaction_at, todayDateStr))
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Filtered date total expenses
  const filteredDateTotalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Edit Expense
  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setEditDesc(exp.description);
    setEditAmount(exp.amount.toString());

    const d = new Date(exp.transaction_at);
    const datePart = toDateInputValue(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    setEditDate(`${datePart}T${hours}:${mins}`);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    setEditError(null);

    const trimmedDesc = editDesc.trim();
    if (!trimmedDesc) {
      setEditError('Keterangan tidak boleh kosong.');
      return;
    }

    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditError('Nominal harus lebih dari 0.');
      return;
    }

    const targetDate = editDate ? new Date(editDate).toISOString() : editingExpense.transaction_at;

    try {
      await onUpdateExpense({
        ...editingExpense,
        description: trimmedDesc,
        amount: numAmount,
        transaction_at: targetDate,
      });

      showToast('Catatan kas keluar berhasil diperbarui.');
      setEditingExpense(null);
    } catch (err: any) {
      setEditError(err.message || 'Gagal menyimpan perubahan.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await onDeleteExpense(expenseToDelete.id);
      showToast('Catatan kas keluar berhasil dihapus.');
      setExpenseToDelete(null);
    } catch (err) {
      showToast('Gagal menghapus catatan kas keluar');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-18 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Card: Total Pengeluaran Hari Ini */}
      <div className="bg-[#24140B] text-white rounded-3xl p-5 shadow-sm border border-[#3E2516] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#D49B55] font-semibold tracking-wide uppercase block">
              Pengeluaran Hari Ini
            </span>
            <span className="text-xl font-extrabold text-[#FAF3EB] font-sans">
              {formatRupiah(todayTotalExpenses)}
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-[#A69383]">
          {expenses.filter((e) => !e.deleted_at && isSameDay(e.transaction_at, todayDateStr)).length} Catatan
        </div>
      </div>

      {/* Form Input Kas Keluar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EADBCC]">
        <div className="flex items-center gap-2.5 mb-4 border-b border-[#F0E4D8] pb-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#24140B] font-serif leading-tight">
              Catat Kas Keluar
            </h2>
            <p className="text-xs text-[#7A6455]">
              Pengeluaran biaya operasional jualan kopi keliling
            </p>
          </div>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#24140B] mb-1.5">
              Keterangan Pengeluaran <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Beli es batu kristal 2 bungkus"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-base text-[#1C110A] focus:outline-none focus:ring-2 focus:ring-[#C58940]"
            />

            {/* Quick helper tags */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[11px] text-[#7A6455] font-medium mr-1">Cepat:</span>
              {quickCategories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setDescription(cat)}
                  className="px-2.5 py-1 rounded-lg bg-[#FDF8F2] hover:bg-[#F0E4D8] text-[11px] font-semibold text-[#4A382C] border border-[#EADBCC] transition"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#24140B] mb-1.5">
              Nominal Pengeluaran (Rp) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              placeholder="Contoh: 75000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-base text-[#1C110A] focus:outline-none focus:ring-2 focus:ring-[#C58940]"
            />
            {amount && !isNaN(parseFloat(amount)) && (
              <span className="text-xs font-semibold text-rose-600 mt-1 block">
                Total: {formatRupiah(parseFloat(amount))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 min-h-[48px]"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 px-4 rounded-2xl bg-[#24140B] hover:bg-[#3E2516] text-white font-bold text-base transition shadow-md min-h-[48px] disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kas Keluar'}
            </button>
          </div>
        </form>
      </div>

      {/* Riwayat Kas Keluar Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#24140B] font-serif">
              Riwayat Kas Keluar
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#EADBCC] text-[#4A382C] font-bold">
              {filteredExpenses.length} Data
            </span>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-[#EADBCC] rounded-xl px-2.5 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-[#C58940]" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs font-bold text-[#24140B] bg-transparent focus:outline-none"
            />
          </div>
        </div>

        {/* Search input for descriptions */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari keterangan pengeluaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#EADBCC] text-xs text-[#1C110A] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#C58940]"
          />
        </div>

        {/* Total for Selected Date */}
        {filteredExpenses.length > 0 && (
          <div className="bg-rose-50/70 rounded-2xl p-3 border border-rose-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-800">
              Total Pengeluaran ({formatDateShortIndo(filterDate)}):
            </span>
            <span className="text-sm font-extrabold text-rose-700">
              {formatRupiah(filteredDateTotalExpenses)}
            </span>
          </div>
        )}

        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center border border-[#EADBCC]">
            <p className="text-sm text-[#7A6455]">
              {searchQuery
                ? `Tidak ada pengeluaran yang cocok dengan "${searchQuery}".`
                : `Belum ada catatan kas keluar pada tanggal ini (${formatDateShortIndo(filterDate)}).`}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[#7A6455] mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#C58940]" />
                    <span>{formatTimeIndo(exp.transaction_at)}</span>
                  </div>

                  <h4 className="text-base font-bold text-[#1C110A] truncate leading-tight">
                    {exp.description}
                  </h4>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="text-base font-extrabold text-rose-600 mb-2 font-sans">
                    {formatRupiah(exp.amount)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(exp)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-[#24140B] hover:bg-gray-100"
                      title="Edit Pengeluaran"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseToDelete(exp)}
                      className="p-1.5 rounded-lg border border-rose-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      title="Hapus Pengeluaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#EADBCC]">
            <h3 className="text-lg font-bold text-[#24140B] font-serif mb-4">
              Edit Kas Keluar
            </h3>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#24140B] mb-1">
                  Keterangan Pengeluaran
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24140B] mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  min="0"
                  step="any"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24140B] mb-1">
                  Tanggal &amp; Waktu Transaksi
                </label>
                <input
                  type="datetime-local"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#24140B] text-white font-bold text-sm hover:bg-[#3E2516]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!expenseToDelete}
        title="Hapus Catatan Kas Keluar?"
        message={`Apakah Anda yakin ingin menghapus catatan pengeluaran "${expenseToDelete?.description}" sebesar ${formatRupiah(
          expenseToDelete?.amount || 0
        )}? Saldo bersih dan seluruh laporan akan otomatis dihitung ulang.`}
        confirmLabel="Hapus Kas Keluar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
};
