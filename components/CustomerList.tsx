import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const CustomerList: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'normais' | 'negra'>('normais');
  const [busca, setBusca] = useState('');
  const [clienteAberto, setClienteAberto] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resClientes = await db.from('cadastro').select('*').order('cliente');
      const resReservas = await db.from('reservas').select('*');

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

  // Filtros para contagem
  const totalListaNegra = clientes.filter(c => c.lista_negra).length;

  const confirmarPagamentoEDevolver = async (reserva: any) => {
    try {
      setLoading(true);
      const { error: erroReserva } = await db.from('reservas').update({ status: 'Pago' }).eq('id', reserva.id);
      if (erroReserva) throw erroReserva;

      const { data: itemEstoque, error: erroBusca } = await db.from('estoque').select('disponivel, reservado, preco').eq('item', reserva.item).single();
      if (erroBusca) throw erroBusca;

      const { error: erroEstoque } = await db.from('estoque').update({ 
          disponivel: itemEstoque.disponivel + reserva.quantidade,
          reservado: Math.max(0, itemEstoque.reservado - reserva.quantidade)
      }).eq('item', reserva.item);
      if (erroEstoque) throw erroEstoque;

      const valorTotal = reserva.quantidade * (itemEstoque.preco || 0);
      await db.from('movimentacao_caixa').insert([{
            descricao: `Aluguel Finalizado: ${reserva.item}`,
            valor: valorTotal,
            tipo: 'Receita',
            cliente_id: reserva.cliente_id,
            data: new Date().toISOString()
      }]);

      fetchData(); 
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const toggleListaNegra = async (id: number, statusAtual: boolean) => {
    try {
      const { error } = await db.from('cadastro').update({ lista_negra: !statusAtual }).eq('id', id);
      if (error) throw error;
      fetchData(); 
    } catch (err: any) { alert(err.message); }
  };

  const obterPrecoUnitario = (nomeItem: string) => {
    const itemLimpo = nomeItem.toLowerCase();
    if (itemLimpo.includes('cadeira')) return 'R$ 25,00';
    if (itemLimpo.includes('louça')) return 'R$ 2,00';
    if (itemLimpo.includes('mesa')) return 'R$ 25,00';
    return 'R$ 0,00';
  };

  const clientesExibidos = clientes.filter(c => {
    const correspondeAba = abaAtiva === 'normais' ? !c.lista_negra : c.lista_negra;
    const correspondeBusca = c.cliente.toLowerCase().includes(busca.toLowerCase());
    return correspondeAba && correspondeBusca;
  });

  if (loading) return <div className="text-center p-10 font-bold text-[#b24a2b] animate-pulse">CARREGANDO...</div>;

  return (
    <div className="animate-in fade-in duration-700">
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <h1 className="text-[#b24a2b] text-3xl font-bold tracking-tight italic">Clientes Cadastrados</h1>
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input 
              type="text" placeholder="Pesquisar cliente..." value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-11 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl outline-none w-64 text-sm"
            />
          </div>
        </div>
        
        {/* Abas com contador de Lista Negra */}
        <div className="flex gap-4 mt-6 border-b border-gray-100">
          <button 
            onClick={() => setAbaAtiva('normais')} 
            className={`pb-2 px-4 font-bold text-xs ${abaAtiva === 'normais' ? 'border-b-2 border-[#b24a2b] text-[#b24a2b]' : 'text-gray-400'}`}
          >
            CLIENTES ATIVOS
          </button>
          
          <button 
            onClick={() => setAbaAtiva('negra')} 
            className={`pb-2 px-4 font-bold text-xs flex items-center gap-2 ${abaAtiva === 'negra' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-400'}`}
          >
            LISTA NEGRA 
            {totalListaNegra > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full">
                {totalListaNegra}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-[32px] border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 uppercase text-[10px] font-bold text-gray-400">
              <th className="p-6">Nome do Cliente</th>
              <th className="p-6">Contato Principal</th>
              <th className="p-6 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clientesExibidos.map((item) => (
              <React.Fragment key={item.id}>
                <tr 
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${clienteAberto === item.id ? 'bg-orange-50/30' : ''}`} 
                  onClick={() => setClienteAberto(clienteAberto === item.id ? null : item.id)}
                >
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${item.lista_negra ? 'bg-red-400' : 'bg-[#b24a2b]'}`}>
                        {item.cliente.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-bold ${item.lista_negra ? 'text-red-600' : 'text-gray-800'}`}>{item.cliente}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.documento || 'Sem Documento'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-medium text-gray-600">{item.telefone}</td>
                  <td className="p-6 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleListaNegra(item.id, item.lista_negra); }} 
                      className={`p-2 rounded-lg transition-colors ${item.lista_negra ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:text-red-600 hover:bg-red-50'}`}
                    >
                      <i className={`fa-solid ${item.lista_negra ? 'fa-user-check' : 'fa-user-slash'}`}></i>
                    </button>
                  </td>
                </tr>

                {clienteAberto === item.id && (
                  <tr className="bg-gray-50/50">
                    <td colSpan={3} className="p-8 border-l-4 border-[#b24a2b]">
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-sm">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Documento</p>
                            <p className="font-semibold text-gray-700">{item.documento || '---'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Contato</p>
                            <p className="font-semibold text-gray-700">{item.telefone || '---'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Endereço</p>
                            <p className="font-semibold text-gray-700">{item.endereco || '---'}</p>
                          </div>
                        </div>

                        <h4 className="text-[10px] font-bold text-[#b24a2b] uppercase mb-4 tracking-widest">Histórico de Aluguéis e Reservas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {reservas.filter(r => r.cliente_id === item.id).map(res => (
                            <div key={res.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-gray-800">{res.item}</span>
                                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                                    {obterPrecoUnitario(res.item)} un
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">Qtd: {res.quantidade} un</p>
                                <p className="text-[10px] text-gray-400 mt-1 italic">📅 Evento: {new Date(res.data_evento).toLocaleDateString('pt-BR')}</p>
                              </div>
                              
                              <div className="flex gap-2 items-center">
                                {res.status !== 'Pago' ? (
                                  <>
                                    <span className="text-[10px] font-black px-2 py-1 rounded-md uppercase bg-orange-100 text-[#b24a2b]">
                                      Pendente
                                    </span>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); confirmarPagamentoEDevolver(res); }}
                                      className="text-[10px] font-black px-3 py-1 rounded-md uppercase bg-green-100 text-green-700 hover:bg-green-600 hover:text-white transition-all"
                                    >
                                      Pago
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px] font-black px-3 py-1 rounded-md uppercase bg-gray-100 text-gray-400 border border-gray-200">
                                    <i className="fa-solid fa-check mr-1"></i> Devolvido e Pago
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerList;