import React, { useState, useEffect } from 'react';
import { Screen } from '../types';

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

const Sidebar: React.FC<SidebarProps> = ({ activeScreen, onNavigate }) => {
  const menuItems = [
    { id: 'LISTAGEM', label: 'Clientes', icon: 'fa-users' },
    { id: 'RESERVA', label: 'Reservas', icon: 'fa-calendar-check' },
    { id: 'PEDIDOS', label: 'Pedidos', icon: 'fa-rectangle-list' },
    { id: 'ESTOQUE', label: 'Estoque', icon: 'fa-boxes-stacked' },
    { id: 'CAIXA', label: 'Caixa', icon: 'fa-file-invoice-dollar' },
    { id: 'NFSe-Biguaçu', label: 'NFSe-Biguaçu', icon: 'fa-file-shield' }
  ];

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Controle da cidade activa (começa em Biguaçu)
  const [currentCity, setCurrentCity] = useState({ name: 'Biguaçu, SC', lat: -27.4939, lon: -48.6592 });
  const [cityIndex, setCityIndex] = useState<number>(0);
  
  // Estados para o campo de busca
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    <div className="w-full h-full bg-[#B24D2D] text-white flex flex-col p-6 shadow-2xl overflow-y-auto">
      {/* Cabeçalho / Logo */}
      <div className="mb-10 mt-4 text-center">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Claudia</h2>
        <p className="text-[10px] font-bold opacity-60 tracking-[0.3em] uppercase">Festas & Locações</p>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Screen)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
              activeScreen === item.id 
                ? 'bg-white text-[#B24D2D] shadow-lg scale-105' 
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg w-6 text-center`}></i>
            <span className="text-sm tracking-wide uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Widget de Previsão do Tempo */}
      <div className="mt-6 mb-6 bg-white/95 text-gray-800 rounded-xl p-4 shadow-xl border border-white/20 max-w-[240px] mx-auto w-full backdrop-blur-sm min-h-[145px] flex flex-col justify-center relative">
        
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
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-sans pl-1">
              <div className="space-y-0.5">
                <div>Chuva: <span className="text-gray-800 font-semibold">{weather.isRain ? 'Sim' : '0%'}</span></div>
                <div>Umidade: <span className="text-gray-800 font-semibold">{weather.humidity}%</span></div>
                <div>Vento: <span className="text-gray-800 font-semibold">{weather.windSpeed} km/h</span></div>
              </div>

              {/* Área gráfica da casinha */}
              <div className={`flex flex-col items-center justify-end h-14 w-16 relative overflow-hidden rounded-xl border border-gray-100 mr-1 p-1 bg-gradient-to-b ${
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

      {/* Rodapé - Suporte do Sistema */}
      <div className="pt-4 border-t border-white/10 flex justify-center">
        <a
          href="https://wa.me/48991347343"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#12d164] hover:bg-[#0ebd57] text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-full flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
        >
          <i className="fa-brands fa-whatsapp text-lg"></i>
          <span>Suporte do Sistema</span>
        </a>
      </div>
    </div>
  );
};

export default Sidebar;