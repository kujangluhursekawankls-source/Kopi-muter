import { useEffect, useState, useCallback } from 'react';
import { Expense, Product, QrisData, Sale, SaleItem, SyncState } from '../types';
import {
  dbGetAllExpenses,
  dbGetAllProducts,
  dbGetAllSales,
  dbGetQris,
  dbUpsertExpense,
  dbUpsertProduct,
  dbUpsertSale,
} from '../services/db';
import { syncManager } from '../services/sync';

export function useAppData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [qrisData, setQrisData] = useState<QrisData | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getState());
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [prodList, salesList, expList, qris] = await Promise.all([
        dbGetAllProducts(false),
        dbGetAllSales(false),
        dbGetAllExpenses(false),
        dbGetQris(),
      ]);
      setProducts(prodList);
      setSales(salesList);
      setExpenses(expList);
      setQrisData(qris);
    } catch (err) {
      console.error('Failed to load local data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadData();

    // Subscribe to sync state changes
    const unsubSync = syncManager.subscribe((state) => {
      setSyncState(state);
    });

    // Subscribe to data changes (local modifications or server sync)
    const unsubData = syncManager.subscribeData(() => {
      loadData();
    });

    // Perform initial sync with server
    syncManager.syncNow();

    return () => {
      unsubSync();
      unsubData();
    };
  }, [loadData]);

  // Product actions
  const addProduct = useCallback(
    async (data: { name: string; price: number; cost_price?: number }) => {
      const res = await syncManager.addProduct(data);
      await loadData();
      return res;
    },
    [loadData]
  );

  const updateProduct = useCallback(
    async (product: Product) => {
      const res = await syncManager.updateProduct(product);
      await loadData();
      return res;
    },
    [loadData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await syncManager.deleteProduct(id);
      await loadData();
    },
    [loadData]
  );

  // Sales actions
  const addSale = useCallback(
    async (data: {
      product_id: string | null;
      product_name_snapshot: string;
      unit_price: number;
      cost_price?: number;
      quantity: number;
      items?: SaleItem[];
      transaction_at?: string;
    }) => {
      const res = await syncManager.addSale(data);
      await loadData();
      return res;
    },
    [loadData]
  );

  const updateSale = useCallback(
    async (sale: Sale) => {
      const res = await syncManager.updateSale(sale);
      await loadData();
      return res;
    },
    [loadData]
  );

  const deleteSale = useCallback(
    async (id: string) => {
      await syncManager.deleteSale(id);
      await loadData();
    },
    [loadData]
  );

  // Expense actions
  const addExpense = useCallback(
    async (data: {
      description: string;
      amount: number;
      transaction_at?: string;
    }) => {
      const res = await syncManager.addExpense(data);
      await loadData();
      return res;
    },
    [loadData]
  );

  const updateExpense = useCallback(
    async (expense: Expense) => {
      const res = await syncManager.updateExpense(expense);
      await loadData();
      return res;
    },
    [loadData]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      await syncManager.deleteExpense(id);
      await loadData();
    },
    [loadData]
  );

  // QRIS actions
  const saveQris = useCallback(
    async (data: QrisData) => {
      await syncManager.saveQris(data);
      await loadData();
    },
    [loadData]
  );

  const deleteQris = useCallback(async () => {
    await syncManager.deleteQris();
    await loadData();
  }, [loadData]);

  const exportBackup = useCallback(async () => {
    const [allProds, allSales, allExpenses, qris] = await Promise.all([
      dbGetAllProducts(true),
      dbGetAllSales(true),
      dbGetAllExpenses(true),
      dbGetQris(),
    ]);
    const data = {
      app: 'Puri Kopi',
      version: 2,
      exportedAt: new Date().toISOString(),
      products: allProds,
      sales: allSales,
      expenses: allExpenses,
      qris: qris || null,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PuriKopi-Cadangan-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }, []);

  const importBackup = useCallback(
    async (jsonString: string) => {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.products)) {
        throw new Error('Format file cadangan tidak valid.');
      }
      for (const p of data.products) {
        await dbUpsertProduct(p);
      }
      if (Array.isArray(data.sales)) {
        for (const s of data.sales) {
          await dbUpsertSale(s);
        }
      }
      if (Array.isArray(data.expenses)) {
        for (const e of data.expenses) {
          await dbUpsertExpense(e);
        }
      }
      if (data.qris && data.qris.imageUrl) {
        await syncManager.saveQris(data.qris);
      }
      await loadData();
      await syncManager.syncNow();
      return true;
    },
    [loadData]
  );

  const syncNow = useCallback(async () => {
    return syncManager.syncNow();
  }, []);

  return {
    products,
    sales,
    expenses,
    qrisData,
    syncState,
    isLoading,
    refreshData: loadData,
    addProduct,
    updateProduct,
    deleteProduct,
    addSale,
    updateSale,
    deleteSale,
    addExpense,
    updateExpense,
    deleteExpense,
    saveQris,
    deleteQris,
    exportBackup,
    importBackup,
    syncNow,
  };
}
