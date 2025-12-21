import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const InventoryDashboard: React.FC = () => {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // FUNÇÃO PARA EDITAR PREÇO COM SENHA
  const editarPreco = async (id: string, precoAtual: number) => {
    const senhaAcesso = prompt("Digite a senha de administrador:");
    if (senhaAcesso !== 'admin123') {
      alert("Senha incorreta!");
      return;
    }
    const novoPreco = prompt("Digite o novo valor unitário:", precoAtual.toString());
    if (novoPreco !== null && !isNaN(parseFloat(novoPreco))) {
      await db.from('estoque').update({ preco: parseFloat(novoPreco) }).eq('id', id);
      fetchEstoque();
    }
  };

  // NOVA FUNÇÃO: EDITAR UNIDADES DISPONÍVEIS
  const editarDisponivel = async (id: string, qtdAtual: number, nomeItem: string) => {
    const senhaAcesso = prompt("Digite a senha de administrador para alterar o estoque:");
    if (senhaAcesso !== 'admin123') {
      alert("Senha incorreta!");
      return;
    }
    const novaQtd = prompt(`Alterar unidades disponíveis de ${nomeItem}:`, qtdAtual.toString());
    if (novaQtd !== null && !isNaN(parseInt(novaQtd))) {
      const { error } = await db
        .from('estoque')
        .update({ disponivel: parseInt(novaQtd) })
        .eq('id', id);

      if (error) alert("Erro ao atualizar estoque.");
      else fetchEstoque();
    }
  };

  const adicionarNovoItem = async () => {
    const nome = prompt("Nome do novo material:");
    if (!nome) return;
    const quantidade = prompt(`Quantidade de ${nome}:`, "100");
    const preco = prompt(`Preço de ${nome}:`, "10.00");

    if (nome && quantidade && preco) {
      await db.from('estoque').insert([{ 
        item: nome, 
        disponivel: parseInt(quantidade), 
        reservado: 0, 
        preco: parseFloat(preco) 
      }]);
      fetchEstoque();
    }
  };

  useEffect(() => { fetchEstoque(); }, []);

  if (loading) return <div className="text-center p-20 font-bold text-[#b24a2b] animate-pulse">CARREGANDO...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-12 flex justify-between items-center">
        <h1 className="text-5xl font-black text-gray-900 italic">Painel de <span className="text-[#b24a2b]">Estoque</span></h1>
        <button onClick={adicionarNovoItem} className="bg-[#b24a2b] text-white px-8 py-4 rounded-full font-black uppercase text-xs shadow-lg hover:scale-105 transition-all">
          <i className="fa-solid fa-plus mr-2"></i> Novo Material
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 text-center">
        {itens.map((item) => (
          <div key={item.id} className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-50 group hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-8 text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#b24a2b]">
                   <i className={`fa-solid ${item.item.toLowerCase().includes('cadeira') ? 'fa-chair' : 'fa-box-open'} text-2xl`}></i>
                </div>
                <h2 className="text-2xl font-black text-gray-800">{item.item}</h2>
              </div>
              <button onClick={() => editarPreco(item.id, item.preco)} className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black">
                R$ {item.preco?.toFixed(2).replace('.', ',')}
              </button>
            </div>
            
            <div className="space-y-4">
              {/* ÁREA CLICÁVEL: DISPONÍVEL */}
              <button 
                onClick={() => editarDisponivel(item.id, item.disponivel, item.item)}
                title="Clique para alterar a quantidade"
                className="w-full flex justify-between p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100/30 hover:bg-emerald-100 transition-colors"
              >
                <span className="text-[10px] font-black text-emerald-600 uppercase">Disponível</span>
                <span className="text-2xl font-black text-emerald-600">{item.disponivel}</span>
              </button>

              <div className="flex justify-between p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/30">
                <span className="text-[10px] font-black text-indigo-600 uppercase">Reservado</span>
                <span className="text-2xl font-black text-indigo-600">{item.reservado}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center text-gray-300">
               <span className="text-[9px] font-black uppercase">Capacidade Total</span>
               <span className="text-lg font-black text-gray-800">{item.disponivel + item.reservado}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryDashboard;