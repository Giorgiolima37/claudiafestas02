import React, { useState, useEffect } from 'react';
import { db } from '../services/supabase';

const ReservationForm: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [metodoSelecionado, setMetodoSelecionado] = useState('');

  const [itensSelecionados, setItensSelecionados] = useState([{ item: '', quantidade: 1 }]);
  
  const [reservaGeral, setReservaGeral] = useState({
    clienteId: '',
    data: '',
    dataDevolucao: '' 
  });

  const carregarDados = async () => {
    const resClientes = await db.from('cadastro').select('id, cliente');
    const resEstoque = await db.from('estoque').select('id, item, disponivel, reservado, preco, codigo_interno');
    
    if (resClientes.data) setClientes(resClientes.data);
    if (resEstoque.data) setEstoque(resEstoque.data);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const adicionarLinhaItem = () => {
    setItensSelecionados([...itensSelecionados, { item: '', quantidade: 1 }]);
  };

  const removerLinhaItem = (index: number) => {
    const novaLista = [...itensSelecionados];
    novaLista.splice(index, 1);
    setItensSelecionados(novaLista);
  };

  const atualizarItemLinha = (index: number, campo: string, valor: any) => {
    const novaLista = [...itensSelecionados] as any;
    novaLista[index][campo] = valor;
    setItensSelecionados(novaLista);
  };

  const calcularTotal = () => {
    return itensSelecionados.reduce((acc, current) => {
      const itemEstoque = estoque.find(i => i.item === current.item);
      return acc + (current.quantidade * (itemEstoque?.preco || 0));
    }, 0);
  };

  const handlePreFinalizar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservaGeral.clienteId || !reservaGeral.data || !reservaGeral.dataDevolucao) {
      alert("Preencha os dados do cliente e as datas de aluguel e devolução.");
      return;
    }
    setShowPaymentModal(true);
  };

  const finalizarReservaComPagamento = async () => {
    if (!metodoSelecionado) {
      alert("Selecione um método de pagamento.");
      return;
    }

    setLoading(true);
    setShowPaymentModal(false);

    try {
      // 1. Validação prévia de estoque para todos os itens
      for (const selecionado of itensSelecionados) {
        const itemEstoque = estoque.find(i => i.item === selecionado.item);
        if (!itemEstoque) throw new Error(`Item "${selecionado.item}" não encontrado.`);

        if (itemEstoque.disponivel < selecionado.quantidade) {
          alert(`🚨 ESTOQUE INSUFICIENTE!\n\nMaterial: ${itemEstoque.item}`);
          setLoading(false);
          return;
        }
      }

      // 2. Processamento das inserções e atualizações
      for (const selecionado of itensSelecionados) {
        const itemEstoque = estoque.find(i => i.item === selecionado.item)!;
        const valorItemTotal = selecionado.quantidade * itemEstoque.preco;

        // Inserção na tabela reservas usando colunas sincronizadas
        const { error: erroReserva } = await db.from('reservas').insert([{
          cliente_id: parseInt(reservaGeral.clienteId),
          item: selecionado.item,
          quantidade: selecionado.quantidade,
          data_evento: reservaGeral.data,
          data_devolucao: reservaGeral.dataDevolucao,
          status: 'Pendente',
          forma_pagamento: metodoSelecionado, 
          valor_total: valorItemTotal,
          codigo_item: itemEstoque.codigo_interno || 'S/C'
        }]);

        if (erroReserva) throw erroReserva;

        // Atualização do estoque
        await db.from('estoque').update({ 
          disponivel: itemEstoque.disponivel - selecionado.quantidade,
          reservado: itemEstoque.reservado + selecionado.quantidade 
        }).eq('id', itemEstoque.id);

        // Registro no Caixa
        await db.from('movimentacao_caixa').insert([{
            descricao: `Venda Direta: ${selecionado.item} (${metodoSelecionado})`,
            valor: valorItemTotal,
            tipo: 'Receita',
            cliente_id: parseInt(reservaGeral.clienteId),
            data: new Date().toISOString()
        }]);
      }

      alert(`🎉 Pedido finalizado com sucesso via ${metodoSelecionado}!`);
      
      // Limpeza do formulário
      setReservaGeral({ clienteId: '', data: '', dataDevolucao: '' });
      setItensSelecionados([{ item: '', quantidade: 1 }]);
      setMetodoSelecionado('');
      await carregarDados();
      
    } catch (err: any) {
      console.error("Erro completo:", err);
      alert("Erro ao processar reservas: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-center text-[#b24a2b] text-3xl font-black mb-8 italic uppercase tracking-tighter">Nova Reserva Múltipla</h1>
      
      <form onSubmit={handlePreFinalizar} className="max-w-5xl mx-auto space-y-8 bg-white p-10 rounded-[45px] shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 ml-4 mb-2 uppercase tracking-widest">Cliente</label>
            <select required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold text-gray-700 focus:border-[#b24a2b] transition-all" value={reservaGeral.clienteId} onChange={(e) => setReservaGeral({...reservaGeral, clienteId: e.target.value})}>
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.cliente}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 ml-4 mb-2 uppercase tracking-widest">Data de Aluguel</label>
            <input type="date" required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold focus:border-[#b24a2b] transition-all" value={reservaGeral.data} onChange={(e) => setReservaGeral({...reservaGeral, data: e.target.value})} />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-[#b24a2b] ml-4 mb-2 uppercase tracking-widest">Data de Devolução</label>
            <input type="date" required className="w-full p-4 bg-orange-50 border-2 border-[#f2c6b4] rounded-2xl outline-none font-bold text-[#b24a2b] focus:border-[#b24a2b] transition-all" value={reservaGeral.dataDevolucao} onChange={(e) => setReservaGeral({...reservaGeral, dataDevolucao: e.target.value})} />
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <label className="text-[10px] font-black text-gray-400 uppercase ml-4 block tracking-widest">Materiais Selecionados</label>
          {itensSelecionados.map((linha, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-gray-50/50 p-6 rounded-[30px] border border-gray-100">
              <div className="flex-1 w-full">
                <label className="text-[9px] font-black text-gray-400 ml-2 mb-1 uppercase">Material</label>
                <select 
                  required 
                  className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none font-bold text-sm text-gray-700 focus:border-[#b24a2b]" 
                  value={linha.item} 
                  onChange={(e) => atualizarItemLinha(index, 'item', e.target.value)}
                >
                  <option value="">O que será alugado?</option>
                  {estoque.map(i => (
                    <option key={i.id} value={i.item} disabled={itensSelecionados.some((s, idx) => s.item === i.item && idx !== index)}>
                      [{i.codigo_interno || 'S/C'}] {i.item} (Disp: {i.disponivel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-32">
                <label className="text-[9px] font-black text-gray-400 ml-2 mb-1 uppercase">Qtd</label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none font-bold text-sm" 
                  value={linha.quantidade} 
                  onChange={(e) => atualizarItemLinha(index, 'quantidade', parseInt(e.target.value))} 
                />
              </div>

              {itensSelecionados.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removerLinhaItem(index)} 
                  className="p-4 text-red-400 hover:text-red-600 transition-colors"
                >
                  <i className="fa-solid fa-trash-can text-xl"></i>
                </button>
              )}
            </div>
          ))}
          
          <button type="button" onClick={adicionarLinhaItem} className="mt-2 flex items-center gap-2 text-[#b24a2b] font-black text-[10px] uppercase tracking-widest hover:opacity-70 transition-all ml-4">
            + Adicionar outro material
          </button>
        </div>

        <button disabled={loading} type="submit" className={`w-full p-6 text-white font-black rounded-[25px] transition-all shadow-xl active:scale-95 mt-4 uppercase tracking-widest text-xs ${loading ? 'bg-gray-400' : 'bg-[#b24a2b] hover:bg-[#943a20]'}`}>
          {loading ? 'PROCESSANDO RESERVAS...' : 'FINALIZAR PEDIDO COMPLETO'}
        </button>
      </form>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[50px] p-10 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Pagamento</h2>
              <p className="text-4xl font-black text-[#b24a2b] mt-3">R$ {calcularTotal().toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              {['Dinheiro', 'Débito', 'Crédito', 'PIX'].map((m) => (
                <button 
                  key={m} 
                  type="button" 
                  onClick={() => setMetodoSelecionado(m)} 
                  className={`p-6 rounded-[30px] border-2 transition-all font-black uppercase text-[10px] tracking-widest ${metodoSelecionado === m ? 'border-[#b24a2b] bg-orange-50 text-[#b24a2b]' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setShowPaymentModal(false); setMetodoSelecionado(''); }} className="flex-1 p-5 bg-gray-100 text-gray-400 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Sair</button>
              <button onClick={finalizarReservaComPagamento} className="flex-1 p-5 bg-[#b24a2b] text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#943a20] transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationForm;