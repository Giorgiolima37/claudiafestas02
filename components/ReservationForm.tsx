import React, { useState, useEffect } from 'react';
import { db } from '../services/supabase';

const ReservationForm: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para o Modal de Pagamento
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

  // Calcula o valor total para exibir no pagamento
  const calcularTotal = () => {
    return itensSelecionados.reduce((acc, current) => {
      const itemEstoque = estoque.find(i => i.item === current.item);
      return acc + (current.quantidade * (itemEstoque?.preco || 0));
    }, 0);
  };

  // Função disparada pelo formulário para abrir o modal
  const handlePreFinalizar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservaGeral.clienteId || !reservaGeral.data) {
      alert("Preencha os dados do cliente e as datas.");
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
      // 1. Validação de estoque para TODOS os itens
      for (const selecionado of itensSelecionados) {
        const itemEstoque = estoque.find(i => i.item === selecionado.item);
        if (!itemEstoque) throw new Error(`Item "${selecionado.item}" não encontrado.`);

        if (itemEstoque.disponivel < selecionado.quantidade) {
          alert(`🚨 ESTOQUE INSUFICIENTE!\n\nMaterial: ${itemEstoque.item}`);
          setLoading(false);
          return;
        }
      }

      // 2. Processamento das reservas e baixa de estoque
      for (const selecionado of itensSelecionados) {
        const itemEstoque = estoque.find(i => i.item === selecionado.item)!;
        const valorItemTotal = selecionado.quantidade * itemEstoque.preco;

        // Insere reserva com status PAGO e grava a forma de pagamento
        const { error: erroReserva } = await db.from('reservas').insert([{
          cliente_id: parseInt(reservaGeral.clienteId),
          item: selecionado.item,
          quantidade: selecionado.quantidade,
          data_evento: reservaGeral.data,
          data_devolucao: reservaGeral.dataDevolucao,
          status: 'Pago',
          forma_pagamento: metodoSelecionado, // Salva a forma escolhida para aparecer no histórico
          valor_total: valorItemTotal // Salva o valor para os relatórios
        }]);

        if (erroReserva) throw erroReserva;

        // Atualiza estoque (disponível diminui, reservado aumenta)
        await db.from('estoque').update({ 
          disponivel: itemEstoque.disponivel - selecionado.quantidade,
          reservado: itemEstoque.reservado + selecionado.quantidade 
        }).eq('id', itemEstoque.id);

        // Registra movimentação no Caixa
        await db.from('movimentacao_caixa').insert([{
            descricao: `Venda Direta (${metodoSelecionado}): ${selecionado.item}`,
            valor: valorItemTotal,
            tipo: 'Receita',
            cliente_id: parseInt(reservaGeral.clienteId),
            data: new Date().toISOString()
        }]);
      }

      alert(`🎉 Pedido finalizado com sucesso via ${metodoSelecionado}!`);
      
      // Reset do formulário
      setReservaGeral({ clienteId: '', data: '', dataDevolucao: '' });
      setItensSelecionados([{ item: '', quantidade: 1 }]);
      setMetodoSelecionado('');
      await carregarDados();
      
    } catch (err: any) {
      alert("Erro ao processar reservas: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-center text-[#b24a2b] text-3xl font-bold mb-8 italic">Nova Reserva Múltipla</h1>
      
      <form onSubmit={handlePreFinalizar} className="max-w-5xl mx-auto space-y-8 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        
        {/* SEÇÃO 1: CLIENTE E DATAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 ml-4 mb-2 uppercase">Cliente</label>
            <select required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold text-gray-700" value={reservaGeral.clienteId} onChange={(e) => setReservaGeral({...reservaGeral, clienteId: e.target.value})}>
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.cliente}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 ml-4 mb-2 uppercase">Data de Aluguel</label>
            <input type="date" required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold" value={reservaGeral.data} onChange={(e) => setReservaGeral({...reservaGeral, data: e.target.value})} />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-[#b24a2b] ml-4 mb-2 uppercase font-black">Data de Devolução</label>
            <input type="date" required className="w-full p-4 bg-orange-50 border-2 border-[#f2c6b4] rounded-2xl outline-none font-bold text-[#b24a2b]" value={reservaGeral.dataDevolucao} onChange={(e) => setReservaGeral({...reservaGeral, dataDevolucao: e.target.value})} />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="text-[10px] font-black text-gray-400 uppercase ml-4 mb-4 block">Materiais Selecionados</label>
          
          <div className="space-y-4">
            {itensSelecionados.map((linha, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-gray-50/50 p-4 rounded-3xl border border-gray-100 animate-in slide-in-from-left duration-300">
                <div className="flex-1 w-full">
                  <label className="text-[9px] font-bold text-gray-400 ml-2 mb-1 uppercase">Material</label>
                  <select 
                    required 
                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl outline-none font-bold text-sm text-gray-700" 
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
                  <label className="text-[9px] font-bold text-gray-400 ml-2 mb-1 uppercase">Quantidade</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl outline-none font-bold text-sm" 
                    value={linha.quantidade || ''} 
                    onChange={(e) => atualizarItemLinha(index, 'quantidade', parseInt(e.target.value))} 
                  />
                </div>

                {itensSelecionados.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removerLinhaItem(index)}
                    className="p-3 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <i className="fa-solid fa-trash-can text-lg"></i>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button 
            type="button" 
            onClick={adicionarLinhaItem}
            className="mt-6 flex items-center gap-2 text-[#b24a2b] font-black text-xs uppercase tracking-widest hover:opacity-70 transition-all ml-4"
          >
            <i className="fa-solid fa-plus-circle text-lg"></i> Adicionar outro material
          </button>
        </div>

        <button 
          disabled={loading} 
          type="submit"
          className={`w-full p-5 text-white font-black rounded-3xl transition-all shadow-xl active:scale-95 mt-4 ${loading ? 'bg-gray-400' : 'bg-[#b24a2b] hover:bg-[#943a20]'}`}
        >
          {loading ? 'PROCESSANDO RESERVAS...' : 'FINALIZAR PEDIDO COMPLETO'}
        </button>
      </form>

      {/* MODAL DE PAGAMENTO */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 uppercase italic">Forma de Pagamento</h2>
              <p className="text-gray-400 text-xs font-bold mt-1 uppercase">Valor Total do Pedido</p>
              <p className="text-4xl font-black text-[#b24a2b] mt-2">R$ {calcularTotal().toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { id: 'Dinheiro', icon: 'fa-money-bill-1' },
                { id: 'Débito', icon: 'fa-credit-card' },
                { id: 'Crédito', icon: 'fa-credit-card' },
                { id: 'PIX', icon: 'fa-mobile-screen-button' }
              ].map((metodo) => (
                <button
                  key={metodo.id}
                  type="button"
                  onClick={() => setMetodoSelecionado(metodo.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all gap-2 ${
                    metodoSelecionado === metodo.id 
                    ? 'border-[#b24a2b] bg-orange-50 text-[#b24a2b]' 
                    : 'border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <i className={`fa-solid ${metodo.icon} text-xl`}></i>
                  <span className="text-[10px] font-black uppercase">{metodo.id}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setShowPaymentModal(false); setMetodoSelecionado(''); }} 
                className="flex-1 p-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase text-xs hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={finalizarReservaComPagamento} 
                className="flex-1 p-4 bg-[#b24a2b] text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-[#943a20] transition-all"
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationForm;