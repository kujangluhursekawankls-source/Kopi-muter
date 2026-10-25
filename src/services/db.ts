import { Expense, Product, QrisData, Sale, SyncQueueItem } from '../types';

const DB_NAME = 'purikopi_indexed_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('is_active', 'is_active', { unique: false });
        productStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Sales store
      if (!db.objectStoreNames.contains('sales')) {
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('transaction_at', 'transaction_at', { unique: false });
        salesStore.createIndex('deleted_at', 'deleted_at', { unique: false });
      }

      // Expenses store
      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('transaction_at', 'transaction_at', { unique: false });
        expenseStore.createIndex('deleted_at', 'deleted_at', { unique: false });
      }

      // Sync Queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Key-Value metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// Generic transaction helpers
async function executeTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    
    let req: IDBRequest<T> | void;
    try {
      req = operation(store);
    } catch (err) {
      reject(err);
      return;
    }

    if (req) {
      req.onsuccess = () => resolve(req!.result);
      req.onerror = () => reject(req!.error);
    } else {
      transaction.oncomplete = () => resolve(undefined as unknown as T);
    }

    transaction.onerror = () => reject(transaction.error);
  });
}

// PRODUCTS
export async function dbGetAllProducts(includeDeleted = false): Promise<Product[]> {
  const all = await executeTransaction<Product[]>('products', 'readonly', (store) => store.getAll());
  if (includeDeleted) return all;
  return all.filter((p) => !p.deleted_at);
}

export async function dbGetProduct(id: string): Promise<Product | undefined> {
  return executeTransaction<Product>('products', 'readonly', (store) => store.get(id));
}

export async function dbUpsertProduct(product: Product): Promise<void> {
  await executeTransaction('products', 'readwrite', (store) => {
    store.put(product);
  });
}

// SALES
export async function dbGetAllSales(includeDeleted = false): Promise<Sale[]> {
  const all = await executeTransaction<Sale[]>('sales', 'readonly', (store) => store.getAll());
  if (includeDeleted) return all;
  return all.filter((s) => !s.deleted_at);
}

export async function dbGetSale(id: string): Promise<Sale | undefined> {
  return executeTransaction<Sale>('sales', 'readonly', (store) => store.get(id));
}

export async function dbUpsertSale(sale: Sale): Promise<void> {
  await executeTransaction('sales', 'readwrite', (store) => {
    store.put(sale);
  });
}

// EXPENSES
export async function dbGetAllExpenses(includeDeleted = false): Promise<Expense[]> {
  const all = await executeTransaction<Expense[]>('expenses', 'readonly', (store) => store.getAll());
  if (includeDeleted) return all;
  return all.filter((e) => !e.deleted_at);
}

export async function dbGetExpense(id: string): Promise<Expense | undefined> {
  return executeTransaction<Expense>('expenses', 'readonly', (store) => store.get(id));
}

export async function dbUpsertExpense(expense: Expense): Promise<void> {
  await executeTransaction('expenses', 'readwrite', (store) => {
    store.put(expense);
  });
}

// SYNC QUEUE
export async function dbGetSyncQueue(): Promise<SyncQueueItem[]> {
  const items = await executeTransaction<SyncQueueItem[]>('sync_queue', 'readonly', (store) => store.getAll());
  return items.sort((a, b) => a.timestamp - b.timestamp);
}

export async function dbAddToSyncQueue(item: SyncQueueItem): Promise<void> {
  await executeTransaction('sync_queue', 'readwrite', (store) => {
    store.put(item);
  });
}

export async function dbRemoveFromSyncQueue(id: string): Promise<void> {
  await executeTransaction('sync_queue', 'readwrite', (store) => {
    store.delete(id);
  });
}

export async function dbClearSyncQueue(): Promise<void> {
  await executeTransaction('sync_queue', 'readwrite', (store) => {
    store.clear();
  });
}

// METADATA
export async function dbGetMetadata(key: string): Promise<any> {
  const result = await executeTransaction<{ key: string; value: any }>('metadata', 'readonly', (store) => store.get(key));
  return result ? result.value : null;
}

export async function dbSetMetadata(key: string, value: any): Promise<void> {
  await executeTransaction('metadata', 'readwrite', (store) => {
    store.put({ key, value });
  });
}

// QRIS HELPERS
export async function dbGetQris(): Promise<QrisData | null> {
  return dbGetMetadata('qris_data');
}

export async function dbSetQris(data: QrisData | null): Promise<void> {
  return dbSetMetadata('qris_data', data);
}
