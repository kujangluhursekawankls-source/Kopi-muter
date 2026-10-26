import { Expense, Product, QrisData, Sale, SaleItem, SyncQueueItem, SyncState } from '../types';
import {
  dbAddToSyncQueue,
  dbClearSyncQueue,
  dbGetAllExpenses,
  dbGetAllProducts,
  dbGetAllSales,
  dbGetQris,
  dbGetSyncQueue,
  dbRemoveFromSyncQueue,
  dbSetQris,
  dbUpsertExpense,
  dbUpsertProduct,
  dbUpsertSale,
} from './db';
import { generateId } from '../utils/formatters';

type SyncListener = (state: SyncState) => void;
type DataListener = () => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private dataListeners: Set<DataListener> = new Set();
  private isSyncing = false;
  private intervalId: any = null;

  private state: SyncState = {
    status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateState({ status: 'pending' });
        this.syncNow();
      });

      window.addEventListener('offline', () => {
        this.updateState({ status: 'offline' });
      });

      // Periodic sync every 15s
      this.intervalId = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncNow();
        }
      }, 15000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeData(listener: DataListener): () => void {
    this.dataListeners.add(listener);
    return () => {
      this.dataListeners.delete(listener);
    };
  }

  private notifyDataChange() {
    for (const listener of this.dataListeners) {
      try {
        listener();
      } catch (err) {
        console.error('Data listener error', err);
      }
    }
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Sync listener error', err);
      }
    }
  }

  public getState(): SyncState {
    return this.state;
  }

  public async getPendingCount(): Promise<number> {
    try {
      const queue = await dbGetSyncQueue();
      return queue.length;
    } catch {
      return 0;
    }
  }

  // Two-way synchronization
  public async syncNow(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const count = await this.getPendingCount();
      this.updateState({ status: 'offline', pendingCount: count });
      return false;
    }

    if (this.isSyncing) return false;

    this.isSyncing = true;
    this.updateState({ status: 'syncing' });

    try {
      const queue = await dbGetSyncQueue();

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-purikopi-store': 'puri-kopi-central',
        },
        body: JSON.stringify({
          queue,
          clientTimestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      // Clear processed queue
      for (const item of queue) {
        await dbRemoveFromSyncQueue(item.id);
      }

      // Reconcile server data into IndexedDB
      if (Array.isArray(result.products)) {
        for (const p of result.products) {
          await dbUpsertProduct(p);
        }
      }

      if (Array.isArray(result.sales)) {
        for (const s of result.sales) {
          await dbUpsertSale(s);
        }
      }

      if (Array.isArray(result.expenses)) {
        for (const e of result.expenses) {
          await dbUpsertExpense(e);
        }
      }

      if (result.qris !== undefined) {
        const localQris = await dbGetQris();
        if (result.qris) {
          if (!localQris || !localQris.updatedAt || new Date(result.qris.updatedAt) >= new Date(localQris.updatedAt)) {
            await dbSetQris(result.qris);
          }
        }
      }

      const remainingQueue = await dbGetSyncQueue();

      this.updateState({
        status: remainingQueue.length > 0 ? 'pending' : 'synced',
        pendingCount: remainingQueue.length,
        lastSyncedAt: result.serverTime || new Date().toISOString(),
        errorMessage: undefined,
      });

      this.notifyDataChange();
      return true;
    } catch (err: any) {
      console.warn('Sync error:', err);
      const remainingCount = await this.getPendingCount();
      const isStillOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      this.updateState({
        status: isStillOffline ? 'offline' : 'error',
        pendingCount: remainingCount,
        errorMessage: err.message || 'Gagal menyinkronkan data dengan server',
      });
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // --- CRUD METHODS FOR PRODUCTS ---
  public async addProduct(data: { name: string; price: number }): Promise<Product> {
    const now = new Date().toISOString();
    const product: Product = {
      id: generateId(),
      name: data.name.trim(),
      price: Math.max(0, data.price),
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    // Save to IndexedDB
    await dbUpsertProduct(product);

    // Queue for sync
    const queueItem: SyncQueueItem = {
      id: generateId(),
      entity: 'products',
      action: 'create',
      record_id: product.id,
      payload: product,
      timestamp: Date.now(),
      retry_count: 0,
    };
    await dbAddToSyncQueue(queueItem);

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
    return product;
  }

  public async updateProduct(product: Product): Promise<Product> {
    const updated: Product = {
      ...product,
      name: product.name.trim(),
      price: Math.max(0, product.price),
      updated_at: new Date().toISOString(),
      version: (product.version || 1) + 1,
    };

    await dbUpsertProduct(updated);

    const queueItem: SyncQueueItem = {
      id: generateId(),
      entity: 'products',
      action: 'update',
      record_id: updated.id,
      payload: updated,
      timestamp: Date.now(),
      retry_count: 0,
    };
    await dbAddToSyncQueue(queueItem);

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
    return updated;
  }

  public async deleteProduct(id: string): Promise<void> {
    const allProducts = await dbGetAllProducts(true);
    const existing = allProducts.find((p) => p.id === id);
    if (!existing) return;

    // Check if product is referenced in sales
    const allSales = await dbGetAllSales(true);
    const isReferencedInSales = allSales.some((s) => s.product_id === id);

    const now = new Date().toISOString();

    if (isReferencedInSales) {
      // Archive / Deactivate product to prevent corruption of past sales history
      const archived: Product = {
        ...existing,
        is_active: false,
        updated_at: now,
        version: (existing.version || 1) + 1,
      };
      await dbUpsertProduct(archived);

      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'products',
        action: 'update',
        record_id: id,
        payload: archived,
        timestamp: Date.now(),
        retry_count: 0,
      });
    } else {
      // Soft-delete with tombstone
      const softDeleted: Product = {
        ...existing,
        deleted_at: now,
        updated_at: now,
        version: (existing.version || 1) + 1,
      };
      await dbUpsertProduct(softDeleted);

      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'products',
        action: 'delete',
        record_id: id,
        payload: softDeleted,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
  }

  // --- CRUD METHODS FOR SALES ---
  public async addSale(data: {
    product_id: string | null;
    product_name_snapshot: string;
    unit_price: number;
    quantity: number;
    items?: SaleItem[];
    transaction_at?: string;
  }): Promise<Sale> {
    const now = new Date().toISOString();
    const qty = Math.max(1, data.quantity || 1);
    const price = Math.max(0, data.unit_price || 0);
    const calculatedTotal =
      data.items && data.items.length > 0
        ? data.items.reduce((sum, item) => sum + (item.total || 0), 0)
        : price * qty;

    const sale: Sale = {
      id: generateId(),
      product_id: data.product_id,
      product_name_snapshot: data.product_name_snapshot.trim(),
      unit_price: price,
      quantity: qty,
      total: calculatedTotal,
      items: data.items && data.items.length > 0 ? data.items : undefined,
      transaction_at: data.transaction_at || now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    await dbUpsertSale(sale);

    await dbAddToSyncQueue({
      id: generateId(),
      entity: 'sales',
      action: 'create',
      record_id: sale.id,
      payload: sale,
      timestamp: Date.now(),
      retry_count: 0,
    });

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
    return sale;
  }

  public async updateSale(sale: Sale): Promise<Sale> {
    const qty = Math.max(1, sale.quantity || 1);
    const price = Math.max(0, sale.unit_price || 0);
    const calculatedTotal =
      sale.items && sale.items.length > 0
        ? sale.items.reduce((sum, item) => sum + (item.total || 0), 0)
        : price * qty;

    const updated: Sale = {
      ...sale,
      product_name_snapshot: sale.product_name_snapshot.trim(),
      unit_price: price,
      quantity: qty,
      total: calculatedTotal,
      items: sale.items && sale.items.length > 0 ? sale.items : undefined,
      updated_at: new Date().toISOString(),
      version: (sale.version || 1) + 1,
    };

    await dbUpsertSale(updated);

    await dbAddToSyncQueue({
      id: generateId(),
      entity: 'sales',
      action: 'update',
      record_id: updated.id,
      payload: updated,
      timestamp: Date.now(),
      retry_count: 0,
    });

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
    return updated;
  }

  public async deleteSale(id: string): Promise<void> {
    const allSales = await dbGetAllSales(true);
    const existing = allSales.find((s) => s.id === id);
    if (!existing) return;

    const now = new Date().toISOString();
    const deleted: Sale = {
      ...existing,
      deleted_at: now,
      updated_at: now,
      version: (existing.version || 1) + 1,
    };

    await dbUpsertSale(deleted);

    await dbAddToSyncQueue({
      id: generateId(),
      entity: 'sales',
      action: 'delete',
      record_id: id,
      payload: deleted,
      timestamp: Date.now(),
      retry_count: 0,
    });

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
  }

  // --- CRUD METHODS FOR EXPENSES ---
  public async addExpense(data: {
    description: string;
    amount: number;
    transaction_at?: string;
  }): Promise<Expense> {
    const now = new Date().toISOString();
    const amount = Math.max(0, data.amount || 0);

    const expense: Expense = {
      id: generateId(),
      description: data.description.trim(),
      amount,
      transaction_at: data.transaction_at || now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    await dbUpsertExpense(expense);

    await dbAddToSyncQueue({
      id: generateId(),
      entity: 'expenses',
      action: 'create',
      record_id: expense.id,
      payload: expense,
      timestamp: Date.now(),
      retry_count: 0,
    });

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
    return expense;
  }

  public async updateExpense(expense: Expense): Promise<Expense> {
    const updated: Expense = {
      ...expense,
      description: expense.description.trim(),
      amount: Math.max(0, expense.amount || 0),
      updated_at: new Date().toISOString(),
      version: (expense.version || 1) + 1,
    };

    await dbUpsertExpense(updated);

    await dbAddToSyncQueue({
      id: generateId(),
      entity: 'expenses',
      action: 'update',
      record_id: updated.id,
      payload: updated,
      timestamp: Date.now(),
      retry_count: 0,
    });

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
    return updated;
  }

  public async deleteExpense(id: string): Promise<void> {
    const allExpenses = await dbGetAllExpenses(true);
    const existing = allExpenses.find((e) => e.id === id);
    if (!existing) return;

    const now = new Date().toISOString();
    const deleted: Expense = {
      ...existing,
      deleted_at: now,
      updated_at: now,
      version: (existing.version || 1) + 1,
    };

    await dbUpsertExpense(deleted);

    await dbAddToSyncQueue({
      id: generateId(),
      entity: 'expenses',
      action: 'delete',
      record_id: id,
      payload: deleted,
      timestamp: Date.now(),
      retry_count: 0,
    });

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
  }

  // --- QRIS METHODS ---
  public async saveQris(data: QrisData): Promise<void> {
    await dbSetQris(data);

    await dbAddToSyncQueue({
      id: generateId(),
      entity: 'qris',
      action: 'create',
      record_id: 'qris_data',
      payload: data,
      timestamp: Date.now(),
      retry_count: 0,
    });

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
  }

  public async deleteQris(): Promise<void> {
    await dbSetQris(null);

    await dbAddToSyncQueue({
      id: generateId(),
      entity: 'qris',
      action: 'delete',
      record_id: 'qris_data',
      payload: null,
      timestamp: Date.now(),
      retry_count: 0,
    });

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : 'pending',
      pendingCount,
    });

    this.notifyDataChange();
    this.syncNow();
  }
}

export const syncManager = new SyncManager();
