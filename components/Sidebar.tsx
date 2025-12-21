import React from 'react';
import { Screen } from '../types';

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeScreen, onNavigate }) => {
  const menuItems = [
    { id: 'LISTAGEM' as Screen, label: 'Clientes Cadastrados', icon: 'fa-users' },
    { id: 'RESERVA' as Screen, label: 'Fazer Reserva', icon: 'fa-calendar-check' },
    { id: 'ESTOQUE' as Screen, label: 'Ver Estoque', icon: 'fa-boxes-stacked' },
    // Novo botão do Caixa adicionado aqui
    { id: 'CAIXA' as Screen, label: 'Caixa', icon: 'fa-file-invoice-dollar' },
  ];

  return (
    <aside className="w-64 bg-[#B24D2D] text-white flex flex-col shadow-2xl z-10 transition-all duration-300">
      {/* Logo / Header */}
      <div className="p-8 flex flex-col items-center border-b border-white/10">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
          <i className="fa-solid fa-cake-candles text-3xl"></i>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-center">Claudia</h1>
        <p className="text-xs uppercase tracking-[0.2em] opacity-70 font-medium">Festas</p>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
              activeScreen === item.id
                ? 'bg-white text-[#B24D2D] shadow-lg shadow-black/10'
                : 'hover:bg-white/10 text-white/80 hover:text-white'
            }`}
          >
            <div className={`flex items-center justify-center w-8 transition-transform group-hover:scale-110`}>
              <i className={`fa-solid ${item.icon} text-lg`}></i>
            </div>
            <span className="font-medium text-sm tracking-wide">{item.label}</span>
            
            {activeScreen === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#B24D2D]"></div>
            )}
          </button>
        ))}
      </nav>

      {/* Rodapé / Status */}
      <div className="p-6">
        <div className="bg-black/10 rounded-2xl p-4 flex items-center gap-3 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Sistema Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;