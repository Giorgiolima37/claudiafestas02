import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const InventoryDashboard: React.FC = () => {
  const [itens, setItens] = useState<any[]>([]);
  const [reservasAtivas, setReservasAtivas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState(''); 
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);
  const [itemSelecionadoReservas, setItemSelecionadoReservas] = useState<any>(null);

  const [editandoIdRapido, setEditandoIdRapido] = useState<number | null>(null);
  const [novoIdValor, setNovoIdValor] = useState('');

  const fetchEstoque = async () => {
    try {
      setLoading(true);
      
      const [resEstoque, resReservas, resClientes] = await Promise.all([
        db.from('estoque').select('*').order('item'),
        db.from('reservas').select('*').neq('status', 'Finalizado'),
        db.from('cadastro').select('id, cliente')
      ]);

      if (resEstoque.error) throw resEstoque.error;
      
      setItens(resEstoque.data || []);
      setReservasAtivas(resReservas.data || []);
      setClientes(resClientes.data || []);

    } catch (err: any) {
      console.error("Erro ao sincronizar estoque:", err.message);
    } finally {
      loading && setLoading(false);
    }
  };

  useEffect(() => { fetchEstoque(); }, []);

  // --- LÓGICA CORRIGIDA: CONSIDERA AGENDAMENTOS FUTUROS E RETIRADAS EM DIA ---
  const calcularStatus = (item: any) => {
    const totalPatrimonio = (item.disponivel || 0) + (item.reservado || 0) + (item.alugado || 0);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeTime = hoje.getTime();

    let alugadoHoje = 0;
    let reservadoFuturo = 0;

    reservasAtivas.filter(r => r.item === item.item).forEach(reserva => {
        const inicio = new Date(reserva.data_evento);
        const fim = new Date(reserva.data_devolucao);
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(23, 59, 59, 999);

        const dataDevolucaoPassou = hojeTime > fim.getTime();

        // 1. Se a reserva está acontecendo HOJE (ou está atrasada sem finalizar), entra em "Em Aluguel"
        if ((hojeTime >= inicio.getTime() && hojeTime <= fim.getTime()) || dataDevolucaoPassou) {
            alugadoHoje += (reserva.quantidade || 0);
        } 
        
        // 2. Se a data de início do evento é MAIOR que hoje, entra em "Reservas Futuras"
        if (inicio.getTime() > hojeTime) {
            reservadoFuturo += (reserva.quantidade || 0);
        }
    });

    return {
        livreHoje: Math.max(0, totalPatrimonio - alugadoHoje),
        alugadoHoje: alugadoHoje,
        reservadoFuturo: reservadoFuturo
    };
  };

  const abrirModalReservas = (item: any) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Filtra na tabela de reservas ativas tudo que for para o futuro deste item específico
    const detalhes = reservasAtivas
      .filter(r => r.item === item.item && new Date(r.data_evento).getTime() > hoje.getTime())
      .map(r => {
        // Tenta encontrar o cliente pelo ID ou pelo Nome, dependendo de como está salvando na tabela reservas
        const clienteEncontrado = clientes.find(c => c.id === Number(r.cliente) || c.cliente === r.cliente);
        return {
          ...r,
          nomeCliente: clienteEncontrado ? clienteEncontrado.cliente : (r.cliente || "Cliente não identificado")
        };
      });
    
    setItemSelecionadoReservas({
      nome: item.item,
      reservas: detalhes
    });
    setIsReservaModalOpen(true);
  };

  const salvarIdRapido = async (itemIdInterno: number) => {
    try {
      const { error } = await db
        .from('estoque')
        .update({ codigo_interno: novoIdValor }) 
        .eq('id', itemIdInterno);

      if (error) throw error;

      setEditandoIdRapido(null);
      fetchEstoque(); 
    } catch (err: any) {
      alert("Erro ao salvar código no banco: " + err.message);
    }
  };

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
        reservado: parseInt(editingItem.reservado), 
        preco: parseFloat(editingItem.preco)
      })
      .eq('id', editingItem.id);

    if (error) {
      alert("Erro ao atualizar item!");
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
      const { error } = await db.from('estoque').insert([{ 
        item: nome, 
        codigo_interno: codigo,
        disponivel: parseInt(quantidade), 
        reservado: 0, 
        preco: parseFloat(preco) 
      }]);
      
      if (error) alert("Erro ao inserir: " + error.message);
      fetchEstoque();
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este item do estoque?")) {
      try {
        const { error } = await db.from('estoque').delete().eq('id', id);
        if (error) throw error;
        alert("Item excluído com sucesso!");
        fetchEstoque();
      } catch (err: any) {
        alert("Erro ao excluir item: " + err.message);
      }
    }
  };

  if (loading) return <div className="text-center p-20 font-bold text-[#b24a2b] animate-pulse uppercase tracking-widest">Sincronizando Estoque...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <h1 className="text-5xl font-black text-gray-900 italic uppercase tracking-tighter">Inventário de <span className="text-[#b24a2b]">Estoque</span></h1>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text"
              placeholder="PESQUISAR MATERIAL OU ID..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-full shadow-sm outline-none focus:ring-2 focus:ring-[#b24a2b]/20 transition-all font-bold text-xs uppercase tracking-widest text-gray-500"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {itensFiltrados.map((item) => {
          const status = calcularStatus(item);

          return (
          <div key={item.id} className="bg-white rounded-[45px] p-10 shadow-sm border border-gray-50 group hover:shadow-xl transition-all relative">
            
            <div className="absolute top-8 left-10">
                {editandoIdRapido === item.id ? (
                    <input 
                      autoFocus
                      type="text"
                      value={novoIdValor}
                      onChange={(e) => setNovoIdValor(e.target.value)}
                      onBlur={() => salvarIdRapido(item.id)}
                      onKeyDown={(e) => e.key === 'Enter' && salvarIdRapido(item.id)}
                      className="w-24 bg-white border-2 border-[#b24a2b] px-3 py-1 rounded-full text-[10px] font-black text-[#b24a2b] outline-none shadow-sm"
                    />
                ) : (
                    <div 
                        onClick={() => {
                            setEditandoIdRapido(item.id);
                            setNovoIdValor(item.codigo_interno || '');
                        }}
                        className="bg-gray-50 px-4 py-1.5 rounded-full text-[9px] font-black text-gray-400 border border-gray-100 cursor-pointer hover:bg-[#b24a2b] hover:text-white transition-all uppercase tracking-widest"
                    >
                        CÓD: {item.codigo_interno || 'DEFINIR'}
                    </div>
                )}
            </div>

            <button 
              onClick={() => handleOpenEditModal(item)}
              className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 p-2.5 rounded-full hover:bg-[#b24a2b] hover:text-white text-gray-400 shadow-sm"
            >
              <i className="fa-solid fa-pen text-xs"></i>
            </button>

            <button 
              onClick={() => handleDeleteItem(item.id)}
              className="absolute top-6 right-20 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 p-2.5 rounded-full hover:bg-red-500 hover:text-white text-red-400 shadow-sm mr-2"
              title="Excluir Item"
            >
              <i className="fa-solid fa-trash text-xs"></i>
            </button>

            <div className="flex flex-col items-center mb-8 mt-10 text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-[#b24a2b] mb-4 shadow-inner">
                  <i className={`fa-solid ${item.item.toLowerCase().includes('cadeira') ? 'fa-chair' : item.item.toLowerCase().includes('mesa') ? 'fa-table' : 'fa-box-archive'} text-3xl`}></i>
              </div>
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-tight">{item.item}</h2>
              <div className="mt-2 bg-gray-900 text-white px-5 py-1.5 rounded-full text-[10px] font-black italic shadow-lg">
                R$ {item.preco?.toFixed(2).replace('.', ',')}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="w-full flex justify-between items-center p-6 bg-emerald-50/40 rounded-[30px] border border-emerald-100/30">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Livre Hoje</span>
                <span className="text-3xl font-black text-emerald-600 leading-none">{status.livreHoje}</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-indigo-50/40 rounded-[30px] border border-indigo-100/30">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Em Aluguel (Hoje)</span>
                <span className="text-3xl font-black text-indigo-600 leading-none">{status.alugadoHoje}</span>
              </div>
              
              <button 
                onClick={() => abrirModalReservas(item)}
                className="w-full flex justify-between items-center p-6 bg-orange-50/40 rounded-[30px] border border-orange-100/30 hover:bg-orange-100/60 transition-colors"
              >
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Reservas Futuras</span>
                <span className="text-3xl font-black text-orange-600 leading-none">{status.reservadoFuturo}</span>
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {isReservaModalOpen && itemSelecionadoReservas && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[50px] p-10 w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Agenda de Reservas</h2>
              <button onClick={() => setIsReservaModalOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-red-100 hover:text-red-500 transition-all">
                <i className="fa-solid fa-xmark px-1"></i>
              </button>
            </div>
            
            <p className="text-[10px] font-black text-[#b24a2b] uppercase mb-4 tracking-widest">Material: {itemSelecionadoReservas.nome}</p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {itemSelecionadoReservas.reservas.length > 0 ? (
                itemSelecionadoReservas.reservas.map((res: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-gray-800 uppercase">{res.nomeCliente}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                        Evento: {new Date(res.data_evento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="bg-[#b24a2b] text-white px-3 py-1 rounded-full text-[10px] font-black">
                        {res.quantidade} UN
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400 font-bold uppercase text-[10px]">Nenhuma reserva futura para este item.</div>
              )}
            </div>

            <button 
              onClick={() => setIsReservaModalOpen(false)}
              className="w-full mt-8 bg-gray-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}

      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[50px] p-12 w-full max-w-md shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-black mb-8 text-gray-900 italic text-center uppercase tracking-tighter">Editar <span className="text-[#b24a2b]">Item</span></h2>
            
            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-4">Código Interno</label>
                <input 
                  type="text" 
                  value={editingItem.codigo_interno || ''}
                  onChange={(e) => setEditingItem({...editingItem, codigo_interno: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-black text-[#b24a2b] outline-none focus:border-[#b24a2b]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-4">Nome do Material</label>
                <input 
                  type="text" 
                  value={editingItem.item}
                  onChange={(e) => setEditingItem({...editingItem, item: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-[#b24a2b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-4">Disponível</label>
                  <input 
                    type="number" 
                    value={editingItem.disponivel}
                    onChange={(e) => setEditingItem({...editingItem, disponivel: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-[#b24a2b]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-4">Em Aluguel</label>
                  <input 
                    type="number" 
                    value={editingItem.reservado}
                    onChange={(e) => setEditingItem({...editingItem, reservado: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-[#6366f1] outline-none focus:border-[#6366f1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-4">Preço Unit.</label>
                <input 
                  type="number" 
                  value={editingItem.preco}
                  onChange={(e) => setEditingItem({...editingItem, preco: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-[#b24a2b]"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 text-gray-400 py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Sair</button>
                <button type="submit" className="flex-1 bg-[#b24a2b] text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-[#b24a2b]/30 transition-all">Gravar Dados</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;