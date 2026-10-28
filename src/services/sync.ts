import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
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

function cleanForFirestore<T extends Record<string, any>>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object' ? cleanForFirestore(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = cleanForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private dataListeners: Set<DataListener> = new Set();
  private isSyncing = false;
  private isInitialized = false;
  private unsubscribeListeners: (() => void)[] = [];

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

      // Start initialization & Firestore listeners
      setTimeout(() => {
        this.init();
      }, 100);
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

  /**
   * Initializes real-time listeners with Cloud Firestore and migrates any existing local data.
   * This guarantees that:
   * 1. Data on this device is safely saved to Cloud Firestore.
   * 2. Any other device (or new phone) immediately downloads all existing store data in real time!
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      this.setupFirestoreListeners();
      await this.migrateLocalAndServerDataToFirestore();
      await this.syncNow();
    } catch (err) {
      console.warn('Initialization sync warning:', err);
    }
  }

  /**
   * Setup Real-time Listeners so updates from ANY device sync automatically
   */
  private setupFirestoreListeners() {
    // 1. Products listener
    try {
      const unsubProducts = onSnapshot(
        collection(db, 'products'),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            const data = change.doc.data() as Product;
            if (change.type === 'removed') {
              // mark deleted locally
              const existing = await dbGetAllProducts(true);
              const p = existing.find((item) => item.id === data.id);
              if (p) {
                await dbUpsertProduct({ ...p, deleted_at: new Date().toISOString() });
              }
            } else {
              await dbUpsertProduct(data);
            }
          });
          this.notifyDataChange();
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'products');
        }
      );
      this.unsubscribeListeners.push(unsubProducts);
    } catch (e) {
      console.error('Failed to attach products listener', e);
    }

    // 2. Sales listener
    try {
      const unsubSales = onSnapshot(
        collection(db, 'sales'),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            const data = change.doc.data() as Sale;
            if (change.type === 'removed') {
              const existing = await dbGetAllSales(true);
              const s = existing.find((item) => item.id === data.id);
              if (s) {
                await dbUpsertSale({ ...s, deleted_at: new Date().toISOString() });
              }
            } else {
              await dbUpsertSale(data);
            }
          });
          this.notifyDataChange();
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'sales');
        }
      );
      this.unsubscribeListeners.push(unsubSales);
    } catch (e) {
      console.error('Failed to attach sales listener', e);
    }

    // 3. Expenses listener
    try {
      const unsubExpenses = onSnapshot(
        collection(db, 'expenses'),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            const data = change.doc.data() as Expense;
            if (change.type === 'removed') {
              const existing = await dbGetAllExpenses(true);
              const ex = existing.find((item) => item.id === data.id);
              if (ex) {
                await dbUpsertExpense({ ...ex, deleted_at: new Date().toISOString() });
              }
            } else {
              await dbUpsertExpense(data);
            }
          });
          this.notifyDataChange();
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'expenses');
        }
      );
      this.unsubscribeListeners.push(unsubExpenses);
    } catch (e) {
      console.error('Failed to attach expenses listener', e);
    }

    // 4. Metadata (QRIS) listener
    try {
      const unsubMeta = onSnapshot(
        collection(db, 'metadata'),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            const data = change.doc.data();
            if (data.key === 'qris_data') {
              if (change.type === 'removed') {
                await dbSetQris(null);
              } else {
                const qris: QrisData = {
                  imageUrl: data.imageUrl || '',
                  merchantName: data.merchantName || '',
                  updatedAt: data.updatedAt || new Date().toISOString(),
                };
                await dbSetQris(qris);
              }
              this.notifyDataChange();
            }
          });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'metadata');
        }
      );
      this.unsubscribeListeners.push(unsubMeta);
    } catch (e) {
      console.error('Failed to attach metadata listener', e);
    }
  }

  /**
   * Migrate existing local data (IndexedDB & server JSON) into Cloud Firestore so no data is ever lost.
   */
  private async migrateLocalAndServerDataToFirestore() {
    try {
      // 1. Check local IndexedDB data
      const localProducts = await dbGetAllProducts(true);
      const localSales = await dbGetAllSales(true);
      const localExpenses = await dbGetAllExpenses(true);
      const localQris = await dbGetQris();

      for (const p of localProducts) {
        await setDoc(doc(db, 'products', p.id), cleanForFirestore(p), { merge: true });
      }
      for (const s of localSales) {
        await setDoc(doc(db, 'sales', s.id), cleanForFirestore(s), { merge: true });
      }
      for (const e of localExpenses) {
        await setDoc(doc(db, 'expenses', e.id), cleanForFirestore(e), { merge: true });
      }
      if (localQris && localQris.imageUrl) {
        await setDoc(
          doc(db, 'metadata', 'qris_data'),
          cleanForFirestore({
            key: 'qris_data',
            imageUrl: localQris.imageUrl,
            merchantName: localQris.merchantName || '',
            updatedAt: localQris.updatedAt || new Date().toISOString(),
          }),
          { merge: true }
        );
      }

      // 2. Also check if local server has prior container data in /api/data
      try {
        const resp = await fetch('/api/data');
        if (resp.ok) {
          const serverData = await resp.json();
          if (Array.isArray(serverData.products)) {
            for (const sp of serverData.products) {
              await setDoc(doc(db, 'products', sp.id), cleanForFirestore(sp), { merge: true });
              await dbUpsertProduct(sp);
            }
          }
          if (Array.isArray(serverData.sales)) {
            for (const ss of serverData.sales) {
              await setDoc(doc(db, 'sales', ss.id), cleanForFirestore(ss), { merge: true });
              await dbUpsertSale(ss);
            }
          }
          if (Array.isArray(serverData.expenses)) {
            for (const se of serverData.expenses) {
              await setDoc(doc(db, 'expenses', se.id), cleanForFirestore(se), { merge: true });
              await dbUpsertExpense(se);
            }
          }
          if (serverData.qris && serverData.qris.imageUrl) {
            await setDoc(
              doc(db, 'metadata', 'qris_data'),
              cleanForFirestore({
                key: 'qris_data',
                imageUrl: serverData.qris.imageUrl,
                merchantName: serverData.qris.merchantName || '',
                updatedAt: serverData.qris.updatedAt || new Date().toISOString(),
              }),
              { merge: true }
            );
            await dbSetQris(serverData.qris);
          }
        }
      } catch {
        // Server fetch is optional fallback
      }
    } catch (err) {
      console.warn('Migration to Firestore notice:', err);
    }
  }

  /**
   * Process pending sync queue and ensure bidirectional sync
   */
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

      for (const item of queue) {
        try {
          if (item.entity === 'products') {
            if (item.action === 'delete') {
              await setDoc(doc(db, 'products', item.record_id), cleanForFirestore(item.payload), { merge: true });
            } else {
              await setDoc(doc(db, 'products', item.record_id), cleanForFirestore(item.payload), { merge: true });
            }
          } else if (item.entity === 'sales') {
            if (item.action === 'delete') {
              await setDoc(doc(db, 'sales', item.record_id), cleanForFirestore(item.payload), { merge: true });
            } else {
              await setDoc(doc(db, 'sales', item.record_id), cleanForFirestore(item.payload), { merge: true });
            }
          } else if (item.entity === 'expenses') {
            if (item.action === 'delete') {
              await setDoc(doc(db, 'expenses', item.record_id), cleanForFirestore(item.payload), { merge: true });
            } else {
              await setDoc(doc(db, 'expenses', item.record_id), cleanForFirestore(item.payload), { merge: true });
            }
          } else if (item.entity === 'qris') {
            if (item.action === 'delete') {
              await deleteDoc(doc(db, 'metadata', 'qris_data'));
            } else if (item.payload) {
              await setDoc(
                doc(db, 'metadata', 'qris_data'),
                cleanForFirestore({
                  key: 'qris_data',
                  imageUrl: item.payload.imageUrl,
                  merchantName: item.payload.merchantName || '',
                  updatedAt: item.payload.updatedAt || new Date().toISOString(),
                }),
                { merge: true }
              );
            }
          }

          // Successfully pushed, remove from queue
          await dbRemoveFromSyncQueue(item.id);
        } catch (itemErr) {
          console.warn(`Failed to sync queue item ${item.id}:`, itemErr);
        }
      }

      // Also fetch current Firestore collections to guarantee local cache is complete
      const [prodSnap, salesSnap, expSnap, metaSnap] = await Promise.all([
        getDocs(collection(db, 'products')).catch(() => null),
        getDocs(collection(db, 'sales')).catch(() => null),
        getDocs(collection(db, 'expenses')).catch(() => null),
        getDocs(collection(db, 'metadata')).catch(() => null),
      ]);

      if (prodSnap) {
        for (const docSnap of prodSnap.docs) {
          await dbUpsertProduct(docSnap.data() as Product);
        }
      }
      if (salesSnap) {
        for (const docSnap of salesSnap.docs) {
          await dbUpsertSale(docSnap.data() as Sale);
        }
      }
      if (expSnap) {
        for (const docSnap of expSnap.docs) {
          await dbUpsertExpense(docSnap.data() as Expense);
        }
      }
      if (metaSnap) {
        for (const docSnap of metaSnap.docs) {
          const d = docSnap.data();
          if (d.key === 'qris_data') {
            await dbSetQris({
              imageUrl: d.imageUrl || '',
              merchantName: d.merchantName || '',
              updatedAt: d.updatedAt || new Date().toISOString(),
            });
          }
        }
      }

      const remainingQueue = await dbGetSyncQueue();

      this.updateState({
        status: remainingQueue.length > 0 ? 'pending' : 'synced',
        pendingCount: remainingQueue.length,
        lastSyncedAt: new Date().toISOString(),
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
        errorMessage: err.message || 'Gagal menyinkronkan data dengan Cloud Firestore',
      });
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // --- CRUD METHODS FOR PRODUCTS ---
  public async addProduct(data: { name: string; price: number; cost_price?: number }): Promise<Product> {
    const now = new Date().toISOString();
    const product: Product = {
      id: generateId(),
      name: data.name.trim(),
      price: Math.max(0, data.price),
      cost_price: Math.max(0, data.cost_price || 0),
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    // Save locally
    await dbUpsertProduct(product);

    // Try direct Cloud Firestore write
    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'products', product.id), cleanForFirestore(product));
      } else {
        throw new Error('Offline');
      }
    } catch {
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
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
    return product;
  }

  public async updateProduct(product: Product): Promise<Product> {
    const updated: Product = {
      ...product,
      name: product.name.trim(),
      price: Math.max(0, product.price),
      cost_price: Math.max(0, product.cost_price || 0),
      updated_at: new Date().toISOString(),
      version: (product.version || 1) + 1,
    };

    await dbUpsertProduct(updated);

    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'products', updated.id), cleanForFirestore(updated), { merge: true });
      } else {
        throw new Error('Offline');
      }
    } catch {
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
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
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

    const updatedProduct: Product = isReferencedInSales
      ? {
          ...existing,
          is_active: false,
          updated_at: now,
          version: (existing.version || 1) + 1,
        }
      : {
          ...existing,
          deleted_at: now,
          updated_at: now,
          version: (existing.version || 1) + 1,
        };

    await dbUpsertProduct(updatedProduct);

    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'products', id), cleanForFirestore(updatedProduct), { merge: true });
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'products',
        action: 'update',
        record_id: id,
        payload: updatedProduct,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
  }

  // --- CRUD METHODS FOR SALES ---
  public async addSale(data: {
    product_id: string | null;
    product_name_snapshot: string;
    unit_price: number;
    cost_price?: number;
    quantity: number;
    items?: SaleItem[];
    transaction_at?: string;
  }): Promise<Sale> {
    const now = new Date().toISOString();
    const qty = Math.max(1, data.quantity || 1);
    const price = Math.max(0, data.unit_price || 0);

    let itemsProcessed: SaleItem[] | undefined;
    let totalCost = 0;
    let calculatedTotal = 0;

    if (data.items && data.items.length > 0) {
      itemsProcessed = data.items.map((it) => {
        const itPrice = Math.max(0, it.unit_price || 0);
        const itCost = Math.max(0, it.cost_price || 0);
        const itQty = Math.max(1, it.quantity || 1);
        const itTot = it.total !== undefined ? it.total : itPrice * itQty;
        const itProfit = itTot - itCost * itQty;
        totalCost += itCost * itQty;
        calculatedTotal += itTot;
        return {
          ...it,
          unit_price: itPrice,
          cost_price: itCost,
          quantity: itQty,
          total: itTot,
          profit: itProfit,
        };
      });
    } else {
      const singleCost = Math.max(0, data.cost_price || 0);
      calculatedTotal = price * qty;
      totalCost = singleCost * qty;
    }

    const totalProfit = calculatedTotal - totalCost;

    const sale: Sale = {
      id: generateId(),
      product_id: data.product_id,
      product_name_snapshot: data.product_name_snapshot.trim(),
      unit_price: price,
      cost_price: totalCost,
      quantity: qty,
      total: calculatedTotal,
      profit: totalProfit,
      items: itemsProcessed,
      transaction_at: data.transaction_at || now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    await dbUpsertSale(sale);

    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'sales', sale.id), cleanForFirestore(sale));
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'sales',
        action: 'create',
        record_id: sale.id,
        payload: sale,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
    return sale;
  }

  public async updateSale(sale: Sale): Promise<Sale> {
    const qty = Math.max(1, sale.quantity || 1);
    const price = Math.max(0, sale.unit_price || 0);

    let itemsProcessed: SaleItem[] | undefined;
    let totalCost = 0;
    let calculatedTotal = 0;

    if (sale.items && sale.items.length > 0) {
      itemsProcessed = sale.items.map((it) => {
        const itPrice = Math.max(0, it.unit_price || 0);
        const itCost = Math.max(0, it.cost_price || 0);
        const itQty = Math.max(1, it.quantity || 1);
        const itTot = it.total !== undefined ? it.total : itPrice * itQty;
        const itProfit = itTot - itCost * itQty;
        totalCost += itCost * itQty;
        calculatedTotal += itTot;
        return {
          ...it,
          unit_price: itPrice,
          cost_price: itCost,
          quantity: itQty,
          total: itTot,
          profit: itProfit,
        };
      });
    } else {
      const singleCost = Math.max(0, sale.cost_price || 0);
      calculatedTotal = price * qty;
      totalCost = singleCost * qty;
    }

    const totalProfit = calculatedTotal - totalCost;

    const updated: Sale = {
      ...sale,
      product_name_snapshot: sale.product_name_snapshot.trim(),
      unit_price: price,
      cost_price: totalCost,
      quantity: qty,
      total: calculatedTotal,
      profit: totalProfit,
      items: itemsProcessed,
      updated_at: new Date().toISOString(),
      version: (sale.version || 1) + 1,
    };

    await dbUpsertSale(updated);

    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'sales', updated.id), cleanForFirestore(updated), { merge: true });
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'sales',
        action: 'update',
        record_id: updated.id,
        payload: updated,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
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

    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'sales', id), cleanForFirestore(deleted), { merge: true });
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'sales',
        action: 'delete',
        record_id: id,
        payload: deleted,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
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

    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'expenses', expense.id), cleanForFirestore(expense));
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'expenses',
        action: 'create',
        record_id: expense.id,
        payload: expense,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
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

    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'expenses', updated.id), cleanForFirestore(updated), { merge: true });
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'expenses',
        action: 'update',
        record_id: updated.id,
        payload: updated,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
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

    try {
      if (navigator.onLine) {
        await setDoc(doc(db, 'expenses', id), cleanForFirestore(deleted), { merge: true });
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'expenses',
        action: 'delete',
        record_id: id,
        payload: deleted,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
  }

  // --- QRIS METHODS ---
  public async saveQris(data: QrisData): Promise<void> {
    await dbSetQris(data);

    try {
      if (navigator.onLine) {
        await setDoc(
          doc(db, 'metadata', 'qris_data'),
          cleanForFirestore({
            key: 'qris_data',
            imageUrl: data.imageUrl,
            merchantName: data.merchantName || '',
            updatedAt: data.updatedAt || new Date().toISOString(),
          }),
          { merge: true }
        );
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'qris',
        action: 'create',
        record_id: 'qris_data',
        payload: data,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
  }

  public async deleteQris(): Promise<void> {
    await dbSetQris(null);

    try {
      if (navigator.onLine) {
        await deleteDoc(doc(db, 'metadata', 'qris_data'));
      } else {
        throw new Error('Offline');
      }
    } catch {
      await dbAddToSyncQueue({
        id: generateId(),
        entity: 'qris',
        action: 'delete',
        record_id: 'qris_data',
        payload: null,
        timestamp: Date.now(),
        retry_count: 0,
      });
    }

    const pendingCount = await this.getPendingCount();
    this.updateState({
      status: !navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : 'synced',
      pendingCount,
    });

    this.notifyDataChange();
  }
}

export const syncManager = new SyncManager();
