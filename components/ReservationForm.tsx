import React, { useState, useEffect } from 'react';
import { db } from '../services/supabase';

const ReservationForm: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // --- NOVA ESTADO PARA FILTRO DE CLIENTE ---
  const [filtroCliente, setFiltroCliente] = useState('');
  // ------------------------------------------
  
  // Estados para o Modal de Frete e Desconto
  const [showFreteModal, setShowFreteModal] = useState(false);
  const [freteAjustado, setFreteAjustado] = useState(0);
  const [desconto, setDesconto] = useState(0); 

  const [itensSelecionados, setItensSelecionados] = useState([{ item: '', quantidade: 1 }]);
  
  const [reservaGeral, setReservaGeral] = useState({
    clienteId: '',
    dataReserva: '', // Campo para a data da reserva
    data: '',
    dataDevolucao: '',
    observacoes: '' 
  });

  const carregarDados = async () => {
    // --- ALTERAÇÃO AQUI: ORDENANDO CLIENTES ALFABETICAMENTE ---
    const resClientes = await db.from('cadastro')
      .select('id, cliente')
      .order('cliente', { ascending: true }); // Ordem A-Z
    // ----------------------------------------------------------

    const resEstoque = await db.from('estoque')
      .select('id, item, disponivel, reservado, preco, codigo_interno')
      .order('item', { ascending: true });
    
    if (resClientes.data) setClientes(resClientes.data);
    if (resEstoque.data) setEstoque(resEstoque.data);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // --- FUNÇÃO PARA OBTER O DIA DA SEMANA ---
  const obterDiaDaSemana = (dataString: string) => {
    if (!dataString) return '';
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const date = new Date(dataString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return dias[date.getDay()];
  };
  // -----------------------------------------

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

  const calcularSubtotal = () => {
    return itensSelecionados.reduce((acc, current) => {
      const itemEstoque = estoque.find(i => i.item === current.item);
      return acc + (current.quantidade * (itemEstoque?.preco || 0));
    }, 0);
  };

  const handleAbrirConfirmacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservaGeral.clienteId || !reservaGeral.dataReserva || !reservaGeral.dataDevolucao) {
      alert("Preencha os dados do cliente e as datas de reserva e devolução.");
      return;
    }
    setShowFreteModal(true);
  };

  const gerarArquivoCalendario = () => {
    const cliente = clientes.find(c => c.id == reservaGeral.clienteId)?.cliente || "Cliente";
    const itensDescricao = itensSelecionados.map(i => `${i.quantidade}x ${i.item}`).join('\\n');
    const formatData = (dataStr: string) => dataStr.replace(/-/g, '');
    
    const titulo = `ENTREGA: ${cliente}`;
    const descricao = `Itens Alugados:\\n${itensDescricao}\\n\\nObs: ${reservaGeral.observacoes}`;
    const inicio = formatData(reservaGeral.dataReserva);
    const fim = formatData(reservaGeral.dataDevolucao);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ClaudiaFestas//Gestao//PT
BEGIN:VEVENT
UID:${new Date().getTime()}@claudiafestas.com
DTSTAMP:${formatData(new Date().toISOString().split('T')[0])}T000000Z
DTSTART;VALUE=DATE:${inicio}
DTEND;VALUE=DATE:${fim}
SUMMARY:${titulo}
DESCRIPTION:${descricao}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `reserva_${cliente.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const finalizarPedidoCompleto = async () => {
    setLoading(true);
    setShowFreteModal(false);

    const hoje = new Date().toISOString().split('T')[0];
    const ehAluguelHoje = reservaGeral.dataReserva === hoje;

    try {
      for (const selecionado of itensSelecionados) {
        const itemEstoque = estoque.find(i => i.item === selecionado.item);
        if (!itemEstoque) throw new Error(`Item "${selecionado.item}" não encontrado.`);
      }

      for (const selecionado of itensSelecionados) {
        const itemEstoque = estoque.find(i => i.item === selecionado.item)!;
        const valorItemTotal = (selecionado.quantidade * itemEstoque.preco);

        if (ehAluguelHoje) {
          const { error: erroReserva } = await db.from('reservas').insert([{
            cliente_id: parseInt(reservaGeral.clienteId),
            item: selecionado.item,
            quantidade: selecionado.quantidade,
            data_evento: reservaGeral.dataReserva,
            data_devolucao: reservaGeral.dataDevolucao,
            status: 'Pendente',
            forma_pagamento: 'Não Informado',
            valor_total: valorItemTotal,
            taxa_entrega: freteAjustado,
            desconto: desconto, 
            codigo_item: itemEstoque.codigo_interno || 'S/C',
            observacoes: reservaGeral.observacoes 
          }]);

          if (erroReserva) throw erroReserva;

          await db.from('estoque').update({ 
            disponivel: itemEstoque.disponivel - selecionado.quantidade,
            reservado: itemEstoque.reservado + selecionado.quantidade 
          }).eq('id', itemEstoque.id);

        } else {
          const { error: erroReservaFutura } = await db.from('reservas_futuras').insert([{
            cliente_id: parseInt(reservaGeral.clienteId),
            item_id: itemEstoque.id,
            quantidade: selecionado.quantidade,
            data_evento: reservaGeral.dataReserva,
            data_devolucao: reservaGeral.dataDevolucao,
            status: 'Pendente'
          }]);

          if (erroReservaFutura) throw erroReservaFutura;
        }

        await db.from('movimentacao_caixa').insert([{
            descricao: `${ehAluguelHoje ? 'Aluguel Hoje' : 'Reserva Futura'}: ${selecionado.item}`,
            valor: valorItemTotal,
            tipo: 'Receita',
            cliente_id: parseInt(reservaGeral.clienteId),
            data: new Date().toISOString()
        }]);
      }

      if (freteAjustado > 0) {
        await db.from('movimentacao_caixa').insert([{
          descricao: `Taxa de Entrega - Pedido Cliente ID: ${reservaGeral.clienteId}`,
          valor: freteAjustado,
          tipo: 'Receita',
          cliente_id: parseInt(reservaGeral.clienteId),
          data: new Date().toISOString()
        }]);
      }

      if (desconto > 0) {
        await db.from('movimentacao_caixa').insert([{
          descricao: `Desconto Aplicado - Pedido Cliente ID: ${reservaGeral.clienteId}`,
          valor: desconto,
          tipo: 'Despesa',
          cliente_id: parseInt(reservaGeral.clienteId),
          data: new Date().toISOString()
        }]);
      }

      if(window.confirm(`🎉 ${ehAluguelHoje ? 'Aluguel' : 'Reserva Futura'} Salva! Deseja adicionar à agenda?`)) {
          gerarArquivoCalendario();
      }
      
      setReservaGeral({ clienteId: '', dataReserva: '', data: '', dataDevolucao: '', observacoes: '' });
      setItensSelecionados([{ item: '', quantidade: 1 }]);
      setFreteAjustado(0);
      setDesconto(0); 
      setFiltroCliente('');
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
      
      <form onSubmit={handleAbrirConfirmacao} className="max-w-5xl mx-auto space-y-8 bg-white p-10 rounded-[45px] shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 ml-4 mb-2 uppercase tracking-widest">Cliente</label>
            <input 
              type="text" 
              placeholder="🔍 Procurar cliente..." 
              className="mb-2 p-2 text-[10px] font-bold border-b-2 border-gray-100 outline-none focus:border-[#b24a2b] transition-all bg-transparent"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            />
            <select 
              required 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold text-gray-700 focus:border-[#b24a2b]" 
              value={reservaGeral.clienteId} 
              onChange={(e) => setReservaGeral({...reservaGeral, clienteId: e.target.value})}
            >
              <option value="">Selecione o cliente...</option>
              {clientes
                .filter(c => c.cliente.toLowerCase().includes(filtroCliente.toLowerCase()))
                .map(c => <option key={c.id} value={c.id}>ID: {c.id} - {c.cliente}</option>)
              }
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-4 mb-2 tracking-widest">Observações do Pedido</label>
            <textarea 
              placeholder="Observações..."
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-[#b24a2b] transition-all resize-none h-[110px]"
              value={reservaGeral.observacoes}
              onChange={(e) => setReservaGeral({...reservaGeral, observacoes: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-4 pt-10">
          <label className="text-[10px] font-black text-gray-400 uppercase ml-4 block tracking-widest">Materiais Selecionados</label>
          {itensSelecionados.map((linha, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-gray-50/50 p-6 rounded-[30px] border border-gray-100">
              <div className="flex-1 w-full">
                <label className="text-[9px] font-black text-gray-400 ml-2 mb-1 uppercase">Material</label>
                <select 
                  required 
                  className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none font-bold text-sm" 
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
                <button type="button" onClick={() => removerLinhaItem(index)} className="p-4 text-red-400 hover:text-red-600">
                  <i className="fa-solid fa-trash-can text-xl"></i>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={adicionarLinhaItem} className="mt-2 text-[#b24a2b] font-black text-[10px] uppercase tracking-widest ml-4">
            + Adicionar outro material
          </button>
        </div>

        <button 
          disabled={loading} 
          type="submit" 
          className="w-full p-6 text-white bg-[#b24a2b] font-black rounded-[25px] hover:bg-[#943a20] transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs"
        >
          {loading ? 'PROCESSANDO...' : 'FINALIZAR PEDIDO COMPLETO'}
        </button>
      </form>

      {/* MODAL AJUSTADO CONFORME A IMAGEM REFERÊNCIA */}
      {showFreteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl border border-gray-100 text-center">
            
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <i className="fa-solid fa-calendar-check text-green-500 text-2xl"></i>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-black text-gray-800 uppercase italic">Data da Reserva</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">Selecione a data de retirada</p>
              <input 
                type="date" 
                required 
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center font-bold text-gray-600 outline-none focus:border-green-500" 
                value={reservaGeral.dataReserva} 
                onChange={(e) => setReservaGeral({...reservaGeral, dataReserva: e.target.value})} 
              />
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-black text-gray-800 uppercase italic">QUANDO IRÁ DEVOLVER?</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">Selecione a data prevista</p>
              <input 
                type="date" 
                required 
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center font-bold text-gray-600 outline-none focus:border-green-500" 
                value={reservaGeral.dataDevolucao} 
                onChange={(e) => setReservaGeral({...reservaGeral, dataDevolucao: e.target.value})} 
              />
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={finalizarPedidoCompleto} 
                className="w-full p-5 bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg hover:bg-green-600 transition-all"
              >
                SIM, FINALIZAR!
              </button>
              <button 
                onClick={() => setShowFreteModal(false)} 
                className="w-full p-2 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all"
              >
                CANCELAR
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationForm;