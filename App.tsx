import React, { useState } from 'react';
import { Screen } from './types';
import Sidebar from './components/Sidebar';
import CustomerRegistration from './components/CustomerRegistration';
import CustomerList from './components/CustomerList';
import ReservationForm from './components/ReservationForm';
import InventoryDashboard from './components/InventoryDashboard';
import FinanceDashboard from './components/FinanceDashboard'; // Importação do Caixa

const App: React.FC = () => {
  // Define a tela inicial como LISTAGEM conforme o padrão das fotos
  const [currentScreen, setCurrentScreen] = useState<Screen>('LISTAGEM');

  const navigateTo = (screen: Screen) => setCurrentScreen(screen);

  // Lógica de navegação entre as telas
  const renderScreen = () => {
    switch (currentScreen) {
      case 'CADASTRO':
        return <CustomerRegistration onSaved={() => navigateTo('LISTAGEM')} />;
      case 'LISTAGEM':
        return <CustomerList />;
      case 'RESERVA':
        return <ReservationForm onFinished={() => navigateTo('LISTAGEM')} />;
      case 'ESTOQUE':
        return <InventoryDashboard />;
      case 'CAIXA':
        return <FinanceDashboard />; // Renderiza a tela financeira
      default:
        return <CustomerList />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#fdf8f6] font-sans selection:bg-orange-100">
      {/* Sidebar lateral fixa */}
      <Sidebar activeScreen={currentScreen} onNavigate={navigateTo} />
      
      <main className="flex-1 flex flex-col p-4 md:p-10 transition-all duration-500 overflow-y-auto">
        {/* Botões de atalho superior para navegação rápida */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => navigateTo('CADASTRO')}
            className="flex items-center justify-center w-12 h-12 bg-white/50 hover:bg-white text-[#B24D2D] rounded-xl shadow-sm transition-all active:scale-95"
            title="Novo Cadastro"
          >
            <i className="fa-solid fa-user-plus text-lg"></i>
          </button>
          <button 
            onClick={() => navigateTo('CAIXA')}
            className="flex items-center justify-center w-12 h-12 bg-white/50 hover:bg-white text-[#B24D2D] rounded-xl shadow-sm transition-all active:scale-95"
            title="Ver Caixa"
          >
            <i className="fa-solid fa-file-invoice-dollar text-lg"></i>
          </button>
        </div>

        {/* Container que envolve todas as telas com bordas arredondadas */}
        <div className="flex-1 flex items-start justify-center pb-12">
          <div className="w-full max-w-6xl bg-white/80 backdrop-blur-sm rounded-[32px] p-4 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/20 animate-in fade-in zoom-in duration-700">
            {renderScreen()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;