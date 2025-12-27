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
  
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [novoIdValor, setNovoIdValor] = useState('');
  const [clienteDetalhado, setClienteDetalhado] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClientes, resReservas] = await Promise.all([
        db.from('cadastro').select('*').order('cliente'),
        db.from('reservas').select('*').order('data_evento', { ascending: false })
      ]);

      if (resClientes.error) throw resClientes.error;
      if (resReservas.error) throw resReservas.error;

      setClientes(resClientes.data || []);
      setReservas(resReservas.data || []);
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const salvarNovoId = async (clienteIdInterno: number) => {
    try {
      const { error } = await db
        .from('cadastro')
        .update({ 'id-client': novoIdValor })
        .eq('id', clienteIdInterno);

      if (error) throw error;
      setEditandoId(null);
      fetchData();
    } catch (err: any) {
      alert("Erro ao salvar ID: " + err.message);
    }
  };

  // LÓGICA DE BUSCA ATUALIZADA PARA NOME E ID
  const clientesExibidos = clientes.filter(c => {
    const correspondeAba = abaAtiva === 'normais' ? !c.lista_negra : c.lista_negra;
    
    const termoBusca = busca.toLowerCase();
    const nomeCliente = (c.cliente || '').toLowerCase();
    const idCliente = String(c['id-client'] || '').toLowerCase(); // Converte ID para string para busca

    const correspondeBusca = nomeCliente.includes(termoBusca) || idCliente.includes(termoBusca);

    return correspondeAba && correspondeBusca;
  });

  if (loading) return <div className="text-center p-20 font-bold text-[#b24a2b] animate-pulse uppercase tracking-[0.3em]">Sincronizando Clientes...</div>;

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
                  <input 
                    type="text" 
                    placeholder="PROCURAR POR NOME OU ID..." 
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-12 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-full outline-none w-full md:w-80 text-xs font-black uppercase tracking-widest focus:border-[#b24a2b] focus:bg-white transition-all shadow-sm"
                  />
                  <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                </div>
            </header>

            <div className="flex gap-8 mb-8 border-b border-gray-100 items-center justify-center md:justify-start">
              <button 
                onClick={() => setAbaAtiva('normais')} 
                className={`pb-4 px-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all ${abaAtiva === 'normais' ? 'border-b-4 border-[#b24a2b] text-[#b24a2b]' : 'text-gray-300 hover:text-gray-400'}`}
              >
                Clientes Ativos
              </button>
              <button 
                onClick={() => setAbaAtiva('negra')} 
                className={`pb-4 px-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all ${abaAtiva === 'negra' ? 'border-b-4 border-red-600 text-red-600' : 'text-gray-300 hover:text-gray-400'}`}
              >
                Lista Negra
              </button>
            </div>

            <div className="overflow-hidden rounded-[40px] border border-gray-100 bg-white shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 uppercase text-[9px] font-black text-gray-400 tracking-[0.2em]">
                    <th className="p-8">Nome do Cliente</th>
                    <th className="p-8">Bairro</th>
                    <th className="p-8">Contato / WhatsApp</th>
                    <th className="p-8 text-center">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientesExibidos.map((item) => (
                    <tr key={item.id} className="hover:bg-orange-50/30 transition-all group">
                      <td className="p-8">
                        <button 
                          onClick={() => setClienteDetalhado({...item, historico: reservas.filter(r => r.cliente_id === item.id)})} 
                          className="font-black text-gray-800 group-hover:text-[#b24a2b] uppercase text-sm tracking-tight transition-colors text-left"
                        >
                          {item.cliente}
                        </button>
                      </td>
                      <td className="p-8">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {item.bairro || '---'}
                        </span>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">
                            <i className="fa-brands fa-whatsapp"></i>
                          </div>
                          <span className="text-sm font-bold text-gray-500">{item.telefone}</span>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        {editandoId === item.id ? (
                          <input 
                            autoFocus
                            type="text"
                            value={novoIdValor}
                            onChange={(e) => setNovoIdValor(e.target.value)}
                            onBlur={() => salvarNovoId(item.id)}
                            onKeyDown={(e) => e.key === 'Enter' && salvarNovoId(item.id)}
                            className="w-24 border-2 border-[#b24a2b] rounded-full text-[10px] px-3 py-1 outline-none font-black text-center text-[#b24a2b] bg-white"
                          />
                        ) : (
                          <span 
                            onClick={() => {
                              setEditandoId(item.id);
                              setNovoIdValor(item['id-client'] || '');
                            }}
                            className="bg-gray-100 text-gray-400 text-[10px] px-4 py-2 rounded-full font-black cursor-pointer hover:bg-[#b24a2b] hover:text-white transition-all uppercase tracking-widest"
                          >
                            ID: {item['id-client'] || '---'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[50px] p-12 border border-gray-100 shadow-2xl animate-in slide-in-from-bottom duration-500">
              <button 
                onClick={() => setClienteDetalhado(null)} 
                className="inline-flex items-center gap-3 px-6 py-3 bg-gray-50 text-[#b24a2b] rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-[#b24a2b] hover:text-white transition-all mb-8 shadow-sm"
              >
                <i className="fa-solid fa-arrow-left"></i> Voltar à Listagem
              </button>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <h1 className="text-5xl font-black uppercase text-gray-800 tracking-tighter italic">
                  {clienteDetalhado.cliente}
                </h1>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <h2 className="text-gray-400 font-black text-[10px] uppercase mb-8 border-b border-gray-100 pb-4 tracking-[0.3em]">Histórico Geral de Locações</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clienteDetalhado.historico.map((h: any) => (
                      <div key={h.id} className="p-6 bg-gray-50 rounded-[30px] flex justify-between items-center border border-gray-100">
                        <div>
                          <p className="font-black text-gray-800 text-sm uppercase">{h.item}</p>
                          <p className="text-[9px] text-gray-400 font-black uppercase mt-2">
                            {new Date(h.data_evento).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase ${h.status === 'Finalizado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                          {h.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-[40px] p-10 border border-gray-100">
                    <h2 className="text-[#b24a2b] font-black text-[10px] uppercase mb-8 tracking-[0.3em]">Dados Fixos</h2>
                    <div className="space-y-8">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Contato Principal</span>
                        <span className="font-black text-lg text-gray-800">{clienteDetalhado.telefone}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">CPF / CNPJ</span>
                        <span className="font-bold text-sm text-gray-800">{clienteDetalhado.documento || 'NÃO CADASTRADO'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Localização / Bairro</span>
                        <span className="font-black text-sm text-[#b24a2b] uppercase">{clienteDetalhado.bairro || 'NÃO INFORMADO'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Endereço Completo</span>
                        <span className="font-bold text-xs text-gray-600 italic leading-relaxed">
                          {clienteDetalhado.endereco || 'Sem endereço cadastrado.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList;