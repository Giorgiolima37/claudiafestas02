import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const InventoryDashboard: React.FC = () => {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o Modal de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [originalQtd, setOriginalQtd] = useState<number>(0);

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

  const handleOpenEditModal = (item: any) => {
    setEditingItem({ ...item });
    setOriginalQtd(item.disponivel); // Guarda a quantidade atual para calcular a diferença
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const novaQtd = parseInt(editingItem.disponivel);
    const diferenca = novaQtd - originalQtd;

    try {
      // 1. Atualiza o estoque principal
      const { error: updateError } = await db
        .from('estoque')
        .update({
          item: editingItem.item,
          disponivel: novaQtd,
          preco: parseFloat(editingItem.preco)
        })
        .eq('id', editingItem.id);

      if (updateError) throw updateError;

      // 2. REGISTRA NO HISTÓRICO (Tabela movimentacoes) se houver mudança na quantidade
      if (diferenca !== 0) {
        await db.from('movimentacoes').insert([{
          item_id: editingItem.id,
          nome: editingItem.item,
          quantidade: Math.abs(diferenca),
          Tipo: diferenca > 0 ? 'entrada' : 'saida',
          data: new Date().toISOString()
        }]);
      }

      setIsEditModalOpen(false);
      fetchEstoque();
    } catch (error) {
      alert("Erro ao atualizar!");
      console.error(error);
    }
  };

  const adicionarNovoItem = async () => {
    const nome = prompt("Nome do novo material:");
    if (!nome) return;
    const quantidade = prompt(`Quantidade de ${nome}:`, "100");
    const preco = prompt(`Preço de ${nome}:`, "10.00");

    if (nome && quantidade && preco) {
      const { data, error } = await db.from('estoque').insert([{ 
        item: nome, 
        disponivel: parseInt(quantidade), 
        reservado: 0, 
        preco: parseFloat(preco) 
      }]).select();

      // Registra a entrada inicial no histórico
      if (!error && data) {
        await db.from('movimentacoes').insert([{
          item_id: data[0].id,
          nome: nome,
          quantidade: parseInt(quantidade),
          Tipo: 'entrada'
        }]);
      }
      fetchEstoque();
    }
  };

  if (loading) return <div className="text-center p-20 font-bold text-[#b24a2b] animate-pulse">CARREGANDO...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-12 flex justify-between items-center">
        <h1 className="text-5xl font-black text-gray-900 italic">Painel de <span className="text-[#b24a2b]">Estoque</span></h1>
        
        <div className="flex gap-4">
          <button 
            onClick={adicionarNovoItem} 
            className="bg-[#b24a2b] text-white px-8 py-4 rounded-full font-black uppercase text-xs shadow-lg hover:scale-105 transition-all"
          >
            <i className="fa-solid fa-plus mr-2"></i> Novo Material
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 text-center">
        {itens.map((item) => (
          <div key={item.id} className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-50 group hover:shadow-xl transition-all relative">
            <button 
              onClick={() => handleOpenEditModal(item)}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 p-2 rounded-full hover:bg-gray-200 text-gray-500"
            >
              <i className="fa-solid fa-pen text-sm"></i>
            </button>

            <div className="flex items-center justify-between mb-8 text-left">
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

      {/* MODAL DE EDIÇÃO */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-6 text-gray-900 italic text-center">Editar <span className="text-[#b24a2b]">Material</span></h2>
            <form onSubmit={handleSaveEdit} className="space-y-6">
              <input 
                type="text" 
                value={editingItem.item}
                onChange={(e) => setEditingItem({...editingItem, item: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold"
                placeholder="Nome do material"
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  value={editingItem.disponivel}
                  onChange={(e) => setEditingItem({...editingItem, disponivel: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold"
                  placeholder="Qtd Disponível"
                />
                <input 
                  type="number" 
                  step="0.01"
                  value={editingItem.preco}
                  onChange={(e) => setEditingItem({...editingItem, preco: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold"
                  placeholder="Preço"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 py-4 rounded-full font-black uppercase text-xs">Cancelar</button>
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