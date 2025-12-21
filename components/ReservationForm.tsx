import React, { useState, useEffect } from 'react';
import { db } from '../services/supabase';

const ReservationForm: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [reserva, setReserva] = useState({
    clienteId: '',
    item: '',
    quantidade: 0,
    data: '',
    dataDevolucao: '' // Novo campo
  });

  useEffect(() => {
    const carregarDados = async () => {
      const resClientes = await db.from('cadastro').select('id, cliente');
      const resEstoque = await db.from('estoque').select('*');
      if (resClientes.data) setClientes(resClientes.data);
      if (resEstoque.data) setEstoque(resEstoque.data);
    };
    carregarDados();
  }, []);

  const finalizarReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const itemEstoque = estoque.find(i => i.item === reserva.item);
      if (!itemEstoque || itemEstoque.disponivel < reserva.quantidade) {
        alert("Quantidade insuficiente no estoque!");
        setLoading(false);
        return;
      }

      // Salva a reserva com a data de devolução
      const { error: erroReserva } = await db.from('reservas').insert([{
        cliente_id: parseInt(reserva.clienteId),
        item: reserva.item,
        quantidade: reserva.quantidade,
        data_evento: reserva.data,
        data_devolucao: reserva.dataDevolucao // Enviando a nova data
      }]);

      if (erroReserva) throw erroReserva;

      // Atualiza o estoque conforme já configurado
      await db.from('estoque').update({ 
        disponivel: itemEstoque.disponivel - reserva.quantidade,
        reservado: itemEstoque.reservado + reserva.quantidade 
      }).eq('item', reserva.item);

      alert("🎉 Reserva concluída com data de devolução!");
      setReserva({ clienteId: '', item: '', quantidade: 0, data: '', dataDevolucao: '' });
      
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-center text-[#b24a2b] text-3xl font-bold mb-8 italic">Nova Reserva</h1>
      <form onSubmit={finalizarReserva} className="max-w-4xl mx-auto space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cliente e Material (Mantidos) */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 ml-4 mb-2 uppercase">Cliente</label>
            <select required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none" value={reserva.clienteId} onChange={(e) => setReserva({...reserva, clienteId: e.target.value})}>
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.cliente}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 ml-4 mb-2 uppercase">Material</label>
            <select required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none" value={reserva.item} onChange={(e) => setReserva({...reserva, item: e.target.value})}>
              <option value="">O que será alugado?</option>
              {estoque.map(i => <option key={i.id} value={i.item}>{i.item} (Disp: {i.disponivel})</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 ml-4 mb-2 uppercase">Quantidade</label>
            <input type="number" required min="1" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none" value={reserva.quantidade || ''} onChange={(e) => setReserva({...reserva, quantidade: parseInt(e.target.value)})} />
          </div>

          {/* Campo Data de Saída */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 ml-4 mb-2 uppercase">Data de Aluguel</label>
            <input type="date" required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none" value={reserva.data} onChange={(e) => setReserva({...reserva, data: e.target.value})} />
          </div>

          {/* NOVO: Campo Data de Devolução */}
          <div className="flex flex-col md:col-span-2">
            <label className="text-[10px] font-bold text-[#b24a2b] ml-4 mb-2 uppercase">Data Prevista de Devolução</label>
            <input type="date" required className="w-full p-4 bg-orange-50 border-2 border-[#f2c6b4] rounded-2xl outline-none" value={reserva.dataDevolucao} onChange={(e) => setReserva({...reserva, dataDevolucao: e.target.value})} />
          </div>
        </div>

        <button disabled={loading} className="w-full p-5 bg-[#b24a2b] text-white font-bold rounded-2xl hover:bg-[#943a20] transition-all">
          {loading ? 'PROCESSANDO...' : 'FINALIZAR RESERVA'}
        </button>
      </form>
    </div>
  );
};

export default ReservationForm;