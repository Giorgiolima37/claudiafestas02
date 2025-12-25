import React from 'react';
import { Screen } from '../types';

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeScreen, onNavigate }) => {
  const menuItems = [
    { id: 'LISTAGEM' as Screen, label: 'Clientes', icon: 'fa-users' },
    { id: 'HISTORICO' as Screen, label: 'Pedidos', icon: 'fa-rectangle-list' },
    { id: 'RESERVA' as Screen, label: 'Reservas', icon: 'fa-calendar-check' },
    { id: 'ESTOQUE' as Screen, label: 'Estoque', icon: 'fa-boxes-stacked' },
    { id: 'CAIXA' as Screen, label: 'Caixa', icon: 'fa-file-invoice-dollar' },
  ];

  // Função atualizada com o link específico de redirecionamento solicitado
  const abrirPortalNFSe = () => {
    window.open('https://nfse-bigua.atende.net/autoatendimento/servicos/nfse?redirected=1', '_blank');
  };

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
                ? 'bg-white text-[#B24D2D] shadow-lg scale-[1.02]' 
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg w-6`}></i>
            <span className="font-bold text-sm">{item.label}</span>
          </button>
        ))}

        {/* Botão com o novo link para NFSe-Biguaçu */}
        <button
          onClick={abrirPortalNFSe}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all hover:bg-white/10 text-white/80 border border-white/5 mt-4"
        >
          <i className="fa-solid fa-file-shield text-lg w-6 text-orange-200"></i>
          <span className="font-bold text-sm">NFSe-Biguaçu</span>
        </button>
      </nav>

      <div className="p-6 hidden md:block">
        <div className="bg-black/10 rounded-2xl p-4 flex items-center gap-3 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-[10px] uppercase tracking-wider font-bold">Sistema Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;