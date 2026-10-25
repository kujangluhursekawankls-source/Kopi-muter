import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  QrCode,
  X,
  Maximize2,
} from 'lucide-react';
import { Product, QrisData, Sale } from '../types';
import { formatDateTimeIndo, formatDateShortIndo, formatRupiah, formatTimeIndo, isSameDay, toDateInputValue } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface SalesViewProps {
  products: Product[];
  sales: Sale[];
  qrisData?: QrisData | null;
  onAddSale: (data: {
    product_id: string | null;
    product_name_snapshot: string;
    unit_price: number;
    quantity: number;
    transaction_at?: string;
  }) => Promise<Sale>;
  onUpdateSale: (sale: Sale) => Promise<Sale>;
  onDeleteSale: (id: string) => Promise<void>;
  onNavigateToProducts: () => void;
  onNavigateToQris?: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  products,
  sales,
  qrisData,
  onAddSale,
  onUpdateSale,
  onDeleteSale,
  onNavigateToProducts,
  onNavigateToQris,
}) => {
  // Active products only for new transactions
  const activeProducts = products.filter((p) => p.is_active);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [isQrisFullScreen, setIsQrisFullScreen] = useState(false);

  // History date filter (default today)
  const [filterDate, setFilterDate] = useState<string>(toDateInputValue());

  // Detail Modal state
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  // Edit Modal state
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  // Handle product dropdown selection
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    setFormError(null);

    const found = activeProducts.find((p) => p.id === prodId);
    if (found) {
      setSelectedProductName(found.name);
      setUnitPrice(found.price.toString());
    } else {
      setSelectedProductName('');
      setUnitPrice('');
    }
  };

  // Quantity helpers
  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  // Auto total calculation
  const currentPriceNum = parseFloat(unitPrice) || 0;
  const currentTotal = Math.max(0, currentPriceNum * quantity);

  // Form Reset
  const handleResetForm = () => {
    setSelectedProductId('');
    setSelectedProductName('');
    setUnitPrice('');
    setQuantity(1);
    setFormError(null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Form Submission
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProductId || !selectedProductName) {
      setFormError('Silakan pilih produk dari dropdown.');
      return;
    }

    const priceNum = parseFloat(unitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Harga transaksi harus berupa angka valid (minimal Rp0).');
      return;
    }

    if (!quantity || quantity <= 0) {
      setFormError('Jumlah barang harus minimal 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddSale({
        product_id: selectedProductId,
        product_name_snapshot: selectedProductName,
        unit_price: priceNum,
        quantity: quantity,
      });

      showToast(`Penjualan ${quantity}x "${selectedProductName}" berhasil dicatat.`);
      handleResetForm();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi penjualan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered sales history by date
  const filteredSales = sales
    .filter((s) => !s.deleted_at && isSameDay(s.transaction_at, filterDate))
    .sort((a, b) => new Date(b.transaction_at).getTime() - new Date(a.transaction_at).getTime());

  const todaySalesTotal = filteredSales.reduce((acc, curr) => acc + curr.total, 0);
  const todaySalesCount = filteredSales.length;

  // Open Edit Modal
  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setEditName(sale.product_name_snapshot);
    setEditPrice(sale.unit_price.toString());
    setEditQty(sale.quantity);
    // Format to datetime-local input string YYYY-MM-DDTHH:mm
    const d = new Date(sale.transaction_at);
    const datePart = toDateInputValue(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    setEditDate(`${datePart}T${hours}:${mins}`);
    setEditError(null);
  };

  const handleSaveEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    setEditError(null);

    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setEditError('Harga tidak valid.');
      return;
    }

    if (!editQty || editQty <= 0) {
      setEditError('Jumlah minimal 1.');
      return;
    }

    const targetDate = editDate ? new Date(editDate).toISOString() : editingSale.transaction_at;

    try {
      await onUpdateSale({
        ...editingSale,
        product_name_snapshot: editName.trim(),
        unit_price: priceNum,
        quantity: editQty,
        transaction_at: targetDate,
      });
      showToast('Transaksi berhasil diperbarui.');
      setEditingSale(null);
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui transaksi.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;
    try {
      await onDeleteSale(saleToDelete.id);
      showToast('Transaksi berhasil dihapus.');
      setSaleToDelete(null);
    } catch (err) {
      showToast('Gagal menghapus transaksi');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Input Penjualan Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EADBCC]">
        <div className="flex items-center gap-2.5 mb-4 border-b border-[#F0E4D8] pb-3">
          <div className="w-9 h-9 rounded-xl bg-[#24140B] text-[#F5C27D] flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#24140B] font-serif leading-tight">
              Catat Penjualan Baru
            </h2>
            <p className="text-xs text-[#7A6455]">
              Pilih minuman sachet / kopi dan tentukan jumlah pesanan
            </p>
          </div>
        </div>

        {/* Warning if no products available */}
        {activeProducts.length === 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
            <p className="text-sm font-semibold text-amber-900">
              Belum ada produk aktif. Tambahkan produk terlebih dahulu.
            </p>
            <button
              type="button"
              onClick={onNavigateToProducts}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#24140B] text-[#FAF3EB] text-xs font-bold hover:bg-[#3E2516] transition shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#F5C27D]" />
              <span>Buka Menu Daftar Produk</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitSale} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* 1. Nama Produk (Dropdown) */}
            <div>
              <label className="block text-sm font-bold text-[#24140B] mb-1.5">
                Nama Produk <span className="text-rose-600">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={handleProductChange}
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 bg-white text-base text-[#1C110A] focus:outline-none focus:ring-2 focus:ring-[#C58940] min-h-[50px]"
              >
                <option value="">-- Pilih Produk --</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatRupiah(p.price)})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Harga (Auto filled, editable for custom transaction) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-[#24140B]">
                  Harga Transaksi (Rp) <span className="text-rose-600">*</span>
                </label>
                <span className="text-[11px] text-[#7A6455]">
                  Dapat diedit khusus transaksi ini
                </span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="500"
                placeholder="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                disabled={!selectedProductId}
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-base text-[#1C110A] focus:outline-none focus:ring-2 focus:ring-[#C58940] disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            {/* 3. Jumlah */}
            <div>
              <label className="block text-sm font-bold text-[#24140B] mb-1.5">
                Jumlah (Pcs) <span className="text-rose-600">*</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={!selectedProductId || quantity <= 1}
                  className="w-12 h-12 rounded-2xl bg-[#F0E4D8] text-[#24140B] flex items-center justify-center font-bold text-lg hover:bg-[#EADBCC] active:scale-95 disabled:opacity-40 transition"
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(isNaN(val) || val < 1 ? 1 : val);
                  }}
                  disabled={!selectedProductId}
                  className="flex-1 text-center py-3 px-2 rounded-2xl border border-gray-300 text-lg font-bold text-[#1C110A] focus:outline-none focus:ring-2 focus:ring-[#C58940] disabled:bg-gray-100"
                />

                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={!selectedProductId}
                  className="w-12 h-12 rounded-2xl bg-[#24140B] text-[#F5C27D] flex items-center justify-center font-bold text-lg hover:bg-[#3E2516] active:scale-95 disabled:opacity-40 transition"
                  aria-label="Tambah jumlah"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* D. Perhitungan Otomatis: Total Transaksi Banner */}
            <div className="p-4 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#7A6455] uppercase tracking-wider block">
                  Total Transaksi
                </span>
                <span className="text-xs text-[#A69383]">
                  {quantity}x {unitPrice ? formatRupiah(currentPriceNum) : 'Rp0'}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-[#C58940]">
                {formatRupiah(currentTotal)}
              </div>
            </div>

            {/* Quick QRIS Button for Cashier Checkout */}
            <button
              type="button"
              onClick={() => setShowQrisModal(true)}
              className="w-full py-2.5 px-3 rounded-2xl bg-[#FAF3EB] hover:bg-[#F0E4D8] active:bg-[#EADBCC] border border-[#E0CFBD] text-[#24140B] text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm min-h-[44px]"
            >
              <QrCode className="w-4 h-4 text-[#C58940]" />
              <span>
                {qrisData?.imageUrl ? 'Tampilkan Barcode QRIS ke Pembeli' : 'Atur / Upload Barcode QRIS'}
              </span>
            </button>

            {/* E. Tombol dan Fungsi */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 py-3 px-4 rounded-2xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 active:bg-gray-100 transition min-h-[48px]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedProductId}
                className="flex-2 py-3 px-4 rounded-2xl bg-[#24140B] hover:bg-[#3E2516] active:bg-[#1A0E08] text-white font-bold text-base transition shadow-md min-h-[48px] disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Penjualan'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* F. Riwayat Penjualan Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#24140B] font-serif">
              Riwayat Penjualan
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#EADBCC] text-[#4A382C] font-bold">
              {todaySalesCount} Trx
            </span>
          </div>

          {/* Date Selector */}
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

        {/* Total Omzet Penjualan pada tanggal tersebut */}
        {filteredSales.length > 0 && (
          <div className="bg-[#FAF3EB] rounded-2xl p-3 border border-[#E6D7C7] flex items-center justify-between text-xs">
            <span className="font-semibold text-[#7A6455]">
              Total Penjualan ({formatDateShortIndo(filterDate)}):
            </span>
            <span className="text-sm font-extrabold text-[#24140B]">
              {formatRupiah(todaySalesTotal)}
            </span>
          </div>
        )}

        {filteredSales.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center border border-[#EADBCC]">
            <p className="text-sm text-[#7A6455]">
              Belum ada transaksi penjualan pada tanggal ini ({formatDateShortIndo(filterDate)}).
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[#7A6455] mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#C58940]" />
                    <span>{formatTimeIndo(sale.transaction_at)}</span>
                  </div>

                  <h4 className="text-base font-bold text-[#1C110A] truncate leading-tight">
                    {sale.product_name_snapshot}
                  </h4>

                  <div className="text-xs text-[#7A6455] mt-0.5">
                    {sale.quantity}x @ {formatRupiah(sale.unit_price)}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="text-base font-extrabold text-[#C58940] mb-2 font-sans">
                    {formatRupiah(sale.total)}
                  </div>

                  {/* Actions: Detail, Edit, Hapus */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDetailSale(sale)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                      title="Detail Transaksi"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(sale)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-[#24140B] hover:bg-gray-100"
                      title="Edit Transaksi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaleToDelete(sale)}
                      className="p-1.5 rounded-lg border border-rose-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      title="Hapus Transaksi"
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

      {/* Detail Modal */}
      {detailSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#EADBCC]">
            <h3 className="text-lg font-bold text-[#24140B] font-serif mb-4 border-b pb-2">
              Detail Transaksi Penjualan
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">ID Transaksi:</span>
                <span className="font-mono text-xs font-semibold">{detailSale.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Waktu Transaksi:</span>
                <span className="font-semibold">{formatDateTimeIndo(detailSale.transaction_at)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Produk:</span>
                <span className="font-bold text-[#24140B]">{detailSale.product_name_snapshot}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Harga Satuan:</span>
                <span className="font-semibold">{formatRupiah(detailSale.unit_price)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Jumlah:</span>
                <span className="font-semibold">{detailSale.quantity} pcs</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-200">
                <span className="font-bold text-[#24140B]">Total Transaksi:</span>
                <span className="font-extrabold text-lg text-[#C58940]">{formatRupiah(detailSale.total)}</span>
              </div>
            </div>
            <button
              onClick={() => setDetailSale(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#24140B] text-white font-semibold text-sm hover:bg-[#3E2516] transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#EADBCC]">
            <h3 className="text-lg font-bold text-[#24140B] font-serif mb-4">
              Edit Transaksi Penjualan
            </h3>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditSale} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#24140B] mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#24140B] mb-1">
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    min="0"
                    step="500"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24140B] mb-1">
                    Jumlah (Pcs)
                  </label>
                  <input
                    type="number"
                    value={editQty}
                    onChange={(e) => setEditQty(parseInt(e.target.value, 10) || 1)}
                    min="1"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm"
                    required
                  />
                </div>
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

              <div className="p-3 rounded-xl bg-[#FDF8F2] border border-[#EADBCC] flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-600">Total Baru:</span>
                <span className="font-bold text-base text-[#C58940]">
                  {formatRupiah((parseFloat(editPrice) || 0) * editQty)}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
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

      {/* QRIS Cashier Checkout Modal */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-[#EADBCC]">
            {qrisData?.imageUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                    <h3 className="text-base font-bold text-[#24140B] font-serif">
                      Bayar via QRIS
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrisModal(false)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Total tagihan banner */}
                <div className="bg-[#FAF3EB] rounded-2xl p-3 border border-[#EADBCC] text-center">
                  <span className="text-[11px] font-bold text-[#7A6455] uppercase block">
                    Total Tagihan Pembeli
                  </span>
                  <div className="text-2xl font-black text-[#C58940]">
                    {formatRupiah(currentTotal > 0 ? currentTotal : 0)}
                  </div>
                  {selectedProductName && (
                    <span className="text-xs text-[#24140B] font-semibold mt-0.5 block truncate">
                      {quantity}x {selectedProductName}
                    </span>
                  )}
                </div>

                {/* QRIS Barcode Image */}
                <div className="border-2 border-[#24140B] rounded-2xl p-3 bg-white text-center">
                  <div className="text-[10px] font-black tracking-widest text-red-600 uppercase mb-1">
                    QRIS Standar Pembayaran Nasional
                  </div>
                  <img
                    src={qrisData.imageUrl}
                    alt="Barcode QRIS"
                    className="w-full aspect-square object-contain mx-auto max-h-56"
                  />
                  <div className="text-xs font-extrabold text-[#24140B] uppercase mt-1">
                    {qrisData.merchantName || 'Puri Kopi Keliling'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsQrisFullScreen(true)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#C58940]" />
                    <span>Perbesar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQrisModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#24140B] text-white text-xs font-bold hover:bg-[#3D2314]"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#FAF3EB] text-[#C58940] flex items-center justify-center mx-auto border border-[#EADBCC]">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#24140B] font-serif">
                    Belum Ada Barcode QRIS
                  </h3>
                  <p className="text-xs text-[#7A6455] mt-1.5 px-2">
                    Unggah foto barcode QRIS Anda terlebih dahulu agar pembeli bisa scan pembayaran secara non-tunai.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQrisModal(false);
                      if (onNavigateToQris) onNavigateToQris();
                    }}
                    className="w-full py-3 rounded-2xl bg-[#24140B] text-white text-sm font-bold hover:bg-[#3D2314] shadow-md flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4 text-[#F5C27D]" />
                    <span>Upload QRIS Sekarang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQrisModal(false)}
                    className="w-full py-2.5 rounded-2xl border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Overlay for Scan */}
      {isQrisFullScreen && qrisData?.imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 safe-bottom animate-in fade-in">
          <div className="w-full flex items-center justify-between text-white max-w-sm pt-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#F5C27D] block">
                Total Tagihan: {formatRupiah(currentTotal > 0 ? currentTotal : 0)}
              </span>
              <h4 className="text-sm font-bold truncate">
                {qrisData.merchantName || 'Puri Kopi Keliling'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsQrisFullScreen(false)}
              className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center my-auto">
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
              <span className="text-xs font-black text-red-600 tracking-wider">
                QRIS
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                Standar Nasional
              </span>
            </div>
            <img
              src={qrisData.imageUrl}
              alt="QRIS Barcode"
              className="w-full aspect-square object-contain"
            />
            <div className="w-full text-center mt-2 pt-2 border-t border-gray-100">
              <div className="text-base font-black text-[#C58940]">
                {formatRupiah(currentTotal > 0 ? currentTotal : 0)}
              </div>
              <p className="text-[10px] text-gray-500">
                Arahkan kamera aplikasi bank/e-wallet ke kode QR ini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQrisFullScreen(false)}
            className="w-full max-w-xs py-3 rounded-2xl bg-white text-[#24140B] font-bold text-sm shadow-lg hover:bg-gray-100"
          >
            Tutup Layar Penuh
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!saleToDelete}
        title="Hapus Transaksi Penjualan?"
        message={`Apakah Anda yakin ingin menghapus catatan penjualan "${saleToDelete?.product_name_snapshot}" senilai ${formatRupiah(
          saleToDelete?.total || 0
        )}? Seluruh laporan rekap akan otomatis dihitung ulang.`}
        confirmLabel="Hapus Transaksi"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSaleToDelete(null)}
      />
    </div>
  );
};
