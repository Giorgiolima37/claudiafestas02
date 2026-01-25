import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const Catalog: React.FC = () => {
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      // Busca apenas itens que tenham pelo menos 1 unidade disponível
      const { data, error } = await db
        .from('estoque')
        .select('item, disponivel, preco, codigo_interno')
        .gt('disponivel', 0)
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
    const mensagem = encodeURIComponent(`Olá! Vi no catálogo o item "${produto}" e gostaria de consultar uma reserva.`);
    window.open(`https://wa.me/5548984123233?text=${mensagem}`, '_blank');
  };

  const itensFiltrados = estoque.filter(i => 
    i.item.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) return <div className="p-20 text-center font-black text-[#b24a2b] animate-pulse">CARREGANDO CATÁLOGO...</div>;

  return (
    <div className="min-h-screen bg-white p-4 md:p-10 font-sans">
      <header className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter">Nosso Estoque</h1>
        <p className="text-[#b24a2b] font-bold text-[10px] uppercase tracking-widest mt-2">Claudia Festas - Itens Disponíveis para Locação</p>
        
        <input 
          type="text" 
          placeholder="O QUE VOCÊ PROCURA?" 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mt-8 w-full max-w-md px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-full text-xs font-black uppercase outline-none focus:border-[#b24a2b] transition-all text-center"
        />
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {itensFiltrados.map((prod, idx) => (
          <div key={idx} className="bg-white border-2 border-gray-50 p-6 rounded-[30px] flex justify-between items-center shadow-sm hover:shadow-md transition-all">
            <div className="flex-1">
              <span className="text-[8px] font-black text-blue-600 uppercase">Cód: {prod.codigo_interno}</span>
              <h3 className="font-black text-gray-800 uppercase text-sm mt-1">{prod.item}</h3>
              <p className="text-[10px] font-bold text-green-600 mt-1 uppercase">✓ {prod.disponivel} DISPONÍVEIS</p>
            </div>
            
            <button 
              onClick={() => enviarWhatsApp(prod.item)}
              className="bg-[#b24a2b] text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              Consultar <i className="fa-brands fa-whatsapp text-xs"></i>
            </button>
          </div>
        ))}
      </div>

      {itensFiltrados.length === 0 && (
        <p className="text-center text-gray-400 font-bold text-xs uppercase mt-20">Nenhum item encontrado no momento.</p>
      )}
    </div>
  );
};

export default Catalog;