import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import logo2 from '../logo-2.png';
import instaLogo from '../insta.webp';
import googleLogo from '../google.webp';

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
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

const Sidebar: React.FC<SidebarProps> = ({ activeScreen, onNavigate }) => {
  const currentTheme = getSidebarTheme();
  const [sidebarTone, setSidebarTone] = useState<number>(() => {
    const storedTone = window.localStorage.getItem(PAGE_TONE_STORAGE_KEY);
    return storedTone ? Number(storedTone) : 0;
  });
  const [isToneControlOpen, setIsToneControlOpen] = useState(false);
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

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Controle da cidade activa (começa em Biguaçu)
  const [currentCity, setCurrentCity] = useState({ name: 'Biguaçu, SC', lat: -27.4939, lon: -48.6592 });
  const [cityIndex, setCityIndex] = useState<number>(0);
  
  // Estados para o campo de busca
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    window.localStorage.setItem(PAGE_TONE_STORAGE_KEY, String(sidebarTone));
    document.documentElement.style.setProperty('--claudia-page-bg', pageBackgroundColor);
  }, [sidebarTone]);

  // Busca o clima baseado na latitude e longitude atuais (incluindo o parâmetro is_day)
  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${currentCity.lat}&longitude=${currentCity.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,rain,is_day&timezone=America/Sao_Paulo`
        );
        
        if (!response.ok) throw new Error("Erro na requisição");
        
        const data = await response.json();
        
        if (data && data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            isRain: data.current.rain > 0,
            isDay: data.current.is_day === 1 // 1 é dia, 0 é noite
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados do clima:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [currentCity]);

  // Navegação nas setas pelas cidades padrão
  const nextCity = () => {
    const nextIdx = (cityIndex + 1) % DEFAULT_CITIES.length;
    setCityIndex(nextIdx);
    setCurrentCity(DEFAULT_CITIES[nextIdx]);
    setIsSearching(false);
  };

  const prevCity = () => {
    const prevIdx = (cityIndex - 1 + DEFAULT_CITIES.length) % DEFAULT_CITIES.length;
    setCityIndex(prevIdx);
    setCurrentCity(DEFAULT_CITIES[prevIdx]);
    setIsSearching(false);
  };

  // Função que busca qualquer cidade de SC via API de Geocoding ao pressionar Enter
  const handleSearchSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      setLoading(true);
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=pt&format=json`
        );
        const data = await response.json();
        
        const scResult = data.results?.find((res: any) => 
          res.admin1 === 'Santa Catarina' || res.timezone?.includes('Sao_Paulo')
        );

        if (scResult) {
          setCurrentCity({
            name: `${scResult.name}, SC`,
            lat: scResult.latitude,
            lon: scResult.longitude
          });
        } else if (data.results && data.results.length > 0) {
          setCurrentCity({
            name: `${data.results[0].name}, SC`,
            lat: data.results[0].latitude,
            lon: data.results[0].longitude
          });
        } else {
          alert('Cidade não encontrada. Tente digitar o nome correto.');
        }
      } catch (err) {
        console.error("Erro ao buscar localização:", err);
      } finally {
        setIsSearching(false);
        setSearchQuery('');
      }
    }
  };

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
          className="bg-[#12d164] hover:bg-[#0ebd57] text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-full flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          title="Suporte via WhatsApp"
        >
          <i className="fa-brands fa-whatsapp text-lg"></i>
          <span>Suporte do Sistema</span>
        </a>
        <button
          type="button"
          onClick={() => setIsToneControlOpen(!isToneControlOpen)}
          className="w-10 h-10 rounded-full bg-white text-[#B24D2D] shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="Ajustar cor da barra lateral"
        >
          <i className="fa-solid fa-sliders text-sm"></i>
        </button>

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
            <div className="mt-1 flex justify-between text-[9px] font-bold uppercase text-gray-400">
              <span>Escura</span>
              <span>Clara</span>
            </div>
          </div>
        )}
      </div>

      {/* Cabeçalho / Logo */}
      <div className="mb-0 mt-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-5">
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir Instagram"
            className="rounded-xl transition-transform hover:scale-110 active:scale-95"
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
            href="https://www.google.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir Google"
            className="rounded-xl transition-transform hover:scale-110 active:scale-95"
          >
            <img
              src={googleLogo}
              alt="Google"
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
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
              activeScreen === item.id 
                ? 'bg-white shadow-lg scale-105' 
                : 'hover:bg-white/10 text-white/80'
            }`}
            style={activeScreen === item.id ? { color: SIDEBAR_BRAND_COLOR } : undefined}
          >
            <i className={`fa-solid ${item.icon} text-lg w-6 text-center`}></i>
            <span className="text-sm tracking-wide uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Widget de Previsão do Tempo */}
      <div
        className="mt-6 mb-6 bg-white/95 text-gray-800 rounded-xl p-4 shadow-xl border max-w-[240px] mx-auto w-full backdrop-blur-sm min-h-[190px] flex flex-col justify-center relative"
        style={{ borderColor: currentTheme.accent }}
      >
        
        {/* Setas de navegação superiores */}
        <div className="absolute top-3 left-4 right-4 flex justify-between z-10">
          <i 
            onClick={prevCity} 
            className="fa-solid fa-arrow-left text-gray-500 text-xs cursor-pointer hover:text-black transition-colors p-1"
          ></i>
          <i 
            onClick={nextCity} 
            className="fa-solid fa-arrow-right text-gray-500 text-xs cursor-pointer hover:text-black transition-colors p-1"
          ></i>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-xs text-gray-400 py-4 font-sans">
            <i className="fa-solid fa-circle-notch animate-spin text-xl text-[#B24D2D]"></i>
            <span>Buscando clima...</span>
          </div>
        ) : weather ? (
          <>
            {/* Localização Dinâmica / Input de Busca */}
            <div className="flex items-center justify-between text-[11px] font-sans mb-2 mt-2 min-h-[22px]">
              <div className="flex items-center gap-1 font-bold text-black flex-1 mr-1">
                <i className="fa-solid fa-location-dot text-gray-600"></i>
                {isSearching ? (
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar cidade..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    onBlur={() => setIsSearching(false)}
                    className="border-b border-gray-400 bg-transparent outline-none w-full text-black font-normal px-0.5 placeholder-gray-400"
                  />
                ) : (
                  <span 
                    onClick={() => setIsSearching(true)} 
                    className="cursor-pointer hover:underline title-transition"
                    title="Clique para buscar qualquer cidade"
                  >
                    {currentCity.name}
                  </span>
                )}
              </div>
              {!isSearching && (
                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">Ao vivo</span>
              )}
            </div>

            {/* Bloco de Temperatura e Ícone Principal */}
            <div className="flex items-center gap-4 my-1 font-sans">
              <div className="w-12 flex justify-center">
                {weather.isRain ? (
                  <i className="fa-solid fa-cloud-showers-heavy text-blue-500 text-4xl"></i>
                ) : weather.isDay ? (
                  <i className="fa-solid fa-sun text-amber-500 text-4xl animate-pulse"></i>
                ) : (
                  <i className="fa-solid fa-moon text-indigo-900 text-4xl drop-shadow-[0_0_4px_rgba(49,46,129,0.3)]"></i>
                )}
              </div>
              
              <div className="flex items-start">
                <span className="text-5xl font-light tracking-tighter text-black">{weather.temp}</span>
                <span className="text-sm font-semibold ml-1 text-gray-500 pt-1">
                  °C<span className="text-gray-300 mx-1 font-normal">|</span>°F
                </span>
              </div>
            </div>

            {/* Abas Internas */}
            <div className="flex border-b border-gray-200 text-[11px] text-center font-sans mb-2 mt-1">
              <div className="flex-1 pb-1 border-b-2 border-amber-500 font-bold text-black">Temperatura</div>
              <div className="flex-1 pb-1 text-gray-400 cursor-not-allowed">Chuva</div>
              <div className="flex-1 pb-1 text-gray-400 cursor-not-allowed">Vento</div>
            </div>

            {/* Detalhes do Clima + Animação ao Lado */}
            <div className="flex items-start justify-between gap-2 text-[11px] text-gray-500 font-sans pl-1">
              <div className="space-y-0.5">
                <div>Chuva: <span className="text-gray-800 font-semibold">{weather.isRain ? 'Sim' : '0%'}</span></div>
                <div>Umidade: <span className="text-gray-800 font-semibold">{weather.humidity}%</span></div>
                <div>Vento: <span className="text-gray-800 font-semibold">{weather.windSpeed} km/h</span></div>
              </div>

              {/* Área gráfica da casinha */}
              <div className={`flex flex-col items-center justify-end h-14 w-16 shrink-0 relative overflow-hidden rounded-xl border border-gray-100 p-1 bg-gradient-to-b ${
                weather.isDay ? 'from-sky-50 to-gray-50' : 'from-slate-900 to-slate-800 border-slate-700'
              }`}>
                {/* Estilos CSS das animações injetados de forma limpa */}
                <style>{`
                  @keyframes rainFall {
                    0% { transform: translateY(-20px); opacity: 0; }
                    20% { opacity: 0.8; }
                    80% { opacity: 0.8; }
                    100% { transform: translateY(28px); opacity: 0; }
                  }
                  @keyframes birdFly {
                    0% { transform: translateX(-25px) translateY(0px) scaleX(1); opacity: 0; }
                    10% { opacity: 0.7; }
                    90% { opacity: 0.7; }
                    100% { transform: translateX(70px) translateY(-5px) scaleX(1); opacity: 0; }
                  }
                  @keyframes starTwinkle {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                  }
                  .rain-drop {
                    animation: rainFall 0.8s linear infinite;
                  }
                  .bird {
                    animation: birdFly 4s linear infinite;
                  }
                  .star {
                    animation: starTwinkle 2s ease-in-out infinite;
                  }
                `}</style>

                {weather.isRain ? (
                  <>
                    {/* Modo Chuva (Independe de ser dia ou noite na animação) */}
                    <div className="absolute inset-0 pointer-events-none z-0">
                      <div className="rain-drop absolute bg-blue-400 w-[1.5px] h-2.5 left-[20%]" style={{ animationDelay: '0s' }}></div>
                      <div className="rain-drop absolute bg-blue-400 w-[1.5px] h-2.5 left-[45%]" style={{ animationDelay: '0.3s' }}></div>
                      <div className="rain-drop absolute bg-blue-400 w-[1.5px] h-2.5 left-[75%]" style={{ animationDelay: '0.15s' }}></div>
                      <div className="rain-drop absolute bg-blue-400 w-[1.5px] h-2.5 left-[30%]" style={{ animationDelay: '0.5s' }}></div>
                      <div className="rain-drop absolute bg-blue-400 w-[1.5px] h-2.5 left-[60%]" style={{ animationDelay: '0.65s' }}></div>
                    </div>
                    <i className="fa-solid fa-house text-amber-700 text-2xl z-10 mb-0.5 drop-shadow-sm"></i>
                  </>
                ) : weather.isDay ? (
                  <>
                    {/* Modo Dia - Sol Lindo + Pássaros */}
                    <div className="absolute inset-0 pointer-events-none z-0">
                      <i 
                        className="fa-solid fa-crow bird absolute text-gray-400 text-[7px] top-3 left-0" 
                        style={{ animationDelay: '0s', animationDuration: '4.5s' }}
                      ></i>
                      <i 
                        className="fa-solid fa-crow bird absolute text-gray-400 text-[6px] top-1 left-0" 
                        style={{ animationDelay: '2s', animationDuration: '3.8s' }}
                      ></i>
                    </div>

                    <i className="fa-solid fa-sun text-yellow-500 text-xs absolute top-1.5 right-3 animate-spin [animation-duration:20s] drop-shadow-[0_0_3px_rgba(234,179,8,0.5)]"></i>
                    <i className="fa-solid fa-house text-amber-700 text-2xl z-10 mb-0.5 drop-shadow-sm"></i>
                  </>
                ) : (
                  <>
                    {/* Modo Noite - Lua Linda + Estrelas Piscando */}
                    <div className="absolute inset-0 pointer-events-none z-0">
                      <i className="fa-solid fa-star star absolute text-yellow-200 text-[4px] top-2 left-3" style={{ animationDelay: '0s' }}></i>
                      <i className="fa-solid fa-star star absolute text-yellow-100 text-[3px] top-4 left-6" style={{ animationDelay: '0.5s' }}></i>
                      <i className="fa-solid fa-star star absolute text-yellow-200 text-[4px] top-1 right-7" style={{ animationDelay: '1.2s' }}></i>
                    </div>

                    <i className="fa-solid fa-moon text-yellow-100 text-[10px] absolute top-1.5 right-3 drop-shadow-[0_0_3px_rgba(254,240,138,0.5)]"></i>
                    <i className="fa-solid fa-house text-amber-600 text-2xl z-10 mb-0.5 drop-shadow-sm"></i>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-[11px] text-red-500 font-sans py-4">
            Não foi possível carregar o clima.
          </div>
        )}
      </div>

    </div>
  );
};

export default Sidebar;
