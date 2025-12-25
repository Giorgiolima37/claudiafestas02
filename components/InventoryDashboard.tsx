import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const InventoryDashboard: React.FC = () => {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState(''); // Estado para o texto da pesquisa
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const fetchEstoque = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.from('estoque').select('*').order('item');
      if (error) throw error;
      setItens(data || []);
    } catch (err: any) {
      console.error("Erro:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEstoque(); }, []);

  // Lógica para filtrar os itens conforme a busca
  const itensFiltrados = itens.filter(item => 
    item.item.toLowerCase().includes(busca.toLowerCase()) || 
    (item.codigo_interno && item.codigo_interno.toLowerCase().includes(busca.toLowerCase()))
  );

  const handleOpenEditModal = (item: any) => {
    setEditingItem({ ...item });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await db
      .from('estoque')
      .update({
        item: editingItem.item,
        codigo_interno: editingItem.codigo_interno,
        disponivel: parseInt(editingItem.disponivel),
        preco: parseFloat(editingItem.preco)
      })
      .eq('id', editingItem.id);

    if (error) {
      alert("Erro ao atualizar!");
    } else {
      setIsEditModalOpen(false);
      fetchEstoque();
    }
  };

  const adicionarNovoItem = async () => {
    const nome = prompt("Nome do novo material:");
    if (!nome) return;
    const codigo = prompt(`Código interno para ${nome}:`);
    const quantidade = prompt(`Quantidade de ${nome}:`, "100");
    const preco = prompt(`Preço de ${nome}:`, "10.00");

    if (nome && quantidade && preco) {
      await db.from('estoque').insert([{ 
        item: nome, 
        codigo_interno: codigo,
        disponivel: parseInt(quantidade), 
        reservado: 0, 
        preco: parseFloat(preco) 
      }]);
      fetchEstoque();
    }
  };

  if (loading) return <div className="text-center p-20 font-bold text-[#b24a2b] animate-pulse">CARREGANDO...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <h1 className="text-5xl font-black text-gray-900 italic">Painel de <span className="text-[#b24a2b]">Estoque</span></h1>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* BARRA DE PESQUISA COM LUPA */}
          <div className="relative flex-1 md:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text"
              placeholder="Pesquisar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-full shadow-sm outline-none focus:ring-2 focus:ring-[#b24a2b]/20 transition-all font-medium text-gray-600"
            />
          </div>

          <button 
            onClick={adicionarNovoItem} 
            className="bg-[#b24a2b] text-white px-8 py-4 rounded-full font-black uppercase text-xs shadow-lg hover:scale-105 transition-all whitespace-nowrap"
          >
            <i className="fa-solid fa-plus mr-2"></i> Novo Material
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 text-center">
        {itensFiltrados.map((item) => (
          <div key={item.id} className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-50 group hover:shadow-xl transition-all relative">
            
            <div className="absolute top-6 left-10 bg-gray-100 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border border-gray-200">
                ID: {item.codigo_interno || '---'}
            </div>

            <button 
              onClick={() => handleOpenEditModal(item)}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 p-2 rounded-full hover:bg-gray-200 text-gray-500"
            >
              <i className="fa-solid fa-pen text-sm"></i>
            </button>

            <div className="flex items-center justify-between mb-8 mt-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#b24a2b]">
                    <i className={`fa-solid ${item.item.toLowerCase().includes('cadeira') ? 'fa-chair' : 'fa-box-open'} text-2xl`}></i>
                </div>
                <h2 className="text-2xl font-black text-gray-800">{item.item}</h2>
              </div>
              <div className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black italic">
                R$ {item.preco?.toFixed(2).replace('.', ',')}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="w-full flex justify-between p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100/30">
                <span className="text-[10px] font-black text-emerald-600 uppercase">Disponível</span>
                <span className="text-2xl font-black text-emerald-600">{item.disponivel}</span>
              </div>
              <div className="flex justify-between p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/30">
                <span className="text-[10px] font-black text-indigo-600 uppercase">Reservado</span>
                <span className="text-2xl font-black text-indigo-600">{item.reservado}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Caso a busca não retorne nada */}
      {itensFiltrados.length === 0 && (
        <div className="text-center py-20 text-gray-400 italic">Nenhum material encontrado com "{busca}"</div>
      )}

      {/* --- MODAL DE EDIÇÃO --- */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-6 text-gray-900 italic text-center">Editar <span className="text-[#b24a2b]">Material</span></h2>
            
            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">Cód. Interno</label>
                  <input 
                    type="text" 
                    value={editingItem.codigo_interno || ''}
                    onChange={(e) => setEditingItem({...editingItem, codigo_interno: e.target.value})}
                    placeholder="Ex: 1331"
                    className="w-full bg-gray-100 border-none rounded-2xl p-4 font-bold text-[#b24a2b]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">Nome do Material</label>
                  <input 
                    type="text" 
                    value={editingItem.item}
                    onChange={(e) => setEditingItem({...editingItem, item: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">Qtd Disponível</label>
                  <input 
                    type="number" 
                    value={editingItem.disponivel}
                    onChange={(e) => setEditingItem({...editingItem, disponivel: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">Preço Unitário</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingItem.preco}
                    onChange={(e) => setEditingItem({...editingItem, preco: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-full font-black uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 bg-[#b24a2b] text-white py-4 rounded-full font-black uppercase text-xs shadow-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;