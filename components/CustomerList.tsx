import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

// Interface para receber a função de clique do App.tsx
interface CustomerListProps {
  onSelectCustomer: (id: number) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onSelectCustomer }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'normais' | 'negra'>('normais');
  const [busca, setBusca] = useState('');

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

  // Lógica de Alerta de Atraso
  const verificarAtraso = (dataDevolucao: Date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataDev = new Date(dataDevolucao);
    dataDev.setHours(0, 0, 0, 0);
    return hoje > dataDev;
  };

  const confirmarPagamentoEDevolver = async (reserva: any) => {
    const confirmacao = window.confirm(`Confirmar devolução de "${reserva.item}" para ${reserva.nomeCliente}?`);
    if (!confirmacao) return;

    try {
      setLoading(true);
      await db.from('reservas').update({ status: 'Pago' }).eq('id', reserva.id);
      
      const { data: itemEstoque } = await db.from('estoque').select('*').eq('item', reserva.item).single();
      
      if (itemEstoque) {
        await db.from('estoque').update({ 
            disponivel: itemEstoque.disponivel + reserva.quantidade,
            reservado: Math.max(0, itemEstoque.reservado - reserva.quantidade)
        }).eq('item', reserva.item);

        await db.from('movimentacao_caixa').insert([{
              descricao: `Aluguel Finalizado: ${reserva.item}`,
              valor: reserva.quantidade * (itemEstoque.preco || 0),
              tipo: 'Receita',
              cliente_id: reserva.cliente_id,
              data: new Date().toISOString()
        }]);
      }
      fetchData(); 
      alert("Devolução concluída com sucesso!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const proximasDevolucoes = reservas
    .filter(r => r.status !== 'Pago')
    .map(r => {
      const cliente = clientes.find(c => c.id === r.cliente_id);
      const dataDevolucao = new Date(r.data_devolucao);

      return {
        ...r,
        nomeCliente: cliente ? cliente.cliente : 'Cliente não encontrado',
        dataDevolucaoObj: dataDevolucao
      };
    })
    .sort((a, b) => a.dataDevolucaoObj.getTime() - b.dataDevolucaoObj.getTime())
    .slice(0, 6);

  const toggleListaNegra = async (id: number, statusAtual: boolean) => {
    try {
      await db.from('cadastro').update({ lista_negra: !statusAtual }).eq('id', id);
      fetchData(); 
    } catch (err: any) { alert(err.message); }
  };

  const excluirCliente = async (id: number, nome: string) => {
    const temReservasAtivas = reservas.some(r => r.cliente_id === id && r.status !== 'Pago');
    if (temReservasAtivas) {
      alert(`Não é possível excluir ${nome} com reservas pendentes.`);
      return;
    }
    if (window.confirm(`Deseja excluir ${nome} definitivamente?`)) {
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
      
      {/* LISTA PRINCIPAL */}
      <div className="flex-1">
        <header className="mb-8 flex justify-between items-center">
            <h1 className="text-[#b24a2b] text-3xl font-bold italic">Gestão de Clientes</h1>
            <input 
              type="text" placeholder="Buscar..." value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="px-4 py-2 bg-gray-50 border rounded-2xl outline-none w-48 text-sm"
            />
        </header>

        <div className="flex gap-4 mb-6 border-b border-gray-100">
          <button onClick={() => setAbaAtiva('normais')} className={`pb-2 px-4 font-bold text-xs ${abaAtiva === 'normais' ? 'border-b-2 border-[#b24a2b] text-[#b24a2b]' : 'text-gray-400'}`}>ATIVOS</button>
          <button onClick={() => setAbaAtiva('negra')} className={`pb-2 px-4 font-bold text-xs ${abaAtiva === 'negra' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-400'}`}>LISTA NEGRA</button>
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
                    {/* CLIQUE PARA HISTÓRICO */}
                    <button 
                      onClick={() => onSelectCustomer(item.id)}
                      className="hover:text-[#b24a2b] transition-all hover:underline text-left"
                    >
                      {item.cliente}
                    </button>
                  </td>
                  <td className="p-6 text-sm text-gray-600">{item.telefone}</td>
                  <td className="p-6 text-center flex justify-center gap-2">
                    <button onClick={() => toggleListaNegra(item.id, item.lista_negra)} className="p-2 text-gray-300 hover:text-red-600" title="Lista Negra"><i className="fa-solid fa-user-slash"></i></button>
                    <button onClick={() => excluirCliente(item.id, item.cliente)} className="p-2 text-gray-300 hover:text-red-600" title="Excluir"><i className="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BARRA LATERAL COM ALERTAS */}
      <div className="w-full lg:w-80">
        <div className="bg-[#b24a2b] rounded-[32px] p-6 text-white shadow-xl h-fit">
          <h2 className="font-bold text-sm mb-6 flex items-center gap-2">
            <i className="fa-solid fa-calendar-day"></i> Próximas Devoluções
          </h2>

          <div className="space-y-4">
            {proximasDevolucoes.map(dev => {
              const atrasado = verificarAtraso(dev.dataDevolucaoObj);
              return (
                <div 
                  key={dev.id} 
                  className={`rounded-2xl p-4 border transition-all relative ${
                    atrasado ? 'bg-red-600 border-white/40 shadow-2xl scale-105' : 'bg-white/10 border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded w-fit ${atrasado ? 'bg-white text-red-600 animate-bounce' : 'bg-white text-[#b24a2b]'}`}>
                        {atrasado ? '⚠️ ATRASADO' : 'DATA DE ENTREGA'}
                      </span>
                      <span className="text-[10px] font-bold">{dev.dataDevolucaoObj.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <button 
                      onClick={() => confirmarPagamentoEDevolver(dev)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${atrasado ? 'bg-white text-red-600' : 'bg-green-500 text-white'}`}
                    >
                      <i className="fa-solid fa-check text-xs"></i>
                    </button>
                  </div>
                  <p className="font-bold text-sm mt-3 uppercase">{dev.nomeCliente}</p>
                  <p className="text-[10px] italic opacity-70">{dev.item} ({dev.quantidade}un)</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;