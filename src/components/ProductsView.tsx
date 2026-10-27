import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Power, AlertCircle, Check } from 'lucide-react';
import { Product, Sale } from '../types';
import { formatRupiah } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface ProductsViewProps {
  products: Product[];
  sales: Sale[];
  onAddProduct: (data: { name: string; price: number; cost_price?: number }) => Promise<Product>;
  onUpdateProduct: (product: Product) => Promise<Product>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  sales,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCostPrice('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setPrice(p.price.toString());
    setCostPrice(p.cost_price !== undefined ? p.cost_price.toString() : '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Nama produk wajib diisi.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Harga jual harus berupa angka valid (minimal Rp0).');
      return;
    }

    const numCost = costPrice.trim() !== '' ? parseFloat(costPrice) : 0;
    if (isNaN(numCost) || numCost < 0) {
      setFormError('Harga modal (HPP) harus berupa angka valid (minimal Rp0).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await onUpdateProduct({
          ...editingProduct,
          name: trimmedName,
          price: numPrice,
          cost_price: numCost,
        });
        showToast(`Produk "${trimmedName}" berhasil diperbarui.`);
      } else {
        await onAddProduct({
          name: trimmedName,
          price: numPrice,
          cost_price: numCost,
        });
        showToast(`Produk "${trimmedName}" berhasil ditambahkan.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan produk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  const handleToggleActive = async (p: Product) => {
    try {
      const updated = { ...p, is_active: !p.is_active };
      await onUpdateProduct(updated);
      showToast(
        `Produk "${p.name}" ${updated.is_active ? 'diaktifkan kembali' : 'dinonaktifkan'}.`
      );
    } catch (err: any) {
      showToast('Gagal mengubah status produk');
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const pName = productToDelete.name;
      await onDeleteProduct(productToDelete.id);
      showToast(`Produk "${pName}" berhasil dihapus / dinonaktifkan.`);
      setProductToDelete(null);
    } catch (err) {
      showToast('Gagal menghapus produk');
    }
  };

  const isProductInSales = (prodId: string) => {
    return sales.some((s) => {
      if (s.deleted_at) return false;
      if (s.product_id === prodId) return true;
      if (s.items && s.items.some((it) => it.product_id === prodId)) return true;
      return false;
    });
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-18 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top action header: Search & Add button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#EADBCC] text-base text-[#1C110A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C58940] shadow-sm"
          />
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-[#24140B] hover:bg-[#3E2516] active:bg-[#1A0E08] text-white font-bold text-sm shadow-md transition whitespace-nowrap min-h-[48px]"
        >
          <Plus className="w-5 h-5 text-[#F5C27D]" />
          <span>Tambah</span>
        </button>
      </div>

      {/* Product List Count */}
      <div className="flex items-center justify-between text-xs font-semibold text-[#7A6455] px-1">
        <span>TOTAL PRODUK: {filteredProducts.length}</span>
        <span>
          {products.filter((p) => p.is_active).length} Aktif •{' '}
          {products.filter((p) => !p.is_active).length} Nonaktif
        </span>
      </div>

      {/* Product Cards List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#EADBCC] shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FDF8F2] border border-[#EADBCC] flex items-center justify-center mx-auto mb-3 text-3xl">
            ☕
          </div>
          <h3 className="text-lg font-bold text-[#24140B] font-serif mb-1">
            {searchQuery ? 'Produk Tidak Ditemukan' : 'Belum Ada Produk'}
          </h3>
          <p className="text-sm text-[#7A6455] mb-5 max-w-xs mx-auto">
            {searchQuery
              ? `Tidak ada produk dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
              : 'Daftar produk masih kosong. Tambahkan produk untuk memulai pencatatan kasir.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#C58940] hover:bg-[#D49B55] text-white font-bold text-sm shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const hasSalesHistory = isProductInSales(product.id);

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl p-4 border transition shadow-sm ${
                  product.is_active
                    ? 'border-[#EADBCC]'
                    : 'border-gray-200 bg-gray-50/70 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h4 className="text-base font-bold text-[#1C110A] truncate">
                        {product.name}
                      </h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          product.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {product.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                      <div>
                        <span className="text-[10px] text-[#7A6455] font-semibold block uppercase">Harga Jual</span>
                        <span className="text-lg font-extrabold text-[#C58940] font-sans">
                          {formatRupiah(product.price)}
                        </span>
                      </div>

                      <div className="border-l border-gray-200 pl-2">
                        <span className="text-[10px] text-[#7A6455] font-semibold block uppercase">Modal (HPP)</span>
                        <span className="text-sm font-bold text-gray-600 font-sans">
                          {formatRupiah(product.cost_price || 0)}
                        </span>
                      </div>

                      <div className="border-l border-gray-200 pl-2">
                        <span className="text-[10px] text-[#7A6455] font-semibold block uppercase">Untung / Cup</span>
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block font-sans">
                          +{formatRupiah(product.price - (product.cost_price || 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit, Toggle Active, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(product)}
                      className={`p-2.5 rounded-xl border transition ${
                        product.is_active
                          ? 'border-gray-200 text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={product.is_active ? 'Nonaktifkan produk' : 'Aktifkan produk'}
                      aria-label="Toggle status aktif"
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:text-[#24140B] hover:bg-gray-100 transition"
                      title="Edit produk"
                      aria-label="Edit produk"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="p-2.5 rounded-xl border border-rose-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                      title="Hapus atau nonaktifkan produk"
                      aria-label="Hapus produk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {hasSalesHistory && (
                  <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                    <span>* Memiliki riwayat transaksi penjualan</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#EADBCC]">
            <h3 className="text-xl font-bold text-[#24140B] font-serif mb-4">
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#24140B] mb-1.5">
                  Nama Produk <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Good Day Freeze Es / Tea Jus / Kapal Api"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-base text-[#1C110A] focus:outline-none focus:ring-2 focus:ring-[#C58940]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#24140B] mb-1">
                    Harga Modal / HPP (Rp)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Contoh: 2500"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    min="0"
                    step="500"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-base text-[#1C110A] focus:outline-none focus:ring-2 focus:ring-[#C58940]"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Modal sachet/cup
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24140B] mb-1">
                    Harga Jual (Rp) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Contoh: 5000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="500"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-base text-[#1C110A] focus:outline-none focus:ring-2 focus:ring-[#C58940]"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Harga ke pembeli
                  </span>
                </div>
              </div>

              {/* Live Margin Calculation Preview */}
              {(price !== '' || costPrice !== '') && (
                <div className="p-3 bg-[#FAF3EB] rounded-2xl border border-[#EADBCC] text-xs space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Harga Jual:</span>
                    <strong className="text-[#24140B]">{formatRupiah(parseFloat(price) || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Harga Modal (HPP):</span>
                    <span className="text-gray-700">{formatRupiah(parseFloat(costPrice) || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E6D7C7] font-bold text-emerald-800">
                    <span>Estimasi Untung Bersih:</span>
                    <span>+{formatRupiah((parseFloat(price) || 0) - (parseFloat(costPrice) || 0))} / cup</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 min-h-[46px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#24140B] hover:bg-[#3E2516] text-white font-bold text-sm transition min-h-[46px] shadow-sm disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Menyimpan...'
                    : editingProduct
                    ? 'Simpan Perubahan'
                    : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={!!productToDelete}
        title={
          productToDelete && isProductInSales(productToDelete.id)
            ? 'Arsipkan / Nonaktifkan Produk?'
            : 'Hapus Produk?'
        }
        message={
          productToDelete && isProductInSales(productToDelete.id)
            ? `Produk "${productToDelete.name}" sudah pernah digunakan dalam riwayat transaksi. Produk ini akan dinonaktifkan (diarsipkan) dan tidak dapat dipilih untuk penjualan baru, sehingga riwayat transaksi lama Anda tetap utuh.`
            : `Apakah Anda yakin ingin menghapus produk "${productToDelete?.name}"?`
        }
        confirmLabel={
          productToDelete && isProductInSales(productToDelete.id)
            ? 'Nonaktifkan'
            : 'Hapus Produk'
        }
        isDangerous={!(productToDelete && isProductInSales(productToDelete.id))}
        onConfirm={confirmDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};
