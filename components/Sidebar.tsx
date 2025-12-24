import React from 'react';
import { Screen } from '../types';

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeScreen, onNavigate }) => {
  // O item HISTORICO foi removido deste array
  const menuItems = [
    { id: 'LISTAGEM' as Screen, label: 'Clientes', icon: 'fa-users' },
    { id: 'RESERVA' as Screen, label: 'Reservas', icon: 'fa-calendar-check' },
    { id: 'ESTOQUE' as Screen, label: 'Estoque', icon: 'fa-boxes-stacked' },
    { id: 'CAIXA' as Screen, label: 'Caixa', icon: 'fa-file-invoice-dollar' },
  ];

  return (
    <aside className="w-full md:w-64 h-full bg-[#B24D2D] text-white flex flex-col shadow-2xl">
      <div className="hidden md:flex p-8 flex-col items-center border-b border-white/10">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
          <i className="fa-solid fa-cake-candles text-3xl"></i>
        </div>
        <h1 className="text-xl font-bold">Claudia</h1>
        <p className="text-xs uppercase tracking-widest opacity-70">Festas</p>
      </div>

      <nav className="flex-1 px-4 py-6 md:py-8 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all ${
              activeScreen === item.id
                ? 'bg-white text-[#B24D2D] shadow-lg'
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg w-6`}></i>
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 hidden md:block">
        <div className="bg-black/10 rounded-2xl p-4 flex items-center gap-3 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-[10px] uppercase tracking-wider">Sistema Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;