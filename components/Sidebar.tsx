import React, { useState } from 'react';
import { Screen } from '../types';

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeScreen, onNavigate }) => {
  // Estado para controlar o modal de bloqueio
  const [modalVipAberto, setModalVipAberto] = useState(false);

  const menuItems = [
    { id: 'LISTAGEM', label: 'Clientes', icon: 'fa-users' },
    { id: 'RESERVA', label: 'Reservas', icon: 'fa-calendar-check' },
    { id: 'PEDIDOS', label: 'Pedidos', icon: 'fa-rectangle-list' }, 
    { id: 'ESTOQUE', label: 'Estoque', icon: 'fa-boxes-stacked' },
    { id: 'CAIXA', label: 'Caixa', icon: 'fa-file-invoice-dollar' },
    { id: 'NFSe-Biguaçu', label: 'NFSe-Biguaçu', icon: 'fa-file-shield' },
    { id: 'WHATSAPP', label: 'WhatsApp', icon: 'fa-whatsapp' }
  ];

  return (
    <div className="w-full h-full bg-[#B24D2D] text-white flex flex-col p-6 shadow-2xl relative">
      <div className="mb-10 mt-4 text-center">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Claudia</h2>
        <p className="text-[10px] font-bold opacity-60 tracking-[0.3em] uppercase">Festas & Locações</p>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'NFSe-Biguaçu') {
                window.open('https://nfse-bigua.atende.net/autoatendimento/servicos/nfse?redirected=1', '_blank');
              } else if (item.id === 'WHATSAPP') {
                // ALTERADO: Agora abre o modal VIP em vez do link
                setModalVipAberto(true);
              } else {
                onNavigate(item.id as Screen);
              }
            }}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
              activeScreen === item.id 
                ? 'bg-white text-[#B24D2D] shadow-lg scale-105' 
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <i className={`${item.id === 'WHATSAPP' ? 'fa-brands' : 'fa-solid'} ${item.icon} text-lg w-6 text-center`}></i>
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

      {/* --- MODAL VIP (Mensagem de Função Bloqueada) --- */}
      {modalVipAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[35px] p-10 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in duration-300 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fa-solid fa-crown text-3xl text-blue-600"></i>
                </div>
                <h3 className="text-xl font-black text-gray-800 uppercase italic mb-2">Função Bloqueada</h3>
                <p className="text-sm font-bold text-gray-500 mb-8">
                    Essa função está disponível apenas na versão <span className="text-[#b24a2b]">VIP</span>.
                </p>
                <button
                    onClick={() => setModalVipAberto(false)}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-lg transition-all"
                >
                    Sair
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default Sidebar;