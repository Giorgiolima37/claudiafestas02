import React, { useState, useEffect, useRef } from 'react';
import { ActiveUserPresence, Screen } from './types';
import Sidebar, { getSidebarTheme } from './components/Sidebar';
import CustomerRegistration from './components/CustomerRegistration';
import CustomerList from './components/CustomerList';
import ReservationForm from './components/ReservationForm';
import InventoryDashboard from './components/InventoryDashboard';
import FinanceDashboard from './components/FinanceDashboard';
import InventoryHistory from './components/InventoryHistory';
import OrderManagement from './components/OrderManagement'; 
import Catalog from './components/Catalog'; 
import BudgetDashboard from './components/BudgetDashboard';
import { db } from './services/supabase';
import logo2 from './logo-2.png';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('PEDIDOS');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // --- ESTADOS DO CALENDÁRIO ---
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(''); // Data selecionada (YYYY-MM-DD)
  const [allReservations, setAllReservations] = useState<any[]>([]); 
  
  // Controle de navegação do mês do calendário customizado
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // ESTADOS DE SEGURANÇA
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  const [activeUserDetails, setActiveUserDetails] = useState<ActiveUserPresence[]>([]);
  const [isLoginPresenceOpen, setIsLoginPresenceOpen] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState('');
  const presenceChannelRef = useRef<any>(null);
  const [presenceSessionId] = useState(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });
  const currentTheme = getSidebarTheme();

  const isCatalogRoute = window.location.pathname === '/catalogo';

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

    let device = mobilePattern.test(userAgent) ? 'Celular' : 'Computador';
    let system = 'Navegador';

    if (/Windows/i.test(userAgent) || /Win/i.test(platform)) {
      device = 'Computador';
      system = 'Windows';
    } else if (/Android/i.test(userAgent)) {
      device = 'Celular';
      system = 'Android';
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      device = 'Celular';
      system = 'iOS';
    } else if (/Mac/i.test(userAgent) || /Mac/i.test(platform)) {
      device = 'Computador';
      system = 'Mac';
    } else if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) {
      system = 'Linux';
    }

    return { device, platform: system };
  };

  const handleLogout = (message = '') => {
    sessionStorage.removeItem('claudia_auth');
    setIsAuthenticated(false);
    setIsSidebarOpen(false);
    setIsCalendarOpen(false);
    setIsLoginPresenceOpen(false);
    setPasswordInput('');
    setError(false);
    setCurrentScreen('PEDIDOS');
    setLogoutMessage(message);
    presenceChannelRef.current?.untrack();
  };

  const handleLogoutSession = async (sessionId: string) => {
    if (sessionId === presenceSessionId) {
      handleLogout('Sessao encerrada. Faca login novamente.');
      return;
    }

    await presenceChannelRef.current?.send({
      type: 'broadcast',
      event: 'force-logout',
      payload: { targetSessionId: sessionId }
    });
    localStorage.setItem('claudia_force_logout', JSON.stringify({
      targetSessionId: sessionId,
      createdAt: Date.now()
    }));
  };

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('claudia_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }

    // --- TESTE DE SINCRONIZAÇÃO DO SUPABASE ---
    async function verificarConexaoSupabase() {
      try {
        const { data, error } = await db.from('cadastro').select('id').limit(1);
        if (error) {
          console.error("❌ Erro de sincronização com o Supabase:", error.message);
        } else {
          console.log("✅ Supabase sincronizado com sucesso! Conexão activa.");
        }
      } catch (err: any) {
        console.error("❌ Erro inesperado ao testar o Supabase:", err.message);
      }
    }
    verificarConexaoSupabase();
  }, []);

  useEffect(() => {
    if (isCatalogRoute) return;

    const channel = db.channel('claudia-system-presence', {
      config: {
        presence: {
          key: presenceSessionId
        }
      }
    });
    presenceChannelRef.current = channel;

    const updatePresenceCount = () => {
      const state = channel.presenceState() as Record<string, ActiveUserPresence[]>;
      const details = Object.values(state).flat();
      setActiveUserDetails(details);
      setActiveUsers(details.length);
    };

    channel
      .on('presence', { event: 'sync' }, updatePresenceCount)
      .on('broadcast', { event: 'force-logout' }, ({ payload }) => {
        if (payload?.targetSessionId === presenceSessionId) {
          handleLogout('Sessao encerrada por outro usuario. Faca login novamente.');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (isAuthenticated) {
            const deviceInfo = getDeviceInfo();
            await channel.track({
              sessionId: presenceSessionId,
              device: deviceInfo.device,
              platform: deviceInfo.platform,
              onlineAt: new Date().toISOString()
            });
          }

          updatePresenceCount();
        }
      });

    return () => {
      channel.untrack();
      db.removeChannel(channel);
      if (presenceChannelRef.current === channel) {
        presenceChannelRef.current = null;
      }
    };
  }, [isAuthenticated, isCatalogRoute, presenceSessionId]);

  useEffect(() => {
    const handleStorageLogout = (event: StorageEvent) => {
      if (event.key !== 'claudia_force_logout' || !event.newValue) return;

      try {
        const payload = JSON.parse(event.newValue);
        if (payload?.targetSessionId === presenceSessionId) {
          handleLogout('Sessao encerrada por outro usuario. Faca login novamente.');
        }
      } catch (err) {
        console.error('Erro ao processar logout remoto:', err);
      }
    };

    window.addEventListener('storage', handleStorageLogout);
    return () => window.removeEventListener('storage', handleStorageLogout);
  }, [presenceSessionId]);

  const fetchCalendarEvents = async () => {
    try {
      const [resReservas, resFuturas, resClientes] = await Promise.all([
        db.from('reservas').select('cliente_id, data_evento, data_devolucao, status'),
        db.from('reservas_futuras').select('cliente_id, data_evento, data_devolucao'),
        db.from('cadastro').select('id, cliente')
      ]);

      const clientesMap = (resClientes.data || []).reduce((acc: any, c: any) => {
        acc[c.id] = c.cliente;
        return acc;
      }, {});

      const normais = (resReservas.data || [])
        .filter((r: any) => r.status?.toLowerCase() !== 'finalizado')
        .map((r: any) => ({
          data: r.data_evento?.split('T')[0],
          devolucao: r.data_devolucao?.split('T')[0], // Mapeia a devolução
          cliente: clientesMap[r.cliente_id] || 'Desconhecido',
          tipo: 'Reserva Ativa'
        }));

      const futuras = (resFuturas.data || []).map((rf: any) => ({
        data: rf.data_evento?.split('T')[0],
        devolucao: rf.data_devolucao?.split('T')[0], // Mapeia a devolução
        cliente: clientesMap[rf.cliente_id] || 'ID: ' + rf.cliente_id,
        tipo: 'Reserva Futura'
      }));

      const unificados = [...normais, ...futuras];
      const filtrados = unificados.filter((value, index, self) =>
        index === self.findIndex((t) => t.data === value.data && t.cliente === value.cliente)
      );

      setAllReservations(filtrados);
    } catch (err: any) {
      console.error("Erro ao carregar datas do calendário:", err.message);
    }
  };

  useEffect(() => {
    if (isCalendarOpen) {
      fetchCalendarEvents();
      const hoje = new Date();
      setSelectedDate(hoje.toLocaleDateString('en-CA'));
      setCurrentMonth(hoje.getMonth());
      setCurrentYear(hoje.getFullYear());
    }
  }, [isCalendarOpen]);

  const clientesDoDia = allReservations.filter(r => r.data === selectedDate);

  // --- LÓGICA DE GERAÇÃO DA GRADE DO CALENDÁRIO ---
  const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const mudarMes = (direcao: 'ant' | 'prox') => {
    if (direcao === 'ant') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentMonth(prev => prev - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    }
  };

  const gerarDiasCalendario = () => {
    const primeiroDiaDaSemana = new Date(currentYear, currentMonth, 1).getDay();
    const totalDiasNoMes = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dias = [];

    for (let i = 0; i < primeiroDiaDaSemana; i++) {
      dias.push(null);
    }

    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
      const dataFormatada = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      
      const temReserva = allReservations.some(r => r.data === dataFormatada);
      
      // Encontra a reserva do dia (se houver) para pegar a data de devolução correspondente
      const reservaDoDia = allReservations.find(r => r.data === dataFormatada);

      dias.push({
        numero: dia,
        dataIso: dataFormatada,
        temReserva,
        // Salva a data de devolução formatada em BR se ela existir
        dataDevolucaoBr: reservaDoDia?.devolucao ? reservaDoDia.devolucao.split('-').reverse().join('/') : null
      });
    }

    return dias;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '123456') {
      setError(false);
      setLogoutMessage('');
      setIsZooming(true);
      setTimeout(() => {
        setIsAuthenticated(true);
        setIsZooming(false);
        sessionStorage.setItem('claudia_auth', 'true');
      }, 200);
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
      case 'ORCAMENTO':
        return <BudgetDashboard />;
      case 'ESTOQUE': 
      case 'INVENTARIO': // Fallback preventivo caso mude no types.ts
        return <InventoryDashboard />;
      case 'HISTORICO': 
        return <InventoryHistory clientId={selectedClientId} onBack={() => navigateTo('LISTAGEM')} />;
      case 'CAIXA': 
        return <FinanceDashboard />;
      default: 
        return <CustomerList onSelectCustomer={abrirHistoricoCliente} />;
    }
  };

  if (isCatalogRoute) {
    return <Catalog />;
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-[#fdf8f6] p-4 overflow-hidden"
        style={{ backgroundColor: 'var(--claudia-page-bg, #fdf8f6)' }}
      >
        <div className={`w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-orange-100 text-center transition-all duration-300 ${isZooming ? 'opacity-0 scale-95 pointer-events-none' : 'animate-in zoom-in duration-500'}`}>
          <div className="relative mb-5 inline-block">
            <button
              type="button"
              onClick={() => setIsLoginPresenceOpen(!isLoginPresenceOpen)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 active:scale-95"
              title="Ver dispositivos conectados"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"></span>
              <span>{activeUsers || 0} {activeUsers === 1 ? 'usuario online' : 'usuarios online'}</span>
            </button>

            {isLoginPresenceOpen && (
              <div className="absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-2xl bg-white p-3 text-left text-gray-800 shadow-xl border border-orange-100">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-gray-600">Conectados agora</p>
                <div className="space-y-2">
                  {activeUserDetails.length > 0 ? (
                    activeUserDetails.map((user, index) => (
                      <div key={`${user.sessionId}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <i className={`fa-solid ${user.device === 'Celular' ? 'fa-mobile-screen-button' : 'fa-desktop'} text-[#B24D2D] text-xs`}></i>
                          <div>
                            <p className="text-[10px] font-black uppercase leading-tight">{user.device}</p>
                            <p className="text-[9px] font-bold uppercase text-gray-600 leading-tight">{user.platform}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <button
                            type="button"
                            onClick={() => handleLogoutSession(user.sessionId)}
                            className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center transition-all hover:bg-red-500 hover:text-white active:scale-95"
                            title={user.sessionId === presenceSessionId ? 'Deslogar esta sessao' : 'Deslogar esta pessoa'}
                          >
                            <i className="fa-solid fa-right-from-bracket text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-600">Nenhuma sessao ativa.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className={`w-56 h-56 flex items-center justify-center mx-auto mb-6 shadow-lg overflow-hidden rounded-full bg-white transition-all duration-200 ease-in-out ${isZooming ? 'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[5] opacity-0 shadow-none' : ''}`}>
              <img src={logo2} alt="Logo" className="w-full h-full object-contain scale-150" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2 italic">Acesso Restrito</h1>
          <p className="text-gray-600 text-sm mb-4 font-bold uppercase tracking-widest">Claudia Festas</p>
          {logoutMessage && (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600">
              {logoutMessage}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${currentTheme.name} significado`)}`, '_blank', 'noopener,noreferrer')}
            className="mb-8 mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: currentTheme.badgeBackground, color: currentTheme.badgeText }}
            title={`Pesquisar significado de ${currentTheme.name}`}
          >
            <i className="fa-solid fa-ribbon"></i>
            <span>{currentTheme.name}</span>
          </button>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative w-full">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Digite a senha de admin"
                className={`w-full p-5 pr-14 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-center transition-all ${error ? 'border-red-500 animate-shake' : 'border-gray-100 focus:border-[#B24D2D]'}`}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-[#B24D2D] transition-colors focus:outline-none"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-lg`}></i>
              </button>
            </div>
            {error && <p className="text-red-500 text-xs font-bold">Senha incorreta. Tente novamente.</p>}
            <button 
              type="submit"
              className="w-full p-5 bg-[#B24D2D] text-white font-black rounded-2xl shadow-lg hover:bg-[#943a20] transition-all active:scale-95"
            >
              ENTRAR NO SISTEMA
            </button>
          </form>
        </div>
        
        <a 
          href="https://wa.me/5548991347343"
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-6 flex items-center justify-center gap-3 px-6 py-3 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#20ba56] hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold text-sm uppercase tracking-wide no-underline ${isZooming ? 'opacity-0 pointer-events-none' : ''}`}
          title="Suporte via WhatsApp"
        >
          <i className="fa-brands fa-whatsapp text-2xl"></i>
          <span>Suporte do Sistema</span>
        </a>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col md:flex-row min-h-screen h-screen bg-[#fdf8f6] font-sans selection:bg-orange-100 overflow-hidden"
      style={{ backgroundColor: 'var(--claudia-page-bg, #fdf8f6)' }}
    >
      
      <div className="md:hidden flex items-center justify-between p-4 bg-[#B24D2D] text-white shadow-md z-[60]">
        <span className="font-bold tracking-tight">Claudia Festas</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl p-2">
          <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </div>

      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative z-50 w-full md:w-[284px] h-full shadow-2xl`}>
        <Sidebar
          activeScreen={currentScreen}
          onNavigate={navigateTo}
          activeUsers={activeUsers}
          activeUserDetails={activeUserDetails}
          currentPresenceSessionId={presenceSessionId}
          onLogoutSession={handleLogoutSession}
        />
      </div>

      <main
        className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fdf8f6]"
        style={{ backgroundColor: 'var(--claudia-page-bg, #fdf8f6)' }}
      >
        <div className="p-4 md:p-10 flex flex-col items-center">
          
          <div className="flex gap-3 mb-6 md:mb-8 w-full max-w-6xl">
            <button 
              onClick={() => navigateTo('CADASTRO')}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm border border-orange-100 transition-all duration-300 transform-gpu hover:scale-110 hover:-translate-y-2 hover:shadow-[0_18px_35px_rgba(0,0,0,0.32)] active:scale-[0.98]"
              title="Novo Cliente"
            >
              <i className="fa-solid fa-user-plus"></i>
            </button>
            <button 
              onClick={() => navigateTo('PEDIDOS')}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm border border-orange-100 transition-all duration-300 transform-gpu hover:scale-110 hover:-translate-y-2 hover:shadow-[0_18px_35px_rgba(0,0,0,0.32)] active:scale-[0.98]"
              title="Gestão de Pedidos"
            >
              <i className="fa-solid fa-rectangle-list"></i>
            </button>
            <button 
              onClick={() => navigateTo('CAIXA')}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm border border-orange-100 transition-all duration-300 transform-gpu hover:scale-110 hover:-translate-y-2 hover:shadow-[0_18px_35px_rgba(0,0,0,0.32)] active:scale-[0.98]"
              title="Caixa"
            >
              <i className="fa-solid fa-file-invoice-dollar"></i>
            </button>
            
            <button 
              onClick={() => setIsCalendarOpen(true)}
              className="flex items-center justify-center w-12 h-12 bg-white text-[#B24D2D] rounded-xl shadow-sm border border-orange-100 transition-all duration-300 transform-gpu hover:scale-110 hover:-translate-y-2 hover:shadow-[0_18px_35px_rgba(0,0,0,0.32)] active:scale-[0.98]"
              title="Abrir Calendário"
            >
              <i className="fa-solid fa-calendar-days"></i>
            </button>
          </div>

          <div className="w-full max-w-6xl bg-white rounded-3xl md:rounded-[40px] p-6 md:p-12 shadow-xl border border-white/20 min-h-fit mb-10">
            {renderScreen()}
          </div>
        </div>
      </main>

      {/* --- MODAL DO CALENDÁRIO COM HOVER DE DEVOLUÇÃO --- */}
      {isCalendarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300"
          onClick={() => setIsCalendarOpen(false)}
        >
          <div 
            className="bg-white rounded-[40px] p-6 md:p-8 shadow-2xl border border-orange-100 w-full max-w-md animate-in zoom-in duration-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 w-full">
              <h3 className="font-black text-[#B24D2D] uppercase italic text-lg tracking-tight">Calendário de Eventos</h3>
              <button onClick={() => setIsCalendarOpen(false)} className="text-gray-600 hover:text-red-500 text-2xl font-light">×</button>
            </div>
            
            <div className="flex justify-between items-center w-full mb-4 px-2">
              <button onClick={() => mudarMes('ant')} className="text-gray-600 hover:text-[#B24D2D] font-black text-sm">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="font-black text-[#B24D2D] text-sm uppercase tracking-wider">
                {nomesMeses[currentMonth]} de {currentYear}
              </span>
              <button onClick={() => mudarMes('prox')} className="text-gray-600 hover:text-[#B24D2D] font-black text-sm">
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-black text-[10px] text-gray-600 uppercase mb-2 tracking-widest">
              <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 w-full mb-6">
              {gerarDiasCalendario().map((dia, index) => {
                if (!dia) return <div key={`empty-${index}`} className="w-full aspect-square"></div>;

                const isSelected = selectedDate === dia.dataIso;
                
                let classeEstilo = "bg-gray-50/60 text-gray-700 hover:bg-orange-100/50";
                if (dia.temReserva) classeEstilo = "bg-orange-600 text-white font-black"; 
                if (isSelected) classeEstilo = "bg-blue-600 text-white font-black ring-2 ring-blue-300 scale-105 shadow-md"; 

                // Lógica de Título Dinâmica para o Hover do Mouse
                let textoHover = undefined;
                if (isSelected && dia.temReserva && dia.dataDevolucaoBr) {
                  textoHover = `Data de Devolução: ${dia.dataDevolucaoBr}`;
                } else if (dia.temReserva && dia.dataDevolucaoBr) {
                  textoHover = `Retirada agendada! Devolução: ${dia.dataDevolucaoBr}`;
                }

                return (
                  <button
                    key={`day-${dia.numero}`}
                    onClick={() => setSelectedDate(dia.dataIso)}
                    title={textoHover} // Atributo que faz o balão aparecer ao parar o mouse
                    className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ${classeEstilo}`}
                  >
                    {dia.numero}
                  </button>
                );
              })}
            </div>
            
            <div className="w-full max-h-[160px] overflow-y-auto pr-1">
              <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">
                Box Retiradas em {selectedDate ? selectedDate.split('-').reverse().join('/') : ''}:
              </h4>
              
              {clientesDoDia.length > 0 ? (
                <div className="space-y-2">
                  {clientesDoDia.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-orange-50/50 border border-orange-100/60 p-3 rounded-xl animate-in fade-in duration-300">
                      <span className="font-black text-xs text-gray-700 uppercase truncate max-w-[220px]">
                        {item.cliente}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                        item.tipo === 'Reserva Futura' ? 'bg-gray-800 text-white' : 'bg-[#B24D2D] text-white'
                      }`}>
                        {item.tipo}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-600 font-bold uppercase text-[9px] tracking-wider italic">
                  Nenhuma retirada para esta data.
                </div>
              )}
            </div>
            
            <p className="text-[9px] font-bold text-gray-600 uppercase mt-6 text-center tracking-widest border-t border-gray-100 pt-4 w-full">
              Claudia Festas & Locações
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
