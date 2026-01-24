import React from 'react';
import { Screen } from '../types';

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeScreen, onNavigate }) => {
  const menuItems = [
    { id: 'LISTAGEM', label: 'Clientes', icon: 'fa-users' },
    { id: 'RESERVA', label: 'Reservas', icon: 'fa-calendar-check' },
    { id: 'PEDIDOS', label: 'Pedidos', icon: 'fa-rectangle-list' }, // Botão reativado abaixo de Reservas
    { id: 'ESTOQUE', label: 'Estoque', icon: 'fa-boxes-stacked' },
    { id: 'CAIXA', label: 'Caixa', icon: 'fa-file-invoice-dollar' },
    { id: 'NFSe-Biguaçu', label: 'NFSe-Biguaçu', icon: 'fa-file-shield' }
  ];

  return (
    <div className="w-full h-full bg-[#B24D2D] text-white flex flex-col p-6 shadow-2xl">
      <div className="mb-10 mt-4 text-center">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Claudia</h2>
        <p className="text-[10px] font-bold opacity-60 tracking-[0.3em] uppercase">Festas & Locações</p>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Screen)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
              activeScreen === item.id 
                ? 'bg-white text-[#B24D2D] shadow-lg scale-105' 
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg w-6 text-center`}></i>
            <span className="text-sm tracking-wide uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-2 opacity-50">
          <i className="fa-solid fa-circle-user text-2xl"></i>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Admin</span>
            <span className="text-[8px] font-bold">Painel de Controle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;