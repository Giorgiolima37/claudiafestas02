import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const InventoryDashboard: React.FC = () => {
  const [itens, setItens] = useState<any[]>([]);
  const [reservasAtivas, setReservasAtivas] = useState<any[]>([]);
  const [reservasFuturasLista, setReservasFuturasLista] = useState<any[]>([]); // Novo estado
  const [clientes, setClientes] = useState<any[]>([]); // Novo estado para nomes
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [dataConsulta, setDataConsulta] = useState(() => new Date().toLocaleDateString('en-CA')); 
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Estados para Modal de Detalhes de Reservas Futuras
  const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);
  const [itemSelecionadoReservas, setItemSelecionadoReservas] = useState<any>(null);

  // Estados para edição rápida do ID (Cód. Interno) direto no card
  const [editandoIdRapido, setEditandoIdRapido] = useState<number | null>(null);
  const [novoIdValor, setNovoIdValor] = useState('');

  const fetchEstoque = async () => {
    try {
      setLoading(true);
      
      const [resEstoque, resReservas, resFuturas, resClientes] = await Promise.all([
        db.from('estoque').select('*').order('item'),
        db.from('reservas').select('*').neq('status', 'Finalizado'),
        db.from('reservas_futuras').select('*'),
        db.from('cadastro').select('id, cliente')
      ]);

      if (resEstoque.error) throw resEstoque.error;
      
      setItens(resEstoque.data || []);
      setReservasAtivas(resReservas.data || []);
      setReservasFuturasLista(resFuturas.data || []);
      setClientes(resClientes.data || []);

    } catch (err: any) {
      console.error("Erro ao sincronizar estoque:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEstoque(); }, []);

  // --- LOGICA AJUSTADA PARA MAUPEAR AS COLUNAS REAIS DO SUPABASE ---
  const normalizarNome = (valor: string) =>
    String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  const calcularStatus = (item: any) => {
    const reservasDoItem = reservasAtivas.filter(
      (reserva) => normalizarNome(reserva.item) === normalizarNome(item.item)
    );
    const ocupadasNaData = reservasDoItem
      .filter((reserva) => {
        const inicio = String(reserva.data_evento || '').slice(0, 10);
        const fim = String(reserva.data_devolucao || '').slice(0, 10);
        return inicio && fim && inicio <= dataConsulta && fim >= dataConsulta;
      })
      .reduce((total, reserva) => total + Number(reserva.quantidade || 0), 0);
    const reservasDepoisDaData = reservasDoItem
      .filter((reserva) => String(reserva.data_evento || '').slice(0, 10) > dataConsulta)
      .reduce((total, reserva) => total + Number(reserva.quantidade || 0), 0);
    const totalFisico = Number(item.disponivel || 0) + Number(item.alugado || 0);

    return {
      livreHoje: Math.max(0, totalFisico - ocupadasNaData),
      alugadoHoje: ocupadasNaData,
      reservadoFuturo: reservasDepoisDaData
    };
  };
  const abrirModalReservas = (item: any) => {
    const detalhes = reservasAtivas
      .filter((reserva) =>
        normalizarNome(reserva.item) === normalizarNome(item.item) &&
        String(reserva.data_evento || '').slice(0, 10) > dataConsulta
      )
      .map((reserva) => ({
        ...reserva,
        nomeCliente: clientes.find((cliente) => cliente.id === reserva.cliente_id)?.cliente || 'Cliente não identificado'
      }))
      .sort((a, b) => String(a.data_evento).localeCompare(String(b.data_evento)));

    setItemSelecionadoReservas({
      nome: item.item,
      reservas: detalhes
    });
    setIsReservaModalOpen(true);
  };
  const normalizarCodigo = (codigo: string) => {
    const valor = String(codigo || '').trim().toUpperCase();
    return /^\d+$/.test(valor) ? String(Number(valor)) : valor;
  };

  const encontrarProdutoComCodigo = async (codigo: string, ignorarId?: string) => {
    const codigoNormalizado = normalizarCodigo(codigo);
    if (!codigoNormalizado) return null;

    const { data, error } = await db
      .from('estoque')
      .select('id, item, codigo_interno');
    if (error) throw error;

    return (data || []).find((produto) =>
      String(produto.id) !== String(ignorarId || '') &&
      normalizarCodigo(produto.codigo_interno) === codigoNormalizado
    ) || null;
  };

  const avisarCodigoDuplicado = (codigo: string, produto: any) => {
    alert(
      `ATENÇÃO: o código ${codigo} já está cadastrado para o produto "${produto.item}".\n\n` +
      'Informe outro código para continuar.'
    );
  };
  const salvarIdRapido = async (itemIdInterno: string | number) => {
    try {
      const codigo = novoIdValor.trim();
      if (!codigo) {
        alert('Informe um código interno.');
        return;
      }
      const produtoDuplicado = await encontrarProdutoComCodigo(codigo, String(itemIdInterno));
      if (produtoDuplicado) {
        avisarCodigoDuplicado(codigo, produtoDuplicado);
        return;
      }

      const { error } = await db
        .from('estoque')
        .update({ codigo_interno: codigo })
        .eq('id', itemIdInterno);
      if (error) throw error;

      setEditandoIdRapido(null);
      fetchEstoque();
    } catch (err: any) {
      alert('Erro ao salvar código no banco: ' + err.message);
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
    const codigo = String(editingItem.codigo_interno || '').trim();

    try {
      if (!codigo) {
        alert('Informe um código interno.');
        return;
      }
      const produtoDuplicado = await encontrarProdutoComCodigo(codigo, String(editingItem.id));
      if (produtoDuplicado) {
        avisarCodigoDuplicado(codigo, produtoDuplicado);
        return;
      }

      const { error } = await db
        .from('estoque')
        .update({
          item: editingItem.item,
          codigo_interno: codigo,
          disponivel: parseInt(editingItem.disponivel),
          alugado: parseInt(editingItem.alugado || 0),
          reservado: parseInt(editingItem.reservado || 0),
          preco: parseFloat(editingItem.preco)
        })
        .eq('id', editingItem.id);
      if (error) throw error;

      setIsEditModalOpen(false);
      fetchEstoque();
    } catch (err: any) {
      alert('Erro ao atualizar item: ' + err.message);
    }
  };
  const adicionarNovoItem = async () => {
    const nome = prompt('Nome do novo material:');
    if (!nome) return;
    const codigoInformado = prompt(`Código interno para ${nome}:`);
    if (!codigoInformado?.trim()) {
      alert('Informe um código interno para cadastrar o produto.');
      return;
    }

    try {
      const codigo = codigoInformado.trim();
      const produtoDuplicado = await encontrarProdutoComCodigo(codigo);
      if (produtoDuplicado) {
        avisarCodigoDuplicado(codigo, produtoDuplicado);
        return;
      }

      const quantidade = prompt(`Quantidade de ${nome}:`, '100');
      const preco = prompt(`Preço de ${nome}:`, '10.00');
      if (!quantidade || !preco) return;

      const { error } = await db.from('estoque').insert([{
        item: nome.trim(),
        codigo_interno: codigo,
        disponivel: parseInt(quantidade),
        reservado: 0,
        alugado: 0,
        preco: parseFloat(preco)
      }]);
      if (error) throw error;
      fetchEstoque();
    } catch (err: any) {
      alert('Erro ao inserir produto: ' + err.message);
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
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"></i>
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

      <div className="mb-10 flex flex-col sm:flex-row items-center justify-center gap-4 rounded-[30px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-[#b24a2b]">
          <i className="fa-solid fa-calendar-days text-xl"></i>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Consultar disponibilidade</p>
            <p className="text-xs font-black uppercase">Escolha uma data</p>
          </div>
        </div>
        <input
          type="date"
          value={dataConsulta}
          onChange={(e) => setDataConsulta(e.target.value)}
          className="rounded-full border-2 border-orange-100 bg-orange-50/50 px-6 py-3 text-sm font-black text-gray-800 outline-none focus:border-[#b24a2b]"
        />
      </div>
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
                        className="bg-gray-50 px-4 py-1.5 rounded-full text-[9px] font-black text-gray-600 border border-gray-100 cursor-pointer hover:bg-[#b24a2b] hover:text-white transition-all uppercase tracking-widest"
                    >
                        CÓD: {item.codigo_interno || 'DEFINIR'}
                    </div>
                )}
            </div>

            <button 
              onClick={() => handleOpenEditModal(item)}
              className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 p-2.5 rounded-full hover:bg-[#b24a2b] hover:text-white text-gray-600 shadow-sm"
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
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{dataConsulta === new Date().toLocaleDateString('en-CA') ? 'Livre Hoje' : `Livre em ${dataConsulta.split('-').reverse().join('/')}`}</span>
                <span className="text-3xl font-black text-emerald-600 leading-none">{status.livreHoje}</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-indigo-50/40 rounded-[30px] border border-indigo-100/30">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{dataConsulta === new Date().toLocaleDateString('en-CA') ? 'Em Aluguel (Hoje)' : `Alugado em ${dataConsulta.split('-').reverse().join('/')}`}</span>
                <span className="text-3xl font-black text-indigo-600 leading-none">{status.alugadoHoje}</span>
              </div>
              
              {/* CAMPO RESERVAS FUTURAS COM CLIQUE */}
              <button 
                onClick={() => abrirModalReservas(item)}
                className="w-full flex justify-between items-center p-6 bg-orange-50/40 rounded-[30px] border border-orange-100/30 hover:bg-orange-100/60 transition-colors"
              >
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Reservas Após a Data</span>
                <span className="text-3xl font-black text-orange-600 leading-none">{status.reservadoFuturo}</span>
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* JANELA DE RESERVAS FUTURAS */}
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
                      <p className="text-[10px] font-bold text-gray-600 uppercase mt-1">
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
                <div className="text-center py-10 text-gray-600 font-bold uppercase text-[10px]">Nenhuma reserva futura para este item.</div>
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
                <label className="block text-[10px] font-black uppercase text-gray-600 mb-2 ml-4">Código Interno</label>
                <input 
                  type="text" 
                  value={editingItem.codigo_interno || ''}
                  onChange={(e) => setEditingItem({...editingItem, codigo_interno: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-black text-[#b24a2b] outline-none focus:border-[#b24a2b]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-600 mb-2 ml-4">Nome do Material</label>
                <input 
                  type="text" 
                  value={editingItem.item}
                  onChange={(e) => setEditingItem({...editingItem, item: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-[#b24a2b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-600 mb-2 ml-4">Disponível</label>
                  <input 
                    type="number" 
                    value={editingItem.disponivel}
                    onChange={(e) => setEditingItem({...editingItem, disponivel: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-[#b24a2b]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-600 mb-2 ml-4">Em Aluguel</label>
                  <input 
                    type="number" 
                    value={editingItem.alugado || 0}
                    onChange={(e) => setEditingItem({...editingItem, alugado: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-[#6366f1] outline-none focus:border-[#6366f1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-600 mb-2 ml-4">Reservado Futuro</label>
                <input 
                  type="number" 
                  value={editingItem.reservado || 0}
                  onChange={(e) => setEditingItem({...editingItem, reservado: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-orange-500 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-600 mb-2 ml-4">Preço Unit.</label>
                <input 
                  type="number" 
                  value={editingItem.preco}
                  onChange={(e) => setEditingItem({...editingItem, preco: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-[#b24a2b]"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Sair</button>
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