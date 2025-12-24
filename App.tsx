import React, { useState } from 'react';
import { Screen } from './types';
import Sidebar from './components/Sidebar';
import CustomerRegistration from './components/CustomerRegistration';
import CustomerList from './components/CustomerList';
import ReservationForm from './components/ReservationForm';
import InventoryDashboard from './components/InventoryDashboard';
import FinanceDashboard from './components/FinanceDashboard';
import InventoryHistory from './components/InventoryHistory';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LISTAGEM');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
    setIsSidebarOpen(false); 
  };

  const abrirHistoricoCliente = (id: number) => {
    setSelectedClientId(id);
    setCurrentScreen('HISTORICO');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'CADASTRO': 
        return <CustomerRegistration onSaved={() => navigateTo('LISTAGEM')} />;
      case 'LISTAGEM': 
        return <CustomerList onSelectCustomer={abrirHistoricoCliente} />;
      case 'RESERVA': 
        return <ReservationForm onFinished={() => navigateTo('LISTAGEM')} />;
      case 'ESTOQUE': 
        return <InventoryDashboard />;
      case 'HISTORICO': 
        return <InventoryHistory clientId={selectedClientId} onBack={() => navigateTo('LISTAGEM')} />;
      case 'CAIXA': 
        return <FinanceDashboard />;
      default: 
        return <CustomerList onSelectCustomer={abrirHistoricoCliente} />;
    }
  };

  return (
    // min-h-screen garante que o container sempre ocupe toda a tela
    <div className="flex flex-col md:flex-row min-h-screen h-screen bg-[#fdf8f6] font-sans selection:bg-orange-100 overflow-hidden">
      
      {/* Menu Celular (Visível apenas em telas pequenas) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#B24D2D] text-white shadow-md z-[60]">
        <span className="font-bold tracking-tight">Claudia Festas</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl p-2">
          <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Sidebar - Fixada com h-full para ir até o chão */}
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative z-50 w-full md:w-64 h-full shadow-2xl`}>
        <Sidebar activeScreen={currentScreen} onNavigate={navigateTo} />
      </div>

      {/* Main Content - Com scroll próprio para não afetar a sidebar */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fdf8f6]">
        
        {/* Container de Conteúdo Centralizado */}
        <div className="p-4 md:p-10 flex flex-col items-center">
          
          {/* Atalhos rápidos flutuantes */}
          <div className="flex gap-3 mb-6 md:mb-8 w-full max-w-6xl">
            <button 
              onClick={() => navigateTo('CADASTRO')}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm hover:shadow-md active:scale-95 border border-orange-100 transition-all"
            >
              <i className="fa-solid fa-user-plus"></i>
            </button>
            <button 
              onClick={() => navigateTo('CAIXA')}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm hover:shadow-md active:scale-95 border border-orange-100 transition-all"
            >
              <i className="fa-solid fa-file-invoice-dollar"></i>
            </button>
            <button 
              onClick={() => { setSelectedClientId(null); navigateTo('HISTORICO'); }}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm hover:shadow-md active:scale-95 border border-orange-100 transition-all"
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
            </button>
          </div>

          {/* Painel Branco Centralizado (Conteúdo da Tela) */}
          <div className="w-full max-w-6xl bg-white rounded-3xl md:rounded-[40px] p-6 md:p-12 shadow-xl border border-white/20 min-h-fit mb-10">
            {renderScreen()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;