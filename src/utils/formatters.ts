import { DailyRecap, DayRecapSummary, Expense, MonthlyRecap, ProductRecapSummary, Sale } from '../types';

export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount || 0));
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(absVal);
  return `${isNegative ? '-' : ''}Rp${formatted}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function toDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateIndo(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateShortIndo(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTimeIndo(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateTimeIndo(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getMonthNamesIndo(): { value: number; label: string }[] {
  return [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];
}

export function isSameDay(dateStr1: string, dateStr2: string): boolean {
  if (!dateStr1 || !dateStr2) return false;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Aggregates all sales by product name.
 * If there are multiple transactions with the same product name (e.g. Kapal Api 3x),
 * their quantities and totals are unified together.
 */
export function aggregateProductSales(sales: Sale[]): ProductRecapSummary[] {
  const map = new Map<
    string,
    {
      product_name: string;
      totalQuantity: number;
      totalSales: number;
      saleIds: Set<string>;
    }
  >();

  for (const s of sales) {
    if (s.deleted_at) continue;

    // Check if this sale has multi-item list or legacy single item
    const items =
      s.items && s.items.length > 0
        ? s.items
        : [
            {
              product_id: s.product_id,
              product_name_snapshot: s.product_name_snapshot,
              unit_price: s.unit_price,
              quantity: s.quantity,
              total: s.total,
            },
          ];

    for (const it of items) {
      const trimmedName = (it.product_name_snapshot || 'Produk Tanpa Nama').trim();
      const key = trimmedName.toLowerCase();
      const qty = Math.max(0, it.quantity || 0);
      const subtotal = it.total !== undefined ? it.total : (it.unit_price || 0) * qty;

      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += qty;
        existing.totalSales += subtotal;
        existing.saleIds.add(s.id);
      } else {
        map.set(key, {
          product_name: trimmedName,
          totalQuantity: qty,
          totalSales: subtotal,
          saleIds: new Set([s.id]),
        });
      }
    }
  }

  // Convert map to sorted array by total quantity descending
  return Array.from(map.values())
    .map((entry) => ({
      product_name: entry.product_name,
      totalQuantity: entry.totalQuantity,
      totalSales: entry.totalSales,
      transactionCount: entry.saleIds.size,
      averagePrice:
        entry.totalQuantity > 0 ? Math.round(entry.totalSales / entry.totalQuantity) : 0,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

export function calculateDailyRecap(sales: Sale[], expenses: Expense[], targetDateStr: string): DailyRecap {
  const activeSales = sales.filter((s) => !s.deleted_at && isSameDay(s.transaction_at, targetDateStr));
  const activeExpenses = expenses.filter((e) => !e.deleted_at && isSameDay(e.transaction_at, targetDateStr));

  // Sort descending by transaction time
  activeSales.sort((a, b) => new Date(b.transaction_at).getTime() - new Date(a.transaction_at).getTime());
  activeExpenses.sort((a, b) => new Date(b.transaction_at).getTime() - new Date(a.transaction_at).getTime());

  const totalSales = activeSales.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalItemsSold = activeSales.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalExpenses = activeExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netBalance = totalSales - totalExpenses;
  const productSummaries = aggregateProductSales(activeSales);

  return {
    date: targetDateStr,
    formattedDate: formatDateIndo(targetDateStr),
    totalSales,
    totalTransactions: activeSales.length,
    totalItemsSold,
    totalExpenses,
    netBalance,
    sales: activeSales,
    expenses: activeExpenses,
    productSummaries,
  };
}

export function calculateMonthlyRecap(sales: Sale[], expenses: Expense[], year: number, month: number): MonthlyRecap {
  const monthNames = getMonthNamesIndo();
  const monthName = monthNames.find((m) => m.value === month)?.label || `Bulan ${month}`;

  // Filter for matching year and month (month is 1-indexed: 1-12)
  const activeSales = sales.filter((s) => {
    if (s.deleted_at) return false;
    const d = new Date(s.transaction_at);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const activeExpenses = expenses.filter((e) => {
    if (e.deleted_at) return false;
    const d = new Date(e.transaction_at);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  // Calculate days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailySummaries: DayRecapSummary[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const daySales = activeSales.filter((s) => isSameDay(s.transaction_at, dayStr));
    const dayExpenses = activeExpenses.filter((e) => isSameDay(e.transaction_at, dayStr));

    const dayTotalSales = daySales.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const dayTotalExpenses = dayExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const dayNet = dayTotalSales - dayTotalExpenses;

    dailySummaries.push({
      date: dayStr,
      formattedDay: `${day} ${monthName.slice(0, 3)}`,
      totalSales: dayTotalSales,
      totalExpenses: dayTotalExpenses,
      netBalance: dayNet,
      transactionCount: daySales.length,
    });
  }

  const totalSales = activeSales.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalItemsSold = activeSales.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalExpenses = activeExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netBalance = totalSales - totalExpenses;
  const productSummaries = aggregateProductSales(activeSales);

  return {
    year,
    month,
    monthName,
    totalSales,
    totalTransactions: activeSales.length,
    totalItemsSold,
    totalExpenses,
    netBalance,
    dailySummaries,
    sales: activeSales,
    expenses: activeExpenses,
    productSummaries,
  };
}
