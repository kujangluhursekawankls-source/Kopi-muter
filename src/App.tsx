import React, { useState } from 'react';
import { useAppData } from './hooks/useAppData';
import { ActiveTab } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { SalesView } from './components/SalesView';
import { ProductsView } from './components/ProductsView';
import { ExpensesView } from './components/ExpensesView';
import { RecapView } from './components/RecapView';
import { QrisView } from './components/QrisView';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const {
    products,
    sales,
    expenses,
    qrisData,
    syncState,
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
  } = useAppData();

  return (
    <div className="min-h-screen bg-[#FDF8F2] flex flex-col text-[#1C110A]">
      {/* Top Application Header */}
      <Header syncState={syncState} onSyncManual={syncNow} />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4 pb-24 safe-bottom">
        {activeTab === 'dashboard' && <DashboardView />}

        {activeTab === 'penjualan' && (
          <SalesView
            products={products}
            sales={sales}
            qrisData={qrisData}
            onAddSale={addSale}
            onUpdateSale={updateSale}
            onDeleteSale={deleteSale}
            onNavigateToProducts={() => setActiveTab('produk')}
            onNavigateToQris={() => setActiveTab('qris')}
          />
        )}

        {activeTab === 'produk' && (
          <ProductsView
            products={products}
            sales={sales}
            onAddProduct={addProduct}
            onUpdateProduct={updateProduct}
            onDeleteProduct={deleteProduct}
          />
        )}

        {activeTab === 'qris' && (
          <QrisView
            qrisData={qrisData}
            onSaveQris={saveQris}
            onDeleteQris={deleteQris}
          />
        )}

        {activeTab === 'kas-keluar' && (
          <ExpensesView
            expenses={expenses}
            onAddExpense={addExpense}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
          />
        )}

        {activeTab === 'rekap' && (
          <RecapView
            sales={sales}
            expenses={expenses}
            onExportBackup={exportBackup}
            onImportBackup={importBackup}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
