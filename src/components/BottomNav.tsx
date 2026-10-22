import React from 'react';
import { Home, ShoppingBag, Coffee, ArrowDownRight, BarChart3 } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: Home,
    },
    {
      id: 'penjualan' as ActiveTab,
      label: 'Penjualan',
      icon: ShoppingBag,
    },
    {
      id: 'produk' as ActiveTab,
      label: 'Daftar Produk',
      icon: Coffee,
    },
    {
      id: 'kas-keluar' as ActiveTab,
      label: 'Kas Keluar',
      icon: ArrowDownRight,
    },
    {
      id: 'rekap' as ActiveTab,
      label: 'Rekap',
      icon: BarChart3,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#24140B] border-t border-[#3D2314] shadow-2xl safe-bottom no-print">
      <div className="max-w-md mx-auto grid grid-cols-5 px-1 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 min-h-[58px] ${
                isActive
                  ? 'text-[#F5C27D] font-bold'
                  : 'text-[#B8A495] hover:text-[#E8DDD2] font-medium'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full mb-0.5 transition-transform ${
                  isActive ? 'bg-[#3D2314] scale-110 shadow-inner ring-1 ring-[#C58940]/50' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#F5C27D]' : 'text-[#B8A495]'}`} />
              </div>
              <span className={`text-[11px] leading-tight text-center tracking-tight truncate w-full ${isActive ? 'font-bold' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
