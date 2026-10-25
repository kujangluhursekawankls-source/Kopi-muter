export interface Product {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version?: number;
}

export interface Sale {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price: number;
  quantity: number;
  total: number;
  transaction_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version?: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  transaction_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version?: number;
}

export type SyncEntityType = 'products' | 'sales' | 'expenses' | 'qris';

export interface SyncQueueItem {
  id: string;
  entity: SyncEntityType;
  action: 'create' | 'update' | 'delete';
  record_id: string;
  payload: any;
  timestamp: number;
  retry_count: number;
}

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

export interface SyncState {
  status: SyncStatusType;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage?: string;
}

export interface DailyRecap {
  date: string;
  formattedDate: string;
  totalSales: number;
  totalTransactions: number;
  totalItemsSold: number;
  totalExpenses: number;
  netBalance: number;
  sales: Sale[];
  expenses: Expense[];
}

export interface DayRecapSummary {
  date: string;
  formattedDay: string;
  totalSales: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

export interface MonthlyRecap {
  year: number;
  month: number;
  monthName: string;
  totalSales: number;
  totalTransactions: number;
  totalItemsSold: number;
  totalExpenses: number;
  netBalance: number;
  dailySummaries: DayRecapSummary[];
  sales: Sale[];
  expenses: Expense[];
}

export interface QrisData {
  imageUrl: string;
  merchantName?: string;
  updatedAt: string;
}

export type ActiveTab = 'dashboard' | 'penjualan' | 'produk' | 'kas-keluar' | 'rekap' | 'qris';
