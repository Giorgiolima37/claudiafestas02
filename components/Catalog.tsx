import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const Catalog: React.FC = () => {
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('TODOS');

  // Definição das categorias para o filtro
  const categorias = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'MESA', label: 'Mesas' },
    { id: 'CADEIRA', label: 'Cadeiras' },
    { id: 'TOALHA', label: 'Toalhas' },
    { id: 'TALHER', label: 'Talheres' },
    { id: 'BALDE', label: 'Baldes' },
    { id: 'BRINQUEDO', label: 'Brinquedos' },
    { id: 'TAÇA', label: 'Taças' },
    { id: 'PRATO', label: 'Pratos' },
  ];

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      // Busca todos os itens do estoque para mostrar inclusive os esgotados
      const { data, error } = await db
        .from('estoque')
        .select('item, disponivel, preco, codigo_interno')
        .order('item');

      if (error) throw error;
      setEstoque(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar catálogo:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCatalog(); }, []);

  const enviarWhatsApp = (produto: string) => {
    const mensagem = encodeURIComponent(`Olá! Vi no seu catálogo o item "${produto}" e gostaria de consultar a disponibilidade para reserva.`);
    window.open(`https://wa.me/5548984123233?text=${mensagem}`, '_blank');
  };

  // Lógica de filtragem combinada (Busca + Categoria)
  const itensFiltrados = estoque.filter(i => {
    const matchesBusca = i.item.toLowerCase().includes(busca.toLowerCase());
    const matchesCategoria = categoriaAtiva === 'TODOS' || i.item.toUpperCase().includes(categoriaAtiva);
    return matchesBusca && matchesCategoria;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdf8f6]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#b24a2b] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-[#b24a2b] uppercase tracking-widest text-xs">Atualizando Acervo...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdf8f6] font-sans selection:bg-orange-100 pb-20">
      {/* Header Premium */}
      <header className="pt-16 pb-8 px-6 text-center">
        <div className="inline-block px-4 py-1.5 bg-white border border-orange-100 rounded-full mb-4 shadow-sm">
            <span className="text-[#b24a2b] font-black text-[10px] uppercase tracking-[0.2em]">Locações Claudia Festas</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">
            Nosso <span className="text-[#b24a2b]">Estoque</span>
        </h1>
        
        {/* Barra de Busca */}
        <div className="max-w-2xl mx-auto mt-10 relative">
          <input 
            type="text" 
            placeholder="O QUE VOCÊ PRECISA PARA SUA FESTA?" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-8 py-6 bg-white border-none rounded-[30px] text-sm font-bold uppercase outline-none shadow-xl shadow-orange-100/30 focus:ring-2 ring-[#b24a2b]/20 transition-all text-center"
          />
        </div>
      </header>

      {/* Navegação de Categorias */}
      <nav className="flex flex-wrap justify-center gap-2 mb-12 px-6 max-w-5xl mx-auto">
        {categorias.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaAtiva(cat.id)}
            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              categoriaAtiva === cat.id 
              ? 'bg-[#b24a2b] text-white shadow-lg shadow-orange-200' 
              : 'bg-white text-gray-400 hover:text-gray-600 border border-orange-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      {/* Grid de Cards */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {itensFiltrados.map((prod, idx) => (
          <div 
            key={idx} 
            className="group bg-white rounded-[45px] p-8 border border-white hover:border-orange-100 transition-all duration-500 shadow-sm hover:shadow-2xl"
          >
            <div className="flex justify-between items-start mb-8">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Cód. {prod.codigo_interno}</span>
                {/* Indicador visual de status */}
                <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${prod.disponivel > 0 ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}`}></div>
            </div>

            <h3 className="font-black text-gray-800 uppercase text-lg leading-tight mb-1 min-h-[50px]">
                {prod.item}
            </h3>

            {/* Indicador de Quantidade em Estoque - NOVA FUNÇÃO SOLICITADA */}
            <div className="flex items-center gap-2 mb-6">
                <div className={`w-2 h-2 rounded-full ${prod.disponivel > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-[11px] font-black uppercase tracking-widest ${prod.disponivel > 0 ? 'text-gray-400' : 'text-red-500'}`}>
                    {prod.disponivel > 0 
                        ? `${prod.disponivel} unidades disponíveis` 
                        : 'Esgotado no momento'}
                </span>
            </div>
            
            <div className="flex flex-col gap-1 mb-10">
                <span className="text-2xl font-black text-[#b24a2b]">R$ {prod.preco?.toFixed(2)}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Preço por unidade de locação</span>
            </div>

            <button 
              onClick={() => enviarWhatsApp(prod.item)}
              className="w-full bg-gray-900 group-hover:bg-[#b24a2b] text-white py-5 rounded-[25px] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
            >
              Consultar <i className="fa-brands fa-whatsapp text-lg"></i>
            </button>
          </div>
        ))}
      </div>

      {/* Estado Vazio */}
      {itensFiltrados.length === 0 && (
        <div className="py-20 text-center">
            <i className="fa-solid fa-magnifying-glass text-gray-200 text-5xl mb-6"></i>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Nenhum item encontrado nesta categoria.</p>
        </div>
      )}
    </div>
  );
};

export default Catalog;