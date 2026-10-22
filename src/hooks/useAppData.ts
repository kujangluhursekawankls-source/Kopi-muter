import { useEffect, useState, useCallback } from 'react';
import { Expense, Product, Sale, SyncState } from '../types';
import { dbGetAllExpenses, dbGetAllProducts, dbGetAllSales } from '../services/db';
import { syncManager } from '../services/sync';

export function useAppData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getState());
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [prodList, salesList, expList] = await Promise.all([
        dbGetAllProducts(false),
        dbGetAllSales(false),
        dbGetAllExpenses(false),
      ]);
      setProducts(prodList);
      setSales(salesList);
      setExpenses(expList);
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
    async (data: { name: string; price: number }) => {
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
      quantity: number;
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

  const syncNow = useCallback(async () => {
    return syncManager.syncNow();
  }, []);

  return {
    products,
    sales,
    expenses,
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
    syncNow,
  };
}
