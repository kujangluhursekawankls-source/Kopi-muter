export interface Product {
  id: string;
  name: string;
  price: number; // Harga Jual
  cost_price?: number; // Harga Modal (HPP)
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version?: number;
}

export interface SaleItem {
  product_id: string | null;
  product_name_snapshot: string;
  unit_price: number; // Harga Jual snapshot
  cost_price?: number; // Harga Modal snapshot
  quantity: number;
  total: number;
  profit?: number; // (unit_price - cost_price) * quantity
}

export interface Sale {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price: number;
  cost_price?: number;
  quantity: number;
  total: number;
  profit?: number;
  items?: SaleItem[];
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

export interface ProductRecapSummary {
  product_name: string;
  totalQuantity: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  transactionCount: number;
  averagePrice: number;
}

export interface DailyRecap {
  date: string;
  formattedDate: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  totalTransactions: number;
  totalItemsSold: number;
  totalExpenses: number;
  netProfit: number; // Laba Kotor - Kas Keluar (Keuntungan Bersih)
  netBalance: number; // Total Penjualan - Kas Keluar (Saldo Kas Operasional)
  sales: Sale[];
  expenses: Expense[];
  productSummaries: ProductRecapSummary[];
}

export interface DayRecapSummary {
  date: string;
  formattedDay: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  netBalance: number;
  transactionCount: number;
}

export interface MonthlyRecap {
  year: number;
  month: number;
  monthName: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  totalTransactions: number;
  totalItemsSold: number;
  totalExpenses: number;
  netProfit: number; // Keuntungan Bersih Bulanan
  netBalance: number; // Saldo Kas Masuk - Keluar
  dailySummaries: DayRecapSummary[];
  sales: Sale[];
  expenses: Expense[];
  productSummaries: ProductRecapSummary[];
}

export interface QrisData {
  imageUrl: string;
  merchantName?: string;
  updatedAt: string;
}

export type ActiveTab = 'dashboard' | 'penjualan' | 'produk' | 'kas-keluar' | 'rekap' | 'qris';

