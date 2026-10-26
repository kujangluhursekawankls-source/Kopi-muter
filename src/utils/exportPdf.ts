import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyRecap, MonthlyRecap } from '../types';
import { formatDateIndo, formatDateTimeIndo, formatRupiah, formatTimeIndo } from './formatters';

export function generateDailyPdf(recap: DailyRecap): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [40, 23, 13]; // #28170D
  const goldColor: [number, number, number] = [197, 137, 64]; // #C58940
  const textColor: [number, number, number] = [28, 17, 10];
  const grayColor: [number, number, number] = [100, 100, 100];

  // Header banner / title
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PURI KOPI', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 200, 180);
  doc.text('Laporan Rekap Penjualan & Kas Keluar Harian', 14, 25);

  doc.setFontSize(9);
  doc.text(`Dicetak: ${formatDateTimeIndo(new Date().toISOString())}`, 196, 25, { align: 'right' });

  // Report Period Box
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tanggal: ${recap.formattedDate}`, 14, 42);

  // Summary KPI Cards (Horizontal layout)
  const cardY = 48;
  const cardHeight = 22;
  const cardWidth = 43;

  // Card 1: Penjualan
  doc.setFillColor(245, 248, 245);
  doc.setDrawColor(200, 225, 200);
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('TOTAL PENJUALAN', 16, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 120, 50);
  doc.text(formatRupiah(recap.totalSales), 16, cardY + 16);

  // Card 2: Kas Keluar
  doc.setFillColor(254, 245, 245);
  doc.setDrawColor(240, 200, 200);
  doc.roundedRect(61, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text('TOTAL KAS KELUAR', 63, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 40, 40);
  doc.text(formatRupiah(recap.totalExpenses), 63, cardY + 16);

  // Card 3: Saldo Bersih
  doc.setFillColor(253, 248, 242);
  doc.setDrawColor(230, 210, 180);
  doc.roundedRect(108, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text('SALDO BERSIH', 110, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const netColor: [number, number, number] = recap.netBalance >= 0 ? [40, 23, 13] : [190, 40, 40];
  doc.setTextColor(...netColor);
  doc.text(formatRupiah(recap.netBalance), 110, cardY + 16);

  // Card 4: Volume
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(220, 220, 230);
  doc.roundedRect(155, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text('TRANSAKSI / PRODUK', 157, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text(`${recap.totalTransactions} Trx / ${recap.totalItemsSold} Pcs`, 157, cardY + 16);

  // Section 1: Rekap Penjualan Per Produk (Kuantitas Disatukan)
  let startY = 78;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Rekap Penjualan Per Produk (Kuantitas Disatukan)', 14, startY);

  const productTableData = (recap.productSummaries || []).map((p, idx) => [
    (idx + 1).toString(),
    p.product_name,
    `${p.totalQuantity} pcs`,
    `${p.transactionCount}x`,
    formatRupiah(p.totalSales),
  ]);

  autoTable(doc, {
    startY: startY + 3,
    head: [['No', 'Nama Produk', 'Jumlah Terjual', 'Frekuensi', 'Total Penjualan']],
    body: productTableData.length > 0 ? productTableData : [['-', 'Belum ada produk terjual pada tanggal ini', '-', '-', 'Rp0']],
    theme: 'grid',
    headStyles: {
      fillColor: goldColor,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 34, halign: 'right' },
    },
  });

  // Section 2: Rincian Transaksi Penjualan
  // @ts-ignore
  const salesY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : startY + 35;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Rincian Transaksi Penjualan', 14, salesY);

  const salesTableData = recap.sales.map((s, idx) => [
    (idx + 1).toString(),
    formatTimeIndo(s.transaction_at),
    s.product_name_snapshot,
    s.quantity.toString(),
    formatRupiah(s.total),
  ]);

  autoTable(doc, {
    startY: salesY + 3,
    head: [['No', 'Waktu', 'Nama Produk / Item', 'Total Pcs', 'Total Nominal']],
    body: salesTableData.length > 0 ? salesTableData : [['-', '-', 'Belum ada transaksi penjualan pada tanggal ini', '-', 'Rp0']],
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 94 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 34, halign: 'right' },
    },
  });

  // Section 3: Rincian Kas Keluar
  // @ts-ignore
  const nextY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : salesY + 35;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Rincian Kas Keluar (Pengeluaran Operasional)', 14, nextY);

  const expenseTableData = recap.expenses.map((e, idx) => [
    (idx + 1).toString(),
    formatTimeIndo(e.transaction_at),
    e.description,
    formatRupiah(e.amount),
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['No', 'Waktu', 'Keterangan Pengeluaran', 'Nominal']],
    body: expenseTableData.length > 0 ? expenseTableData : [['-', '-', 'Belum ada catatan kas keluar pada tanggal ini', 'Rp0']],
    theme: 'grid',
    headStyles: {
      fillColor: [120, 40, 30],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 106 },
      3: { cellWidth: 40, halign: 'right' },
    },
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Puri Kopi — Dokumen Resmi • Halaman ${i} dari ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}

export function generateMonthlyPdf(recap: MonthlyRecap): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [40, 23, 13];
  const textColor: [number, number, number] = [28, 17, 10];
  const grayColor: [number, number, number] = [100, 100, 100];

  // Header banner / title
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PURI KOPI', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 200, 180);
  doc.text(`Laporan Rekap Bulanan — Periode ${recap.monthName} ${recap.year}`, 14, 25);

  doc.setFontSize(9);
  doc.text(`Dicetak: ${formatDateTimeIndo(new Date().toISOString())}`, 196, 25, { align: 'right' });

  // Summary KPI Cards
  const cardY = 44;
  const cardHeight = 22;
  const cardWidth = 43;

  // Card 1
  doc.setFillColor(245, 248, 245);
  doc.setDrawColor(200, 225, 200);
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('TOTAL OMZET BULANAN', 16, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 120, 50);
  doc.text(formatRupiah(recap.totalSales), 16, cardY + 16);

  // Card 2
  doc.setFillColor(254, 245, 245);
  doc.setDrawColor(240, 200, 200);
  doc.roundedRect(61, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text('TOTAL KAS KELUAR', 63, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 40, 40);
  doc.text(formatRupiah(recap.totalExpenses), 63, cardY + 16);

  // Card 3
  doc.setFillColor(253, 248, 242);
  doc.setDrawColor(230, 210, 180);
  doc.roundedRect(108, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text('SALDO BERSIH OPERASIONAL', 110, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const netColor: [number, number, number] = recap.netBalance >= 0 ? [40, 23, 13] : [190, 40, 40];
  doc.setTextColor(...netColor);
  doc.text(formatRupiah(recap.netBalance), 110, cardY + 16);

  // Card 4
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(220, 220, 230);
  doc.roundedRect(155, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text('TRANSAKSI / PRODUK', 157, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text(`${recap.totalTransactions} Trx / ${recap.totalItemsSold} Pcs`, 157, cardY + 16);

  // Table of daily breakdown
  const startY = 74;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Tabel Ringkasan Penjualan & Kas Keluar Harian', 14, startY);

  const monthlyTableData = recap.dailySummaries.map((d) => [
    d.formattedDay,
    d.transactionCount > 0 ? `${d.transactionCount} Trx` : '-',
    formatRupiah(d.totalSales),
    formatRupiah(d.totalExpenses),
    formatRupiah(d.netBalance),
  ]);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Tanggal', 'Jumlah Transaksi', 'Total Penjualan', 'Total Kas Keluar', 'Saldo Bersih']],
    body: monthlyTableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 34, halign: 'center' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 38, halign: 'right' },
      4: { cellWidth: 40, halign: 'right' },
    },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Puri Kopi — Dokumen Resmi • Halaman ${i} dari ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadDailyPdf(recap: DailyRecap) {
  const doc = generateDailyPdf(recap);
  const filename = `Puri-Kopi-Rekap-Harian-${recap.date}.pdf`;
  doc.save(filename);
}

export function downloadMonthlyPdf(recap: MonthlyRecap) {
  const doc = generateMonthlyPdf(recap);
  const filename = `Puri-Kopi-Rekap-Bulanan-${recap.year}-${String(recap.month).padStart(2, '0')}.pdf`;
  doc.save(filename);
}

export async function shareDailyReport(recap: DailyRecap): Promise<boolean> {
  const productSection =
    recap.productSummaries && recap.productSummaries.length > 0
      ? `\n*Produk Terjual (Kuantitas Digabung):*\n` +
        recap.productSummaries
          .map((p) => `• ${p.product_name}: ${p.totalQuantity} pcs (${formatRupiah(p.totalSales)})`)
          .join('\n') +
        `\n`
      : '';

  const summaryText = `*PURI KOPI - REKAP HARIAN*\n` +
    `Tanggal: ${recap.formattedDate}\n` +
    `---------------------------\n` +
    `• Total Penjualan: ${formatRupiah(recap.totalSales)}\n` +
    `• Total Transaksi: ${recap.totalTransactions} transaksi\n` +
    `• Total Barang Terjual: ${recap.totalItemsSold} pcs\n` +
    `• Total Kas Keluar: ${formatRupiah(recap.totalExpenses)}\n` +
    productSection +
    `---------------------------\n` +
    `*SALDO BERSIH: ${formatRupiah(recap.netBalance)}*\n`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      // Check if file sharing supported
      const doc = generateDailyPdf(recap);
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Puri-Kopi-${recap.date}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Rekap Harian Puri Kopi - ${recap.date}`,
          text: summaryText,
          files: [file],
        });
        return true;
      } else {
        await navigator.share({
          title: `Rekap Harian Puri Kopi - ${recap.date}`,
          text: summaryText,
        });
        return true;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share failed, fallback to copy', err);
      }
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(summaryText);
    return true;
  } catch (err) {
    return false;
  }
}

export async function shareMonthlyReport(recap: MonthlyRecap): Promise<boolean> {
  const productSection =
    recap.productSummaries && recap.productSummaries.length > 0
      ? `\n*Produk Terjual (Kuantitas Digabung):*\n` +
        recap.productSummaries
          .slice(0, 10)
          .map((p) => `• ${p.product_name}: ${p.totalQuantity} pcs (${formatRupiah(p.totalSales)})`)
          .join('\n') +
        `\n`
      : '';

  const summaryText = `*PURI KOPI - REKAP BULANAN*\n` +
    `Periode: ${recap.monthName} ${recap.year}\n` +
    `---------------------------\n` +
    `• Total Omzet Penjualan: ${formatRupiah(recap.totalSales)}\n` +
    `• Total Transaksi: ${recap.totalTransactions} transaksi\n` +
    `• Total Barang Terjual: ${recap.totalItemsSold} pcs\n` +
    `• Total Kas Keluar: ${formatRupiah(recap.totalExpenses)}\n` +
    productSection +
    `---------------------------\n` +
    `*SALDO BERSIH BULANAN: ${formatRupiah(recap.netBalance)}*\n`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const doc = generateMonthlyPdf(recap);
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Puri-Kopi-Bulanan-${recap.year}-${recap.month}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Rekap Bulanan Puri Kopi - ${recap.monthName} ${recap.year}`,
          text: summaryText,
          files: [file],
        });
        return true;
      } else {
        await navigator.share({
          title: `Rekap Bulanan Puri Kopi - ${recap.monthName} ${recap.year}`,
          text: summaryText,
        });
        return true;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share failed', err);
      }
    }
  }

  try {
    await navigator.clipboard.writeText(summaryText);
    return true;
  } catch (err) {
    return false;
  }
}

export function printDailyReport(recap: DailyRecap) {
  const doc = generateDailyPdf(recap);
  // Direct save/download so user can print via Android PDF viewer / system print without iframe popup restriction
  doc.save(`Puri-Kopi-Cetak-Harian-${recap.date}.pdf`);
}

export function printMonthlyReport(recap: MonthlyRecap) {
  const doc = generateMonthlyPdf(recap);
  doc.save(`Puri-Kopi-Cetak-Bulanan-${recap.year}-${recap.month}.pdf`);
}
