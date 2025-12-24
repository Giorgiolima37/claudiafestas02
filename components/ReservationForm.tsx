import React, { useState, useEffect } from 'react';
import { db } from '../services/supabase';

const ReservationForm: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Novo estado para gerenciar a lista dinâmica de materiais
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

  // Funções para gerenciar a lista de itens
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

  const finalizarReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validação de estoque para TODOS os itens selecionados
      for (const selecionado of itensSelecionados) {
        const itemEstoque = estoque.find(i => i.item === selecionado.item);
        
        if (!itemEstoque) {
          throw new Error(`Item "${selecionado.item}" não encontrado.`);
        }

        if (itemEstoque.disponivel < selecionado.quantidade) {
          alert(`🚨 ESTOQUE INSUFICIENTE!\n\nMaterial: ${itemEstoque.item}\nDisponível: ${itemEstoque.disponivel}\nSolicitado: ${selecionado.quantidade}`);
          setLoading(false);
          return;
        }
      }

      // 2. Processamento das reservas no Banco de Dados
      for (const selecionado of itensSelecionados) {
        const itemEstoque = estoque.find(i => i.item === selecionado.item)!;

        // Insere na tabela de reservas
        const { error: erroReserva } = await db.from('reservas').insert([{
          cliente_id: parseInt(reservaGeral.clienteId),
          item: selecionado.item,
          quantidade: selecionado.quantidade,
          data_evento: reservaGeral.data,
          data_devolucao: reservaGeral.dataDevolucao,
          status: 'Pendente'
        }]);

        if (erroReserva) throw erroReserva;

        // Atualiza o estoque individualmente
        const { error: erroEstoque } = await db.from('estoque').update({ 
          disponivel: itemEstoque.disponivel - selecionado.quantidade,
          reservado: itemEstoque.reservado + selecionado.quantidade 
        }).eq('id', itemEstoque.id);

        if (erroEstoque) throw erroEstoque;
      }

      alert("🎉 Todas as reservas foram concluídas com sucesso!");
      
      // 3. Reset do formulário
      setReservaGeral({ clienteId: '', data: '', dataDevolucao: '' });
      setItensSelecionados([{ item: '', quantidade: 1 }]);
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
      
      <form onSubmit={finalizarReserva} className="max-w-5xl mx-auto space-y-8 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        
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
          
          {/* SEÇÃO 2: LISTA DINÂMICA DE MATERIAIS */}
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
    </div>
  );
};

export default ReservationForm;