import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

interface CustomerListProps {
  onSelectCustomer: (id: number) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onSelectCustomer }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'normais' | 'negra'>('normais');
  const [busca, setBusca] = useState('');
  
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [novoIdValor, setNovoIdValor] = useState('');
  const [clienteDetalhado, setClienteDetalhado] = useState<any | null>(null);

  // Estados para o Modal de Edição de Pedido
  const [modalAberto, setModalAberto] = useState(false);
  const [pedidoEmEdicao, setPedidoEmEdicao] = useState<any[]>([]);
  const [dadosPedidoFixo, setDadosPedidoFixo] = useState<any>(null);
  const [novoItemSelecionado, setNovoItemSelecionado] = useState('');
  const [novaQtdItem, setNovaQtdItem] = useState(1);

  // Estados para Edição de Cliente
  const [modalEdicaoClienteAberto, setModalEdicaoClienteAberto] = useState(false);
  const [dadosClienteEdicao, setDadosClienteEdicao] = useState<any>({});
  
  // --- ESTADOS PARA O FLUXO DE BLOQUEIO ---
  const [modalConfirmacao, setModalConfirmacao] = useState<{visivel: boolean, cliente: any, tipo: 'bloquear' | 'desbloquear'} | null>(null);
  const [modalMotivoInput, setModalMotivoInput] = useState<{visivel: boolean, cliente: any} | null>(null);
  const [textoMotivo, setTextoMotivo] = useState('');
  
  // --- ESTADO DO MODAL VIP ---
  const [modalVipAberto, setModalVipAberto] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClientes, resReservas, resEstoque] = await Promise.all([
        db.from('cadastro').select('*'),
        db.from('reservas').select('*').order('data_evento', { ascending: false }),
        db.from('estoque').select('*').order('item')
      ]);

      if (resClientes.error) throw resClientes.error;
      if (resReservas.error) throw resReservas.error;

      setClientes(resClientes.data || []);
      setReservas(resReservas.data || []);
      setEstoque(resEstoque.data || []);
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- AÇÃO: PREPARAR O MODAL DE DECISÃO ---
  const toggleListaNegra = (cliente: any) => {
      if (cliente.lista_negra) {
          setModalConfirmacao({ visivel: true, cliente, tipo: 'desbloquear' });
      } else {
          setModalConfirmacao({ visivel: true, cliente, tipo: 'bloquear' });
      }
  };

  // --- AÇÃO: EXECUTA O BLOQUEIO/DESBLOQUEIO NO BANCO ---
  const executarAlteracaoStatus = async (cliente: any, novoStatus: boolean, motivo: string | null) => {
    try {
        const updateData: any = { lista_negra: novoStatus };
        
        if (!novoStatus) {
            updateData.lista_negra_motivo = null; 
        } else if (motivo !== null) {
            updateData.lista_negra_motivo = motivo;
        }

        const { error } = await db.from('cadastro').update(updateData).eq('id', cliente.id);

        if (error) throw error;

        if (novoStatus && motivo === null) {
            alert(`Cliente enviado para Lista Negra com sucesso!`);
        } else if (!novoStatus) {
            alert(`Cliente removido da Lista Negra.`);
        }

        setModalConfirmacao(null);
        setModalMotivoInput(null);
        setTextoMotivo('');
        fetchData(); 
    } catch (err: any) {
        alert("Erro ao atualizar status: " + err.message);
    }
  };

  // --- LÓGICA VIP PARA O BOTÃO CONFIRMAR (MOTIVO) ---
  const handleConfirmarMotivoVip = () => {
      setModalMotivoInput(null);
      setModalVipAberto(true);
  };

  const salvarNovoId = async (clienteIdInterno: number) => {
    try {
      if (novoIdValor && novoIdValor.trim() !== '') {
        const idParaChecar = novoIdValor.trim();
        const { data: duplicados, error: erroCheck } = await db
           .from('cadastro').select('id').eq('id-client', idParaChecar).neq('id', clienteIdInterno);

        if (erroCheck) throw erroCheck;
        if (duplicados && duplicados.length > 0) {
           alert(`⛔ AÇÃO BLOQUEADA!\nO ID "${idParaChecar}" já pertence a outro cliente.`);
           setEditandoId(null);
           return; 
        }
      }
      const { error } = await db.from('cadastro').update({ 'id-client': novoIdValor }).eq('id', clienteIdInterno);
      if (error) throw error;
      setEditandoId(null);
      fetchData();
    } catch (err: any) {
      alert("Erro ao salvar ID: " + err.message);
    }
  };

  const handleSalvarEdicaoCliente = async () => {
    if (!dadosClienteEdicao.cliente || !dadosClienteEdicao.telefone) return alert("Nome e Telefone são obrigatórios.");
    try {
        setLoading(true);
        const { error } = await db.from('cadastro').update({
            cliente: dadosClienteEdicao.cliente,
            telefone: dadosClienteEdicao.telefone,
            identificação: dadosClienteEdicao.identificação, 
            endereco: dadosClienteEdicao.endereco,
            bairro: dadosClienteEdicao.bairro,
            municipio: dadosClienteEdicao.municipio
        }).eq('id', dadosClienteEdicao.id);

        if (error) throw error;
        alert("Dados atualizados!");
        setModalEdicaoClienteAberto(false);
        const novoCliente = { ...clienteDetalhado, ...dadosClienteEdicao };
        setClienteDetalhado(novoCliente);
        setClientes(prev => prev.map(c => c.id === novoCliente.id ? novoCliente : c));
    } catch (err: any) {
        alert("Erro ao atualizar: " + err.message);
    } finally {
        setLoading(false);
    }
  };
  
  const handleAbrirEdicao = (itemClicado: any) => {
    const itensDoPedido = reservas.filter(r => r.cliente_id === itemClicado.cliente_id && r.data_evento === itemClicado.data_evento);
    const itensFormatados = itensDoPedido.map(i => ({...i, _originalQty: i.quantidade}));
    setPedidoEmEdicao(itensFormatados);
    setDadosPedidoFixo({ cliente_id: itemClicado.cliente_id, data_evento: itemClicado.data_evento, data_devolucao: itemClicado.data_devolucao });
    setModalAberto(true);
  };

  const handleAlterarQtdExistente = (index: number, novaQtd: number) => {
    const lista = [...pedidoEmEdicao];
    lista[index].quantidade = novaQtd;
    setPedidoEmEdicao(lista);
  };

  const handleRemoverItemLista = (index: number) => {
     if(!window.confirm("Remover este item?")) return;
     const lista = [...pedidoEmEdicao];
     if (lista[index].id) lista[index]._deleted = true;
     else lista.splice(index, 1);
     setPedidoEmEdicao(lista);
  };

  const handleAdicionarNovoItem = () => {
    if (!novoItemSelecionado) return alert("Selecione um produto.");
    if (novaQtdItem < 1) return alert("Qtd inválida.");
    const produtoEstoque = estoque.find(e => e.item === novoItemSelecionado);
    if (!produtoEstoque) return;
    setPedidoEmEdicao([...pedidoEmEdicao, {
        item: produtoEstoque.item,
        quantidade: novaQtdItem,
        valor_total: produtoEstoque.preco * novaQtdItem,
        codigo_item: produtoEstoque.codigo_interno,
        _isNew: true,
        _basePrice: produtoEstoque.preco
    }]);
    setNovoItemSelecionado('');
    setNovaQtdItem(1);
  };

  const handleSalvarAlteracoes = async () => {
    if (!dadosPedidoFixo) return;
    setLoading(true);
    try {
        for (const item of pedidoEmEdicao) {
            const produtoEstoque = estoque.find(e => e.item === item.item);
            if (!produtoEstoque) continue;
            if (item._deleted) {
                await db.from('estoque').update({ disponivel: produtoEstoque.disponivel + item._originalQty, reservado: Math.max(0, produtoEstoque.reservado - item._originalQty) }).eq('id', produtoEstoque.id);
                await db.from('reservas').delete().eq('id', item.id);
                continue;
            }
            if (item._isNew) {
                if (produtoEstoque.disponivel < item.quantidade) throw new Error("Estoque insuficiente");
                await db.from('estoque').update({ disponivel: produtoEstoque.disponivel - item.quantidade, reservado: produtoEstoque.reservado + item.quantidade }).eq('id', produtoEstoque.id);
                await db.from('reservas').insert([{ cliente_id: dadosPedidoFixo.cliente_id, item: item.item, quantidade: item.quantidade, data_evento: dadosPedidoFixo.data_evento, data_devolucao: dadosPedidoFixo.data_devolucao, status: 'Pendente', forma_pagamento: 'Ajuste', valor_total: item.valor_total, codigo_item: item.codigo_item }]);
                continue;
            }
            if (item.quantidade !== item._originalQty) {
                const diferenca = item.quantidade - item._originalQty;
                if (diferenca > 0 && produtoEstoque.disponivel < diferenca) throw new Error("Estoque insuficiente");
                await db.from('estoque').update({ disponivel: produtoEstoque.disponivel - diferenca, reservado: produtoEstoque.reservado + diferenca }).eq('id', produtoEstoque.id);
                const precoUnitario = item.valor_total / item._originalQty;
                await db.from('reservas').update({ quantidade: item.quantidade, valor_total: precoUnitario * item.quantidade }).eq('id', item.id);
            }
        }
        alert("Pedido atualizado!");
        setModalAberto(false);
        const { data: novasReservas } = await db.from('reservas').select('*').order('data_evento', { ascending: false });
        if (novasReservas) setReservas(novasReservas);
        if (clienteDetalhado) setClienteDetalhado({ ...clienteDetalhado, historico: novasReservas?.filter(r => r.cliente_id === clienteDetalhado.id) });
        const { data: novoEstoque } = await db.from('estoque').select('*');
        if (novoEstoque) setEstoque(novoEstoque);
    } catch (err: any) {
        if (err.message !== "Estoque insuficiente") alert("Erro: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const clientesExibidos = clientes.filter(c => {
    const correspondeAba = abaAtiva === 'normais' ? !c.lista_negra : c.lista_negra;
    const termoBusca = busca.toLowerCase();
    const nomeCliente = (c.cliente || '').toLowerCase();
    const idCliente = String(c['id-client'] || '').toLowerCase();
    return correspondeAba && (nomeCliente.includes(termoBusca) || idCliente.includes(termoBusca));
  }).sort((a, b) => {
    const idA = a['id-client'] ? parseInt(a['id-client']) : Infinity;
    const idB = b['id-client'] ? parseInt(b['id-client']) : Infinity;
    return idA - idB;
  });

  const totalListaNegra = clientes.filter(c => c.lista_negra).length;

  if (loading && !modalAberto && !modalEdicaoClienteAberto && !modalConfirmacao) return <div className="text-center p-20 font-bold text-[#b24a2b] animate-pulse uppercase tracking-[0.3em]">Sincronizando Clientes...</div>;

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto">
        {!clienteDetalhado ? (
          <>
            <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h1 className="text-[#b24a2b] text-4xl font-black italic uppercase tracking-tighter">Clientes</h1>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Base de dados e cadastros ativos</p>
                </div>
                <div className="relative">
                  <input type="text" placeholder="PROCURAR POR NOME OU ID..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-12 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-full outline-none w-full md:w-80 text-xs font-black uppercase tracking-widest focus:border-[#b24a2b] focus:bg-white transition-all shadow-sm" />
                  <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                </div>
            </header>

            <div className="flex gap-8 mb-8 border-b border-gray-100 items-center justify-center md:justify-start">
              <button onClick={() => setAbaAtiva('normais')} className={`pb-4 px-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all ${abaAtiva === 'normais' ? 'border-b-4 border-[#b24a2b] text-[#b24a2b]' : 'text-gray-300 hover:text-gray-400'}`}>Clientes Ativos</button>
              <button onClick={() => setAbaAtiva('negra')} className={`pb-4 px-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all text-red-600 ${abaAtiva === 'negra' ? 'border-b-4 border-red-600' : 'opacity-60 hover:opacity-100'}`}>Lista Negra {totalListaNegra > 0 && <span className="ml-1">({totalListaNegra})</span>}</button>
            </div>

            <div className="overflow-hidden rounded-[40px] border border-gray-100 bg-white shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 uppercase text-[9px] font-black text-gray-400 tracking-[0.2em]">
                    <th className="p-8">Nome do Cliente</th>
                    <th className="p-8">Bairro</th>
                    <th className="p-8">Contato / WhatsApp</th>
                    <th className="p-8 text-center">ID</th>
                    <th className="p-8 text-center">MOTIVO</th>
                    <th className="p-8 text-center">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientesExibidos.map((item) => (
                    <tr key={item.id} className="hover:bg-orange-50/30 transition-all group">
                      <td className="p-8">
                        <button onClick={() => setClienteDetalhado({...item, historico: reservas.filter(r => r.cliente_id === item.id)})} className="font-black text-gray-800 group-hover:text-[#b24a2b] uppercase text-sm tracking-tight transition-colors text-left">{item.cliente}</button>
                      </td>
                      <td className="p-8"><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.bairro || '---'}</span></td>
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          {/* BOTÃO DO WHATSAPP AQUI - AGORA BLOQUEADO */}
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setModalVipAberto(true); // <--- ALTERADO AQUI
                            }}
                            className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs hover:bg-green-200 transition-colors cursor-pointer"
                            title="Função VIP"
                          >
                              <i className="fa-brands fa-whatsapp"></i>
                          </button>
                          <span className="text-sm font-bold text-gray-500">{item.telefone}</span>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        {editandoId === item.id ? (
                          <input autoFocus type="text" value={novoIdValor} onChange={(e) => setNovoIdValor(e.target.value)} onBlur={() => salvarNovoId(item.id)} onKeyDown={(e) => e.key === 'Enter' && salvarNovoId(item.id)} className="w-24 border-2 border-[#b24a2b] rounded-full text-[10px] px-3 py-1 outline-none font-black text-center text-[#b24a2b] bg-white" />
                        ) : (
                          <span onClick={() => { setEditandoId(item.id); setNovoIdValor(item['id-client'] || ''); }} className="bg-gray-100 text-gray-400 text-[10px] px-4 py-2 rounded-full font-black cursor-pointer hover:bg-[#b24a2b] hover:text-white transition-all uppercase tracking-widest">ID: {item['id-client'] || '---'}</span>
                        )}
                      </td>
                      
                      <td className="p-8 text-center">
                        <div className="flex items-center justify-center">
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setModalVipAberto(true);
                                }}
                                title="Ver Arquivos / Motivo"
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all shadow-sm"
                            >
                                <i className={`fa-solid ${item.lista_negra ? 'fa-triangle-exclamation' : 'fa-file-lines'}`}></i>
                            </button>
                        </div>
                      </td>

                      <td className="p-8 text-center">
                        <div className="flex items-center justify-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleListaNegra(item); }}
                                title={item.lista_negra ? "Restaurar Cliente" : "Enviar para Lista Negra"}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${item.lista_negra ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                            >
                                <i className={`fa-solid ${item.lista_negra ? 'fa-user-check' : 'fa-ban'}`}></i>
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[50px] p-12 border border-gray-100 shadow-2xl animate-in slide-in-from-bottom duration-500">
              <button onClick={() => setClienteDetalhado(null)} className="inline-flex items-center gap-3 px-6 py-3 bg-gray-50 text-[#b24a2b] rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-[#b24a2b] hover:text-white transition-all mb-8 shadow-sm">
                <i className="fa-solid fa-arrow-left"></i> Voltar à Listagem
              </button>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <h1 className="text-5xl font-black uppercase text-gray-800 tracking-tighter italic">{clienteDetalhado.cliente}</h1>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <h2 className="text-gray-400 font-black text-[10px] uppercase mb-8 border-b border-gray-100 pb-4 tracking-[0.3em]">Histórico Geral de Locações</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clienteDetalhado.historico.map((h: any) => (
                      <div key={h.id} className="p-6 bg-gray-50 rounded-[30px] flex justify-between items-center border border-gray-100">
                        <div>
                          <p className="font-black text-gray-800 text-sm uppercase">{h.item}</p>
                          <p className="text-[9px] text-gray-400 font-black uppercase mt-2">{new Date(h.data_evento).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase ${h.status === 'Finalizado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{h.status}</span>
                            {h.status !== 'Finalizado' && (
                                <button onClick={() => handleAbrirEdicao(h)} className="text-[9px] font-black text-gray-800 hover:text-[#b24a2b] transition-colors uppercase mt-1 flex items-center gap-1"><i className="fa-solid fa-pen"></i> Editar pedido</button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-[40px] p-10 border border-gray-100">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                        <h2 className="text-[#b24a2b] font-black text-[10px] uppercase tracking-[0.3em]">Dados Fixos</h2>
                        <button onClick={() => { setDadosClienteEdicao(clienteDetalhado); setModalEdicaoClienteAberto(true); }} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-400 rounded-full hover:bg-[#b24a2b] hover:text-white transition-all shadow-sm" title="Editar Dados do Cliente">
                            <i className="fa-solid fa-pen-to-square text-sm"></i>
                        </button>
                    </div>

                    <div className="space-y-8">
                      <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Contato Principal</span><span className="font-black text-lg text-gray-800">{clienteDetalhado.telefone}</span></div>
                      <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">IDENTIFICAÇÃO</span><span className="font-bold text-sm text-gray-800">{clienteDetalhado.identificação || 'NÃO CADASTRADO'}</span></div>
                      <div className="flex gap-6">
                          <div className="flex flex-col flex-1"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Localização / Bairro</span><span className="font-black text-sm text-[#b24a2b] uppercase">{clienteDetalhado.bairro || 'NÃO INFORMADO'}</span></div>
                          <div className="flex flex-col flex-1"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Município</span><span className="font-black text-sm text-[#b24a2b] uppercase">{clienteDetalhado.municipio || 'NÃO INFORMADO'}</span></div>
                      </div>
                      <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Endereço Completo</span><span className="font-bold text-xs text-gray-600 italic leading-relaxed">{clienteDetalhado.endereco || 'Sem endereço cadastrado.'}</span></div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}
      </div>

      {/* --- MODAL DE EDIÇÃO DE PEDIDO --- */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[35px] p-8 w-full max-w-2xl shadow-2xl border border-gray-100 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div><h3 className="text-xl font-black text-gray-800 uppercase italic">Editar Pedido</h3></div>
                    <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 text-2xl">×</button>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setModalAberto(false)} className="flex-1 p-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200">Cancelar</button>
                    <button onClick={handleSalvarAlteracoes} className="flex-1 p-4 bg-[#b24a2b] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#943a20]">Salvar Alterações</button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DE EDIÇÃO DE CLIENTE --- */}
      {modalEdicaoClienteAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[35px] p-8 w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in duration-300">
               <div className="flex gap-3 mt-6">
                    <button onClick={() => setModalEdicaoClienteAberto(false)} className="flex-1 p-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200">Cancelar</button>
                    <button onClick={handleSalvarEdicaoCliente} className="flex-1 p-4 bg-[#b24a2b] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#943a20]">Salvar Dados</button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO DE BLOQUEIO --- */}
      {modalConfirmacao && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[35px] p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in duration-300">
                <div className="mb-6">
                    <h3 className="text-xl font-black text-gray-800 uppercase italic">
                        {modalConfirmacao.tipo === 'bloquear' ? '⚠️ Bloquear Cliente?' : '🎉 Desbloquear?'}
                    </h3>
                    <p className="mt-4 text-sm font-bold text-gray-500">
                        {modalConfirmacao.tipo === 'bloquear' 
                           ? `Deseja enviar ${modalConfirmacao.cliente.cliente} para a Lista Negra?`
                           : `Deseja remover ${modalConfirmacao.cliente.cliente} da Lista Negra?`
                        }
                    </p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => setModalConfirmacao(null)} className="flex-1 p-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200">Cancelar</button>

                    {modalConfirmacao.tipo === 'bloquear' && (
                        <button 
                            onClick={() => {
                                setModalConfirmacao(null);
                                setModalMotivoInput({visivel: true, cliente: modalConfirmacao.cliente});
                            }} 
                            className="flex-1 p-3 bg-blue-100 text-blue-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-200"
                        >
                            Motivo
                        </button>
                    )}

                    <button 
                        onClick={() => executarAlteracaoStatus(modalConfirmacao.cliente, modalConfirmacao.tipo === 'bloquear', null)} 
                        className="flex-1 p-3 bg-[#b24a2b] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#943a20]"
                    >
                        OK
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* --- MODAL DE INSERIR MOTIVO --- */}
      {modalMotivoInput && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[35px] p-8 w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in duration-300">
                <h3 className="text-xl font-black text-gray-800 uppercase italic mb-4">Motivo do Bloqueio</h3>
                <textarea 
                    autoFocus
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-sm resize-none h-32 focus:border-blue-300"
                    placeholder="Descreva o motivo..."
                    value={textoMotivo}
                    onChange={(e) => setTextoMotivo(e.target.value)}
                />
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setModalMotivoInput(null)} className="flex-1 p-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200">Cancelar</button>
                    <button 
                        onClick={handleConfirmarMotivoVip} 
                        className="flex-1 p-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-red-700"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* --- MODAL VIP (FUNÇÃO BLOQUEADA) --- */}
      {modalVipAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[35px] p-10 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in duration-300 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fa-solid fa-crown text-3xl text-blue-600"></i>
                </div>
                <h3 className="text-xl font-black text-gray-800 uppercase italic mb-2">Função Bloqueada</h3>
                <p className="text-sm font-bold text-gray-500 mb-8">
                    Essa função está disponível apenas na versão <span className="text-[#b24a2b]">VIP</span>.
                </p>
                <button
                    onClick={() => setModalVipAberto(false)}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-lg transition-all"
                >
                    Sair
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default CustomerList;