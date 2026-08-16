import React, { useState, useEffect } from 'react';
import { ActiveUserPresence, Screen } from '../types';
import logo2 from '../logo-2.png';
import instaLogo from '../insta.webp';
import googleLogo from '../google.webp';

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  activeUsers?: number;
  activeUserDetails?: ActiveUserPresence[];
  currentPresenceSessionId?: string;
  onLogoutSession?: (sessionId: string) => void;
  onOpenAdmin?: () => void;
}

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  isRain: boolean;
  isDay: boolean; // Nova propriedade para controlar dia/noite vinda da API
}

// Cidades principais para navegação rápida nas setas
const DEFAULT_CITIES = [
  { name: 'Biguaçu, SC', lat: -27.4939, lon: -48.6592 },
  { name: 'Florianópolis, SC', lat: -27.5954, lon: -48.5480 },
  { name: 'São José, SC', lat: -27.6146, lon: -48.6334 },
  { name: 'Palhoça, SC', lat: -27.6458, lon: -48.6701 },
  { name: 'Balneário Camboriú, SC', lat: -26.9926, lon: -48.6346 },
  { name: 'Joinville, SC', lat: -26.3045, lon: -48.8434 },
  { name: 'Blumenau, SC', lat: -26.9194, lon: -49.0661 },
  { name: 'Chapecó, SC', lat: -27.1008, lon: -52.6152 },
  { name: 'Lages, SC', lat: -27.8161, lon: -50.3262 },
  { name: 'Criciúma, SC', lat: -28.6775, lon: -49.3701 }
];

export interface SidebarTheme {
  month: number;
  name: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  badgeBackground: string;
  badgeText: string;
}

const SIDEBAR_THEMES: SidebarTheme[] = [
  { month: 1, name: 'Janeiro Branco', label: 'Saude mental', primary: '#f8fafc', secondary: '#e2e8f0', accent: '#0f172a', text: '#0f172a', badgeBackground: '#ffffff', badgeText: '#111827' },
  { month: 2, name: 'Fevereiro Roxo', label: 'Conscientizacao', primary: '#7c3aed', secondary: '#a855f7', accent: '#f5d0fe', text: '#ffffff', badgeBackground: '#7c3aed', badgeText: '#ffffff' },
  { month: 3, name: 'Marco Lilas', label: 'Saude da mulher', primary: '#9333ea', secondary: '#c084fc', accent: '#f3e8ff', text: '#ffffff', badgeBackground: '#c084fc', badgeText: '#111827' },
  { month: 4, name: 'Abril Azul', label: 'Inclusao e autismo', primary: '#2563eb', secondary: '#38bdf8', accent: '#dbeafe', text: '#ffffff', badgeBackground: '#2563eb', badgeText: '#ffffff' },
  { month: 5, name: 'Maio Amarelo', label: 'Atencao no transito', primary: '#ca8a04', secondary: '#facc15', accent: '#fef3c7', text: '#ffffff', badgeBackground: '#facc15', badgeText: '#111827' },
  { month: 6, name: 'Junho Vermelho', label: 'Doacao de sangue', primary: '#b91c1c', secondary: '#ef4444', accent: '#fee2e2', text: '#ffffff', badgeBackground: '#ef4444', badgeText: '#ffffff' },
  { month: 7, name: 'Julho Amarelo', label: 'Hepatites virais', primary: '#B24D2D', secondary: '#B24D2D', accent: '#fff7ed', text: '#ffffff', badgeBackground: '#facc15', badgeText: '#111827' },
  { month: 8, name: 'Agosto Dourado', label: 'Amamentacao', primary: '#a16207', secondary: '#eab308', accent: '#fef9c3', text: '#ffffff', badgeBackground: '#eab308', badgeText: '#111827' },
  { month: 9, name: 'Setembro Amarelo', label: 'Valorizacao da vida', primary: '#b45309', secondary: '#fbbf24', accent: '#fef3c7', text: '#ffffff', badgeBackground: '#fbbf24', badgeText: '#111827' },
  { month: 10, name: 'Outubro Rosa', label: 'Prevencao', primary: '#be185d', secondary: '#f472b6', accent: '#fce7f3', text: '#ffffff', badgeBackground: '#f472b6', badgeText: '#111827' },
  { month: 11, name: 'Novembro Azul', label: 'Saude do homem', primary: '#1d4ed8', secondary: '#60a5fa', accent: '#dbeafe', text: '#ffffff', badgeBackground: '#1d4ed8', badgeText: '#ffffff' },
  { month: 12, name: 'Dezembro Vermelho', label: 'Conscientizacao', primary: '#b91c1c', secondary: '#f97316', accent: '#ffedd5', text: '#ffffff', badgeBackground: '#ef4444', badgeText: '#ffffff' }
];

const SIDEBAR_BRAND_COLOR = '#B24D2D';
const PAGE_TONE_STORAGE_KEY = 'claudia_page_tone';
const PAGE_BACKGROUND_COLOR = '#fdf8f6';

const adjustHexColor = (hex: string, amount: number) => {
  const value = hex.replace('#', '');
  const numeric = parseInt(value, 16);
  const red = Math.max(0, Math.min(255, (numeric >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((numeric >> 8) & 0x00ff) + amount));
  const blue = Math.max(0, Math.min(255, (numeric & 0x0000ff) + amount));

  return `#${((red << 16) | (green << 8) | blue).toString(16).padStart(6, '0')}`;
};

export const getSidebarTheme = () => {
  const currentMonth = new Date().getMonth() + 1;
  return SIDEBAR_THEMES.find(theme => theme.month === currentMonth) || SIDEBAR_THEMES[0];
};

const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  activeUsers = 0,
  activeUserDetails = [],
  currentPresenceSessionId,
  onLogoutSession,
  onOpenAdmin
}) => {
  const currentTheme = getSidebarTheme();
  const [sidebarTone, setSidebarTone] = useState<number>(() => {
    const storedTone = window.localStorage.getItem(PAGE_TONE_STORAGE_KEY);
    return storedTone ? Number(storedTone) : 0;
  });
  const [isToneControlOpen, setIsToneControlOpen] = useState(false);
  const [isPresenceOpen, setIsPresenceOpen] = useState(false);
  const pageBackgroundColor = adjustHexColor(PAGE_BACKGROUND_COLOR, sidebarTone);
  const controlBorderOpacity = Math.min(0.35, 0.08 + Math.abs(sidebarTone) / 130);
  const menuItems: Array<{ id: Screen | 'NFSE-BIGUACU'; label: string; icon: string; href?: string }> = [
    { id: 'LISTAGEM', label: 'Clientes', icon: 'fa-users' },
    { id: 'RESERVA', label: 'Reservas', icon: 'fa-calendar-check' },
    { id: 'PEDIDOS', label: 'Pedidos', icon: 'fa-rectangle-list' },
    { id: 'ORCAMENTO', label: 'Orçamento', icon: 'fa-file-signature' },
    { id: 'ESTOQUE', label: 'Estoque', icon: 'fa-boxes-stacked' },
    { id: 'CAIXA', label: 'Caixa', icon: 'fa-file-invoice-dollar' },
    {
      id: 'NFSE-BIGUACU',
      label: 'NFSe-Biguaçu',
      icon: 'fa-file-shield',
      href: 'https://nfse-bigua.atende.net/autoatendimento/servicos/nfse?redirected=1'
    }
  ];

  useEffect(() => {
    window.localStorage.setItem(PAGE_TONE_STORAGE_KEY, String(sidebarTone));
    document.documentElement.style.setProperty('--claudia-page-bg', pageBackgroundColor);
  }, [sidebarTone]);

  // Busca o clima baseado na latitude e longitude atuais (incluindo o parâmetro is_day)
  return (
    <div
      className="relative w-full h-full flex flex-col p-6 shadow-2xl overflow-y-auto transition-colors duration-700"
      style={{
        background: SIDEBAR_BRAND_COLOR,
        color: '#ffffff'
      }}
    >
      <div className="fixed right-10 top-7 z-[80] flex items-center gap-3">
        <a
          href="https://wa.me/48991347343"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#12d164] hover:bg-[#0ebd57] text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-full flex items-center justify-center gap-2 shadow-md transition-all duration-300 transform-gpu hover:scale-110 hover:-translate-y-2 hover:shadow-[0_18px_35px_rgba(0,0,0,0.32)] active:scale-[0.98]"
          title="Suporte via WhatsApp"
        >
          <i className="fa-brands fa-whatsapp text-lg"></i>
          <span>Suporte do Sistema</span>
        </a>
        <div className="relative flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setIsToneControlOpen(!isToneControlOpen)}
            className="w-10 h-10 rounded-full bg-white text-[#B24D2D] shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Ajustar cor da barra lateral"
          >
            <i className="fa-solid fa-sliders text-sm"></i>
          </button>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="w-10 h-10 rounded-full bg-white text-[#B24D2D] shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Administrador"
          >
            <i className="fa-solid fa-gear text-sm"></i>
          </button>
        </div>

        {isToneControlOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-white p-3 text-gray-700 border"
            style={{
              borderColor: `rgba(178, 77, 45, ${controlBorderOpacity})`,
              boxShadow: `0 18px 36px rgba(0,0,0,${controlBorderOpacity})`
            }}
          >
            <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
              <span>Cor</span>
              <button
                type="button"
                onClick={() => setSidebarTone(0)}
                className="text-[#B24D2D] hover:underline"
              >
                Padrão
              </button>
            </div>
            <input
              type="range"
              min="-35"
              max="15"
              value={sidebarTone}
              onChange={(event) => setSidebarTone(Number(event.target.value))}
              className="w-full accent-[#B24D2D]"
              aria-label="Clarear ou escurecer a barra lateral"
            />
            <div className="mt-1 flex justify-between text-[9px] font-bold uppercase text-gray-600">
              <span>Escura</span>
              <span>Clara</span>
            </div>
          </div>
        )}
      </div>

      {/* Cabeçalho / Logo */}
      <div className="mb-0 mt-4 text-center">
        <div className="relative mb-3 inline-block">
          <button
            type="button"
            onClick={() => setIsPresenceOpen(!isPresenceOpen)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#B24D2D] shadow-sm transition-all hover:bg-white active:scale-95"
            title="Ver dispositivos conectados"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"></span>
            <span>{activeUsers || 0} {activeUsers === 1 ? 'usuario online' : 'usuarios online'}</span>
          </button>

          {isPresenceOpen && (
            <div className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-2xl bg-white p-3 text-left text-gray-800 shadow-xl border border-orange-100">
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
                          {user.city && (
                            <p className="text-[9px] font-bold uppercase text-gray-600 leading-tight">
                              <i className="fa-solid fa-location-dot mr-1 text-[8px]"></i>{user.city}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <button
                          type="button"
                          onClick={() => onLogoutSession?.(user.sessionId)}
                          className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center transition-all hover:bg-red-500 hover:text-white active:scale-95"
                          title={user.sessionId === currentPresenceSessionId ? 'Deslogar esta sessao' : 'Deslogar esta pessoa'}
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
        <div className="flex items-center justify-center gap-3 mb-5">
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir Instagram"
            className="rounded-xl transition-all duration-300 transform-gpu hover:scale-125 hover:-translate-y-2 hover:shadow-[0_18px_35px_rgba(0,0,0,0.32)] active:scale-[0.98]"
          >
            <img
              src={instaLogo}
              alt="Instagram"
              className="w-10 h-10 object-contain rounded-xl"
            />
          </a>
          <div className="w-32 h-32 flex items-center justify-center overflow-hidden rounded-full bg-white">
          <img src={logo2} alt="Logo Claudia Festas" className="w-full h-full object-contain scale-[1.6]" />
          </div>
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir Google Maps"
            className="rounded-xl transition-all duration-300 transform-gpu hover:scale-125 hover:-translate-y-2 hover:shadow-[0_18px_35px_rgba(0,0,0,0.32)] active:scale-[0.98]"
          >
            <img
              src={googleLogo}
              alt="Google Maps"
              className="w-10 h-10 object-contain rounded-xl"
            />
          </a>
        </div>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.href) {
                window.open(item.href, '_blank', 'noopener,noreferrer');
                return;
              }

              onNavigate(item.id);
            }}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 transform-gpu hover:scale-110 hover:-translate-y-2 hover:shadow-[0_18px_35px_rgba(0,0,0,0.32)] active:scale-[0.98] ${
              activeScreen === item.id 
                ? 'bg-white shadow-xl scale-[1.05]' 
                : 'hover:bg-white/10 text-white/80'
            }`}
            style={activeScreen === item.id ? { color: SIDEBAR_BRAND_COLOR } : undefined}
          >
            <i className={`fa-solid ${item.icon} text-lg w-6 text-center`}></i>
            <span className="text-sm tracking-wide uppercase">{item.label}</span>
          </button>
        ))}
      </nav>


    </div>
  );
};

export default Sidebar;
