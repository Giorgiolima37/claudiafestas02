import React, { useState } from 'react';
import { Screen } from './types';
import Sidebar from './components/Sidebar';
import CustomerRegistration from './components/CustomerRegistration';
import CustomerList from './components/CustomerList';
import ReservationForm from './components/ReservationForm';
import InventoryDashboard from './components/InventoryDashboard';
import FinanceDashboard from './components/FinanceDashboard';
import InventoryHistory from './components/InventoryHistory'; // Importando a nova tela

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LISTAGEM');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
    setIsSidebarOpen(false); // Fecha a barra ao navegar no celular
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'CADASTRO': return <CustomerRegistration onSaved={() => navigateTo('LISTAGEM')} />;
      case 'LISTAGEM': return <CustomerList />;
      case 'RESERVA': return <ReservationForm onFinished={() => navigateTo('LISTAGEM')} />;
      case 'ESTOQUE': return <InventoryDashboard />;
      case 'HISTORICO': return <InventoryHistory />; // Nova rota para o Histórico
      case 'CAIXA': return <FinanceDashboard />;
      default: return <CustomerList />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fdf8f6] font-sans selection:bg-orange-100">
      {/* Botão de Menu para Celular */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#B24D2D] text-white shadow-md">
        <span className="font-bold tracking-tight">Claudia Festas</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl p-2">
          <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Sidebar - Agora com controle de visibilidade no mobile */}
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative z-50 w-full md:w-64 h-full`}>
        <Sidebar activeScreen={currentScreen} onNavigate={navigateTo} />
      </div>

      <main className="flex-1 flex flex-col p-4 md:p-10 overflow-y-auto">
        {/* Atalhos rápidos - Ajustados para mobile */}
        <div className="flex gap-3 mb-6 md:mb-8 justify-center md:justify-start">
          <button 
            onClick={() => navigateTo('CADASTRO')}
            className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm active:scale-95 border border-orange-100"
          >
            <i className="fa-solid fa-user-plus"></i>
          </button>
          <button 
            onClick={() => navigateTo('CAIXA')}
            className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm active:scale-95 border border-orange-100"
          >
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </button>
          {/* Novo Atalho Rápido para Histórico (Opcional) */}
          <button 
            onClick={() => navigateTo('HISTORICO')}
            className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm active:scale-95 border border-orange-100"
          >
            <i className="fa-solid fa-clock-rotate-left"></i>
          </button>
        </div>

        {/* Container Principal Responsivo */}
        <div className="flex-1 flex items-start justify-center pb-8">
          <div className="w-full max-w-6xl bg-white rounded-3xl md:rounded-[32px] p-5 md:p-10 shadow-xl border border-white/20">
            {renderScreen()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;