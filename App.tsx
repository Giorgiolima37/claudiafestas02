import React, { useState, useEffect } from 'react';
import { Screen } from './types';
import Sidebar from './components/Sidebar';
import CustomerRegistration from './components/CustomerRegistration';
import CustomerList from './components/CustomerList';
import ReservationForm from './components/ReservationForm';
import InventoryDashboard from './components/InventoryDashboard';
import FinanceDashboard from './components/FinanceDashboard';
import InventoryHistory from './components/InventoryHistory';
import OrderManagement from './components/OrderManagement'; 
import Catalog from './components/Catalog'; // Importação do Catálogo Público

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LISTAGEM');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // ESTADOS DE SEGURANÇA
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);

  // Lógica para permitir visualização do catálogo sem senha
  // Esta verificação deve vir antes do bloqueio de autenticação
  const isCatalogRoute = window.location.pathname === '/catalogo';

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('claudia_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '123456') {
      setIsAuthenticated(true);
      setError(false);
      sessionStorage.setItem('claudia_auth', 'true');
    } else {
      setError(true);
      setPasswordInput('');
    }
  };

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
    setIsSidebarOpen(false); 
  };

  const abrirHistoricoCliente = (id: number) => {
    setSelectedClientId(id);
    setCurrentScreen('HISTORICO');
  };

  // FUNÇÃO DE RENDERIZAÇÃO AJUSTADA PARA SEPARAR CLIENTES DE PEDIDOS
  const renderScreen = () => {
    switch (currentScreen) {
      case 'CADASTRO': 
        return <CustomerRegistration onSaved={() => navigateTo('LISTAGEM')} />;
      case 'LISTAGEM': 
        return <CustomerList onSelectCustomer={abrirHistoricoCliente} />;
      case 'RESERVA': 
        return <ReservationForm onFinished={() => navigateTo('PEDIDOS')} />;
      case 'PEDIDOS': 
        return <OrderManagement />;
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

  // --- AJUSTE DE PRIORIDADE ---
  // Se for a rota do catálogo, renderiza imediatamente e ignora a autenticação
  if (isCatalogRoute) {
    return <Catalog />;
  }

  // Se não for catálogo e não estiver autenticado, mostra o login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8f6] p-4">
        <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-orange-100 text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-[#B24D2D] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <i className="fa-solid fa-lock text-white text-3xl"></i>
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2 italic">Acesso Restrito</h1>
          <p className="text-gray-400 text-sm mb-8 font-bold uppercase tracking-widest">Claudia Festas</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Digite a senha de admin"
              className={`w-full p-5 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-center transition-all ${error ? 'border-red-500 animate-shake' : 'border-gray-100 focus:border-[#B24D2D]'}`}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs font-bold">Senha incorreta. Tente novamente.</p>}
            <button 
              type="submit"
              className="w-full p-5 bg-[#B24D2D] text-white font-black rounded-2xl shadow-lg hover:bg-[#943a20] transition-all active:scale-95"
            >
              ENTRAR NO SISTEMA
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen h-screen bg-[#fdf8f6] font-sans selection:bg-orange-100 overflow-hidden">
      
      <div className="md:hidden flex items-center justify-between p-4 bg-[#B24D2D] text-white shadow-md z-[60]">
        <span className="font-bold tracking-tight">Claudia Festas</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl p-2">
          <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </div>

      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative z-50 w-full md:w-64 h-full shadow-2xl`}>
        <Sidebar activeScreen={currentScreen} onNavigate={navigateTo} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fdf8f6]">
        <div className="p-4 md:p-10 flex flex-col items-center">
          
          <div className="flex gap-3 mb-6 md:mb-8 w-full max-w-6xl">
            <button 
              onClick={() => navigateTo('CADASTRO')}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm hover:shadow-md active:scale-95 border border-orange-100 transition-all"
              title="Novo Cliente"
            >
              <i className="fa-solid fa-user-plus"></i>
            </button>
            <button 
              onClick={() => navigateTo('PEDIDOS')}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm hover:shadow-md active:scale-95 border border-orange-100 transition-all"
              title="Gestão de Pedidos"
            >
              <i className="fa-solid fa-rectangle-list"></i>
            </button>
            <button 
              onClick={() => navigateTo('CAIXA')}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm hover:shadow-md active:scale-95 border border-orange-100 transition-all"
              title="Caixa"
            >
              <i className="fa-solid fa-file-invoice-dollar"></i>
            </button>
          </div>

          <div className="w-full max-w-6xl bg-white rounded-3xl md:rounded-[40px] p-6 md:p-12 shadow-xl border border-white/20 min-h-fit mb-10">
            {renderScreen()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;