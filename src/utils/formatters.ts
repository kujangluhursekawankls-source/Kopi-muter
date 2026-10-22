import { DailyRecap, DayRecapSummary, Expense, MonthlyRecap, Sale } from '../types';

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
  };
}
