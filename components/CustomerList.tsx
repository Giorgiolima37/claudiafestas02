import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

interface CustomerListProps {
  onSelectCustomer: (id: number) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onSelectCustomer }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'normais' | 'negra'>('normais');
  const [busca, setBusca] = useState('');
  
  const [clienteDetalhado, setClienteDetalhado] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resClientes = await db.from('cadastro').select('*').order('cliente');
      const resReservas = await db.from('reservas').select('*').order('data_evento', { ascending: false });

      if (resClientes.error) throw resClientes.error;
      if (resReservas.error) throw resReservas.error;

      setClientes(resClientes.data || []);
      setReservas(resReservas.data || []);
    } catch (err: any) {
      console.error("Erro:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // CÁLCULO DO NÚMERO DE PESSOAS NA LISTA NEGRA
  const totalListaNegra = clientes.filter(c => c.lista_negra).length;

  const verificarAtraso = (dataDevolucao: Date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataDev = new Date(dataDevolucao);
    dataDev.setHours(0, 0, 0, 0);
    return hoje > dataDev;
  };

  const abrirDetalhesCliente = (cliente: any) => {
    const historico = reservas.filter(r => r.cliente_id === cliente.id);
    setClienteDetalhado({ ...cliente, historico });
  };

  const confirmarDevolucaoPedido = async (pedido: any) => {
    const confirmacao = window.confirm(`Confirmar devolução física de ${pedido.itens.length} itens de ${pedido.nomeCliente}?`);
    if (!confirmacao) return;

    try {
      setLoading(true);
      for (const item of pedido.itens) {
        await db.from('reservas').update({ status: 'Finalizado' }).eq('id', item.id);
        const { data: itemEstoque } = await db.from('estoque').select('*').eq('item', item.item).single();
        if (itemEstoque) {
          await db.from('estoque').update({ 
              disponivel: itemEstoque.disponivel + item.quantidade,
              reservado: Math.max(0, itemEstoque.reservado - item.quantidade)
          }).eq('item', item.item);
        }
      }
      fetchData(); 
      alert("Material devolvido com sucesso!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const emitirRomaneio = (pedido: any) => {
    alert(`Gerando Romaneio de ${pedido.nomeCliente}...`);
  };

  const proximasDevolucoesAgrupadas = () => {
    const pendentes = reservas.filter(r => r.status !== 'Finalizado'); 
    const grupos: { [key: string]: any } = {};

    pendentes.forEach(r => {
      const cliente = clientes.find(c => c.id === r.cliente_id);
      const chaveUnica = `${r.cliente_id}_${r.data_evento}_${r.data_devolucao}`;

      if (!grupos[chaveUnica]) {
        grupos[chaveUnica] = {
          cliente_id: r.cliente_id,
          nomeCliente: cliente ? cliente.cliente : 'Cliente não encontrado',
          dataEventoObj: new Date(r.data_evento),
          dataDevolucaoObj: new Date(r.data_devolucao),
          itens: []
        };
      }
      grupos[chaveUnica].itens.push(r);
    });

    return Object.values(grupos)
      .sort((a: any, b: any) => a.dataDevolucaoObj.getTime() - b.dataDevolucaoObj.getTime())
      .slice(0, 6);
  };

  const toggleListaNegra = async (id: number, statusAtual: boolean) => {
    try {
      await db.from('cadastro').update({ lista_negra: !statusAtual }).eq('id', id);
      fetchData(); 
    } catch (err: any) { alert(err.message); }
  };

  const excluirCliente = async (id: number, nome: string) => {
    if (window.confirm(`Deseja excluir ${nome}?`)) {
      try {
        setLoading(true);
        await db.from('cadastro').delete().eq('id', id);
        fetchData();
      } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    }
  };

  const clientesExibidos = clientes.filter(c => {
    const correspondeAba = abaAtiva === 'normais' ? !c.lista_negra : c.lista_negra;
    return correspondeAba && c.cliente.toLowerCase().includes(busca.toLowerCase());
  });

  if (loading) return <div className="text-center p-10 font-bold text-[#b24a2b] animate-pulse">CARREGANDO...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
      <div className="flex-1">
        {!clienteDetalhado ? (
          <>
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-[#b24a2b] text-3xl font-bold italic">Gestão de Clientes</h1>
                <input 
                  type="text" placeholder="Buscar..." value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="px-4 py-2 bg-gray-50 border rounded-2xl outline-none w-48 text-sm"
                />
            </header>

            <div className="flex gap-4 mb-6 border-b border-gray-100 items-center">
              <button onClick={() => setAbaAtiva('normais')} className={`pb-2 px-4 font-bold text-xs ${abaAtiva === 'normais' ? 'border-b-2 border-[#b24a2b] text-[#b24a2b]' : 'text-gray-400'}`}>ATIVOS</button>
              
              {/* ABA LISTA NEGRA COM CONTADOR AJUSTADO */}
              <button onClick={() => setAbaAtiva('negra')} className={`pb-2 px-4 font-bold text-xs flex items-center gap-2 ${abaAtiva === 'negra' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-400'}`}>
                LISTA NEGRA 
                {totalListaNegra > 0 && (
                  <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                    {totalListaNegra}
                  </span>
                )}
              </button>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 uppercase text-[10px] font-bold text-gray-400">
                    <th className="p-6">Nome</th>
                    <th className="p-6">Contato</th>
                    <th className="p-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesExibidos.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-6 font-bold text-gray-800">
                        <button onClick={() => abrirDetalhesCliente(item)} className="hover:text-[#b24a2b] transition-all hover:underline text-left uppercase">
                          {item.cliente}
                        </button>
                      </td>
                      <td className="p-6 text-sm text-gray-600">{item.telefone}</td>
                      <td className="p-6 text-center flex justify-center gap-2">
                        <button onClick={() => toggleListaNegra(item.id, item.lista_negra)} className="p-2 text-gray-300 hover:text-red-600"><i className="fa-solid fa-user-slash"></i></button>
                        <button onClick={() => excluirCliente(item.id, item.cliente)} className="p-2 text-gray-300 hover:text-red-600"><i className="fa-solid fa-trash-can"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm animate-in slide-in-from-left duration-500">
            <header className="flex justify-between items-start mb-8">
               <div>
                  <button onClick={() => setClienteDetalhado(null)} className="text-[#b24a2b] font-bold text-xs uppercase mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-arrow-left"></i> Voltar para lista
                  </button>
                  <h1 className="text-3xl font-black text-gray-800 uppercase">{clienteDetalhado.cliente}</h1>
               </div>
               <div className="text-right bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-black text-[#b24a2b] uppercase mb-1">Dados de Contato</p>
                  <p className="text-sm text-gray-700 font-bold">{clienteDetalhado.telefone}</p>
                  <p className="text-xs text-gray-500 mb-2">{clienteDetalhado.endereco || 'Sem endereço'}</p>
                  <div className="pt-2 border-t border-gray-200 mt-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Documento (CPF/CNPJ)</p>
                    <p className="text-xs font-bold text-gray-800">{clienteDetalhado.documento || 'Não informado'}</p>
                  </div>
               </div>
            </header>
            <h2 className="text-[#b24a2b] font-black text-sm uppercase mb-4 border-b pb-2">Histórico de Locações</h2>
            <div className="space-y-4">
              {clienteDetalhado.historico.length > 0 ? (
                clienteDetalhado.historico.map((h: any) => {
                  const valorCalculado = h.valor_total || 0;
                  return (
                    <div key={h.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-orange-50 transition-colors">
                      <div>
                        <p className="font-bold text-gray-700 text-sm uppercase">{h.item}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                          Evento: {new Date(h.data_evento).toLocaleDateString('pt-BR')} | Qtd: {h.quantidade}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-gray-800">R$ {valorCalculado.toFixed(2).replace('.', ',')}</span>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${h.status === 'Finalizado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{h.status}</span>
                        </div>
                        {h.forma_pagamento && <span className="text-[8px] font-black text-[#b24a2b] bg-white border border-orange-100 px-2 py-0.5 rounded-full uppercase shadow-sm"><i className="fa-solid fa-receipt mr-1"></i> {h.forma_pagamento}</span>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center py-10 text-gray-400 italic">Este cliente ainda não possui histórico.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-80">
        <div className="bg-[#b24a2b] rounded-[32px] p-6 text-white shadow-xl h-fit">
          <h2 className="font-bold text-sm mb-6 flex items-center gap-2">
            <i className="fa-solid fa-calendar-day"></i> Próximas Devoluções
          </h2>
          <div className="space-y-4">
            {proximasDevolucoesAgrupadas().map((pedido: any) => {
              const atrasado = verificarAtraso(pedido.dataDevolucaoObj);
              return (
                <div key={`${pedido.cliente_id}_${pedido.dataEventoObj.getTime()}_${pedido.dataDevolucaoObj.getTime()}`} className={`rounded-2xl p-4 border transition-all relative ${atrasado ? 'bg-red-600 border-white/40 shadow-2xl scale-105' : 'bg-white/10 border-white/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded w-fit ${atrasado ? 'bg-white text-red-600 animate-bounce' : 'bg-white text-[#b24a2b]'}`}>{atrasado ? '⚠️ ATRASADO' : 'DATA DE ENTREGA'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold">{pedido.dataEventoObj.toLocaleDateString('pt-BR')}</span>
                        <span className="text-[10px] font-black text-red-400 bg-black/20 px-1.5 py-0.5 rounded">{pedido.dataDevolucaoObj.toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => emitirRomaneio(pedido)} className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-400"><i className="fa-solid fa-file-lines text-xs"></i></button>
                      <button onClick={() => confirmarDevolucaoPedido(pedido)} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${atrasado ? 'bg-white text-red-600' : 'bg-green-500 text-white'}`}><i className="fa-solid fa-check text-xs"></i></button>
                    </div>
                  </div>
                  <p className="font-bold text-sm uppercase mb-2">{pedido.nomeCliente}</p>
                  <div className="space-y-1 border-t border-white/10 pt-2 mt-2">
                    {pedido.itens.map((i: any) => (
                      <p key={i.id} className="text-[10px] italic opacity-90 flex justify-between">
                        <span>• {i.item}</span>
                        <span className="font-bold">({i.quantidade}un)</span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
            {proximasDevolucoesAgrupadas().length === 0 && (
              <p className="text-[10px] text-center opacity-50 py-4 italic">Nenhum pedido pendente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;