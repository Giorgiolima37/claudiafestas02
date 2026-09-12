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
import loginLogo from './logo-login-faixa-branca.png';
import loginBackground from './login-recepcao-hd.png';

const ACCESS_PASSWORD_STORAGE_KEY = 'claudia_access_password';
const LOGOUT_PASSWORD_STORAGE_KEY = 'claudia_logout_password';
const DEFAULT_ACCESS_PASSWORD = '123456';
const DEFAULT_LOGOUT_PASSWORD = '123456';

const formatarTextoComoNomeProprio = (valor: string) =>
  valor
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s)(\p{L})/gu, (_, separador: string, letra: string) =>
      separador + letra.toLocaleUpperCase('pt-BR')
    );

const deveManterDigitacaoOriginal = (campo: HTMLInputElement | HTMLTextAreaElement) => {
  if (campo.closest('[data-preserve-input-case]')) return true;
  if (campo instanceof HTMLTextAreaElement) return false;

  const tiposTecnicos = new Set([
    'password', 'email', 'tel', 'number', 'date', 'datetime-local', 'time',
    'month', 'week', 'range', 'color', 'file', 'checkbox', 'radio', 'hidden'
  ]);

  if (tiposTecnicos.has(campo.type)) return true;
  if (['numeric', 'decimal', 'tel', 'email', 'url'].includes(campo.inputMode)) return true;

  const identificacaoDoCampo = [
    campo.id,
    campo.name,
    campo.placeholder,
    campo.getAttribute('aria-label') || ''
  ].join(' ').toLocaleLowerCase('pt-BR');

  return /senha|password|telefone|whatsapp|cpf|cnpj|document|identifica|cep|código|codigo|\bqtd\b|quantidade|id personalizado/.test(identificacaoDoCampo);
};

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
  const [loginAttempt, setLoginAttempt] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  const [activeUserDetails, setActiveUserDetails] = useState<ActiveUserPresence[]>([]);
  const [isLoginPresenceOpen, setIsLoginPresenceOpen] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [accessPassword, setAccessPassword] = useState(() => localStorage.getItem(ACCESS_PASSWORD_STORAGE_KEY) || DEFAULT_ACCESS_PASSWORD);
  const [logoutPassword, setLogoutPassword] = useState(() => localStorage.getItem(LOGOUT_PASSWORD_STORAGE_KEY) || DEFAULT_LOGOUT_PASSWORD);
  const [adminAccessPassword, setAdminAccessPassword] = useState(accessPassword);
  const [adminLogoutPassword, setAdminLogoutPassword] = useState(logoutPassword);
  const [showAdminAccessPassword, setShowAdminAccessPassword] = useState(false);
  const [showAdminLogoutPassword, setShowAdminLogoutPassword] = useState(false);
  const presenceChannelRef = useRef<any>(null);
  const [presenceSessionId] = useState(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });
  const currentTheme = getSidebarTheme();

  useEffect(() => {
    const aplicarCapitalizacaoGlobal = (event: Event) => {
      const campo = event.target;
      if (!(campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement)) return;
      if (deveManterDigitacaoOriginal(campo)) return;

      const valorFormatado = formatarTextoComoNomeProprio(campo.value);
      if (valorFormatado === campo.value) return;

      const inicioSelecao = campo.selectionStart;
      const fimSelecao = campo.selectionEnd;
      const prototipo = campo instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const definicaoDoValor = Object.getOwnPropertyDescriptor(prototipo, 'value');

      definicaoDoValor?.set?.call(campo, valorFormatado);

      if (inicioSelecao !== null && fimSelecao !== null) {
        campo.setSelectionRange(inicioSelecao, fimSelecao);
      }
    };

    document.addEventListener('input', aplicarCapitalizacaoGlobal, true);
    return () => document.removeEventListener('input', aplicarCapitalizacaoGlobal, true);
  }, []);

  const isCatalogRoute = window.location.pathname === '/catalogo';
  const isLocalProgrammerAccess =
    ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
    window.location.port === '3000';

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

  const getUserCity = async () => {
    if (!('geolocation' in navigator)) {
      return 'Local nao disponivel';
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 10 * 60 * 1000
        });
      });

      const { latitude, longitude } = position.coords;
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
      );
      const data = await response.json();
      const city = data.city || data.locality || data.principalSubdivision;
      const state = data.principalSubdivisionCode || data.principalSubdivision;

      if (city && state) return `${city}, ${String(state).replace(/^BR-/, '')}`;
      if (city) return city;
      return 'Local encontrado';
    } catch {
      return 'Local nao autorizado';
    }
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
    const password = window.prompt('Digite a senha para deslogar usuarios:');
    if (password !== logoutPassword) {
      alert('Senha para deslogar usuarios incorreta.');
      return;
    }

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

  const handleOpenAdmin = () => {
    setAdminAccessPassword(accessPassword);
    setAdminLogoutPassword(logoutPassword);
    setIsAdminOpen(true);
  };

  const handleSaveAdminSettings = (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminAccessPassword.trim() || !adminLogoutPassword.trim()) {
      alert('Preencha as duas senhas.');
      return;
    }

    const nextAccessPassword = adminAccessPassword.trim();
    const nextLogoutPassword = adminLogoutPassword.trim();

    localStorage.setItem(ACCESS_PASSWORD_STORAGE_KEY, nextAccessPassword);
    localStorage.setItem(LOGOUT_PASSWORD_STORAGE_KEY, nextLogoutPassword);
    setAccessPassword(nextAccessPassword);
    setLogoutPassword(nextLogoutPassword);
    setIsAdminOpen(false);
    alert('Configuracoes salvas com sucesso.');
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
          if (isAuthenticated && !isLocalProgrammerAccess) {
            const deviceInfo = getDeviceInfo();
            const city = await getUserCity();
            await channel.track({
              sessionId: presenceSessionId,
              device: deviceInfo.device,
              platform: deviceInfo.platform,
              city,
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
  }, [isAuthenticated, isCatalogRoute, isLocalProgrammerAccess, presenceSessionId]);

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
    if (isZooming) return;
    if (passwordInput === accessPassword) {
      setError(false);
      setLogoutMessage('');
      setIsZooming(true);
      setTimeout(() => {
        setIsAuthenticated(true);
        setIsZooming(false);
        sessionStorage.setItem('claudia_auth', 'true');
      }, 700);
    } else {
      setLoginAttempt((attempt) => attempt + 1);
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
      <main className={`login-page${isZooming ? ' login-page--entering' : ''}`}>
        <section className="login-story" aria-label="Claudia Festas e Locações">
          <img className="login-photo" src={loginBackground} alt="" fetchPriority="high" />
          <div className="login-story-shade" />
          <header className="login-brand">
            <div><strong>CLAUDIA FESTAS</strong><span>Festas &amp; locações</span></div>
          </header>
          <div className="login-story-copy">
            <span className="login-eyebrow"><span /> SUA FESTA, NOSSO COMPROMISSO</span>
            <h1>O começo de<br />momentos <em>especiais.</em></h1>
            <p>Cada detalhe preparado com carinho.<br />Tudo para a sua celebração acontecer.</p>
          </div>
          <footer className="login-story-footer">
            <span className="login-services-label">PARA CELEBRAR DO SEU JEITO</span>
            <div className="login-services">
              <span>Mesas &amp; cadeiras</span><span>Louças &amp; taças</span><span>Tendas &amp; muito mais</span>
            </div>
          </footer>
        </section>
        <section className="login-access" aria-labelledby="login-heading">
          <div className="login-access-top">
            <span className="login-small-mark">CF<span>.</span></span>
            <div className="login-support-area">
              <span className="login-management-label">ÁREA DE GESTÃO</span>
              <a className="login-support-button" href="https://wa.me/48991347343" target="_blank" rel="noopener noreferrer" title="Suporte via WhatsApp">
                <i className="fa-brands fa-whatsapp" aria-hidden="true"></i>
                <span>Suporte do Sistema</span>
              </a>
            </div>
          </div>
          <div className="login-form-container">
            <div className="login-welcome-brand">
            <img className="login-welcome-logo" src={loginLogo} alt="Logo Claudia Festas" width="228" height="228" />
            </div>
            <span className="login-form-eyebrow">BEM-VINDO DE VOLTA</span>
            <h2 id="login-heading">Sua próxima festa<br />começa aqui.</h2>
            <p className="login-description">Acesse o sistema para cuidar de cada detalhe.</p>
            <form className="login-form" onSubmit={handleLogin}>
              <label className="login-label" htmlFor="login-password">Senha de acesso</label>
              <div className="login-password-wrap">
                <div key={loginAttempt} className={`login-welcome-icon${isZooming ? ' login-welcome-icon--success' : error ? ' login-welcome-icon--error' : ''}`} aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
                </div>
                <input id="login-password" className="login-password" type={showPassword ? 'text' : 'password'} value={passwordInput}
                  onChange={(event) => { setPasswordInput(event.target.value); setError(false); }}
                  placeholder="Digite sua senha" autoComplete="current-password" aria-invalid={error}
                  aria-describedby={error || logoutMessage ? 'login-message' : undefined} required />
                <button className="login-password-toggle" type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
                    {showPassword && <path d="m3 3 18 18" />}
                  </svg>
                </button>
              </div>
              {(error || logoutMessage) && <p id="login-message" className={`login-message${error ? ' login-message--error' : ''}`} role={error ? 'alert' : 'status'}>{error ? 'Senha incorreta. Tente novamente.' : logoutMessage}</p>}
              <button className="login-submit" type="submit" disabled={isZooming}>
                <span>{isZooming ? 'Entrando…' : 'Entrar no sistema'}</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
              </button>
              <p className="login-access-note">Acesso exclusivo à equipe Claudia Festas.</p>
            </form>
          </div>
          <footer className="login-access-footer"><span>Feito para organizar. Pensado para celebrar.</span><strong>CLAUDIA FESTAS &amp; LOCAÇÕES</strong></footer>
        </section>
      </main>
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
          onLogout={() => handleLogout('Sessao encerrada. Faca login novamente.')}
          onOpenAdmin={handleOpenAdmin}
        />
      </div>

      {isAdminOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-2xl border border-orange-100">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black italic text-gray-900">Administrador</h2>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-600">Senhas do sistema</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center transition-all hover:bg-red-50 hover:text-red-500 active:scale-95"
                title="Fechar"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveAdminSettings} className="space-y-4">
              <div>
                <label className="mb-2 ml-3 block text-[10px] font-black uppercase tracking-widest text-gray-600">Senha de acesso</label>
                <div className="relative">
                  <input
                    type={showAdminAccessPassword ? 'text' : 'password'}
                    value={adminAccessPassword}
                    onChange={(e) => setAdminAccessPassword(e.target.value)}
                    className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 pr-12 text-center text-sm font-black outline-none transition-all focus:border-[#B24D2D]"
                    placeholder="Senha para entrar no sistema"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminAccessPassword(!showAdminAccessPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors hover:text-[#B24D2D]"
                    title={showAdminAccessPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    <i className={`fa-solid ${showAdminAccessPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 ml-3 block text-[10px] font-black uppercase tracking-widest text-gray-600">Senha para deslogar usuarios</label>
                <div className="relative">
                  <input
                    type={showAdminLogoutPassword ? 'text' : 'password'}
                    value={adminLogoutPassword}
                    onChange={(e) => setAdminLogoutPassword(e.target.value)}
                    className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 pr-12 text-center text-sm font-black outline-none transition-all focus:border-[#B24D2D]"
                    placeholder="Senha para encerrar sessoes"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminLogoutPassword(!showAdminLogoutPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors hover:text-[#B24D2D]"
                    title={showAdminLogoutPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    <i className={`fa-solid ${showAdminLogoutPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminOpen(false)}
                  className="flex-1 rounded-2xl bg-gray-100 p-4 text-[10px] font-black uppercase tracking-widest text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-[#B24D2D] p-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-[#943a20] active:scale-95"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
