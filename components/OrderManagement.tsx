import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';
// Importação da sua logo local
import logoImg from '../logo.png'; 

const OrderManagement: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroUrgentes, setFiltroUrgentes] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClientes, resReservas] = await Promise.all([
        db.from('cadastro').select('*'),
        db.from('reservas').select('*').order('data_evento', { ascending: false })
      ]);
      setClientes(resClientes.data || []);
      setReservas(resReservas.data || []);
    } catch (err: any) {
      console.error("Erro ao sincronizar dados:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const verificarAtraso = (dataDevolucao: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataDev = new Date(dataDevolucao);
    return hoje > dataDev;
  };

  const verificarUrgencia = (dataDevolucao: string) => {
    const hoje = new Date();
    const dataDev = new Date(dataDevolucao);
    const diferencaEmMs = dataDev.getTime() - hoje.getTime();
    const diferencaEmHoras = diferencaEmMs / (1000 * 60 * 60);
    return diferencaEmHoras > 0 && diferencaEmHoras <= 24;
  };

  const gerarContrato = (pedido: any) => {
    const cliente = clientes.find(c => c.id === pedido.cliente_id) || {};
    // Auto soma dos itens para gerar o subtotal
    const subtotalItens = pedido.itens.reduce((acc: number, cur: any) => acc + (cur.valor_total || 0), 0);
    
    const dataEntrega = new Date(pedido.itens[0].data_evento).toLocaleDateString('pt-BR');
    const dataRecolher = new Date(pedido.dataDevolucao).toLocaleDateString('pt-BR');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>CONTRATO - ${pedido.nomeCliente}</title>
          <style>
            @page { size: portrait; margin: 1cm; }
            body { font-family: 'Arial', sans-serif; color: #000; line-height: 1.1; font-size: 10px; margin: 0; padding: 0; }
            .contract-container { width: 100%; border: 2px solid #000; padding: 20px; box-sizing: border-box; min-height: 98vh; display: flex; flex-direction: column; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
            .company-info { width: 75%; }
            .company-name { font-size: 20px; font-weight: 900; color: #1e40af; text-decoration: underline; margin-bottom: 5px; }
            .company-contact { font-size: 14px; font-weight: 900; margin-bottom: 5px; }
            .company-address { font-size: 9px; font-weight: bold; }
            .logo-circle { width: 100px; height: 100px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #eee; }
            .logo-circle img { width: 100%; height: auto; object-fit: contain; }
            .main-title { text-align: center; font-size: 32px; font-weight: 900; margin: 15px 0; letter-spacing: 12px; }
            .client-section { font-size: 11px; margin-bottom: 15px; font-weight: bold; text-transform: uppercase; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 2px solid #000; padding: 6px; text-align: center; font-weight: 900; }
            th { font-size: 11px; text-transform: uppercase; }
            .align-left { text-align: left; padding-left: 10px; }
            .total-box { font-size: 16px; background-color: #f2f2f2; }
            .clauses-container { font-size: 9px; text-align: justify; margin-bottom: 10px; }
            .clause-text { margin-bottom: 6px; }
            .obs-container { border: 1px solid #000; padding: 5px; margin: 10px 0; min-height: 40px; font-size: 10px; }
            .footer-contract { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-bottom: 20px; }
            .logistics-info { font-weight: 900; font-size: 12px; line-height: 1.6; }
            .sig-line { width: 220px; border-top: 1px solid #000; text-align: center; font-weight: 900; padding-top: 8px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="contract-container">
            <div class="header">
              <div class="company-info">
                <div class="company-name">LOCAÇÃO DE ARTIGOS PARA FESTAS</div>
                <div class="company-contact">Fone: 48 98412.3233</div>
                <div class="company-address">Rua Bernardino Prudêncio de Amorim, 667, Jardim Janaína, Biguaçu, SC</div>
              </div>
              <div class="logo-circle"><img src="${logoImg}" alt="Logo"></div>
            </div>
            <div class="main-title">CONTRATO</div>
            <div class="client-section">
              LOCATÁRIO: ${pedido.nomeCliente.toUpperCase()} | CEL: ${pedido.telefone || '________________'}<br>
              ENDEREÇO: ${cliente.endereco || '____________________________________________________'}<br>
            </div>
            <table>
              <thead><tr><th width="40">QTD</th><th>DESCRIÇÃO DO BEM</th><th width="100">VALOR U.</th><th width="120">VALOR TOTAL</th></tr></thead>
              <tbody>
                ${pedido.itens.map((i: any) => `
                  <tr>
                    <td>${i.quantidade}</td>
                    <td class="align-left">${i.item.toUpperCase()}</td>
                    <td>R$ ${(i.valor_total / i.quantidade).toFixed(2).replace('.', ',')}</td>
                    <td>R$ ${i.valor_total.toFixed(2).replace('.', ',')}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td>1</td>
                  <td class="align-left">TAXA DE ENTREGA</td>
                  <td> </td>
                  <td> </td>
                </tr>
                <tr>
                  <td colspan="3" style="text-align: right; border-right: none; font-size: 14px;">TOTAL ITENS R$</td>
                  <td class="total-box">R$ ${subtotalItens.toFixed(2).replace('.', ',')}</td>
                </tr>
              </tbody>
            </table>
            <div class="clauses-container">
              <div class="clause-text"><strong>Cláusula 1ª:</strong> Bens em bom estado de conservação de propriedade da LOCADORA.</div>
              <div class="clause-text"><strong>Cláusula 5ª:</strong> Quebras: Mesa R$80 - Cadeira R$45 - Prato R$15 - Talher R$8 - Taça R$10.</div>
              <div class="clause-text"><strong>Cláusula 6ª:</strong> Louça deve retornar lavada ou taxa de 50%.</div>
            </div>
            <div class="obs-container">
              <strong>OBS:</strong> ____________________________________________________________________________________________________________________________________________________________________________________________________________________
            </div>
            <div class="footer-contract">
              <div class="logistics-info">ENTREGAR: ${dataEntrega} SABADO<br>RECOLHER: ${dataRecolher} DOMINGO</div>
              <div class="sig-line">LOCATÁRIO</div>
              <div class="sig-line">CLAUDIA FESTAS</div>
            </div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 300); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const confirmarDevolucao = async (pedido: any) => {
    if (!window.confirm(`Confirmar devolução física de ${pedido.nomeCliente}?`)) return;
    try {
      for (const item of pedido.itens) {
        await db.from('reservas').update({ status: 'Finalizado' }).eq('id', item.id);
        const { data: est } = await db.from('estoque').select('*').eq('item', item.item).single();
        if (est) {
          await db.from('estoque').update({ 
            disponivel: est.disponivel + item.quantidade,
            reservado: Math.max(0, est.reservado - item.quantidade)
          }).eq('item', item.item);
        }
      }
      fetchData();
      alert("Material devolvido com sucesso!");
    } catch (err: any) { alert(err.message); }
  };

  const abrirWhatsApp = (pedido: any) => {
    if (!pedido.telefone) return alert("Telefone não cadastrado.");
    const numero = pedido.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numero}`, '_blank');
  };

  const gerarRomaneio = (pedido: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>ROMANEIO - ${pedido.nomeCliente}</title>
        <style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }</style></head>
        <body>
          <h2 style="text-align: center">📋 ROMANEIO DE CONFERÊNCIA</h2>
          <table>
            <thead><tr><th>CÓDIGO</th><th>ITEM</th><th>QTD</th></tr></thead>
            <tbody>
              ${pedido.itens.map((i: any) => `
                <tr><td>${i.codigo_item || '--'}</td><td>${i.item.toUpperCase()}</td><td>${i.quantidade}</td></tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const pedidosAgrupadosEFiltrados = () => {
    const pendentes = reservas.filter(r => r.status?.toLowerCase() !== 'finalizado');
    const grupos: { [key: string]: any } = {};
    pendentes.forEach(r => {
      const cliente = clientes.find(c => c.id === r.cliente_id);
      const nomeCliente = cliente ? cliente.cliente : 'Desconhecido';
      const idCliente = String(r.cliente_id);
      const termoBusca = busca.toLowerCase();
      const bateBusca = !busca || nomeCliente.toLowerCase().includes(termoBusca) || idCliente.includes(termoBusca);
      const eUrgente = verificarUrgencia(r.data_devolucao);
      const bateFiltroUrgencia = !filtroUrgentes || eUrgente;
      if (bateBusca && bateFiltroUrgencia) {
        const chave = `${r.cliente_id}_${r.data_evento}`;
        if (!grupos[chave]) {
          grupos[chave] = { nomeCliente, telefone: cliente?.telefone, dataDevolucao: r.data_devolucao, cliente_id: r.cliente_id, itens: [] };
        }
        grupos[chave].itens.push(r);
      }
    });
    return Object.values(grupos).sort((a: any, b: any) => new Date(a.dataDevolucao).getTime() - new Date(b.dataDevolucao).getTime());
  };

  const totalUrgentes = Object.values(
    reservas.filter(r => r.status?.toLowerCase() !== 'finalizado')
      .reduce((acc: any, r) => {
        if (verificarUrgencia(r.data_devolucao)) acc[`${r.cliente_id}_${r.data_evento}`] = true;
        return acc;
      }, {})
  ).length;

  if (loading) return <div className="p-20 text-center text-[#b24a2b] font-bold uppercase tracking-widest">Carregando Gestão...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-700">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black text-gray-800 italic uppercase">Gestão de Pedidos</h1>
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="relative w-full max-w-md">
            <input type="text" placeholder="PROCURAR POR NOME OU ID..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-full text-xs text-center font-bold outline-none focus:border-[#b24a2b] shadow-sm transition-all" />
          </div>
          <button onClick={() => setFiltroUrgentes(!filtroUrgentes)} className={`px-6 py-3 rounded-full font-black text-[10px] uppercase border-2 flex items-center gap-3 ${filtroUrgentes ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200'}`}>
            {filtroUrgentes ? '✕ Mostrar todos' : `⏳ Ver devoluções em 24h`}
            {totalUrgentes > 0 && !filtroUrgentes && <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[9px] animate-pulse">{totalUrgentes}</span>}
          </button>
        </div>
      </header>
      <div className="flex flex-col items-center gap-8 w-full mt-12">
        {pedidosAgrupadosEFiltrados().map((pedido: any, idx) => {
          const atrasado = verificarAtraso(pedido.dataDevolucao);
          const urgente = verificarUrgencia(pedido.dataDevolucao);
          return (
            <div key={idx} className={`w-full max-w-md rounded-[45px] p-8 border-2 shadow-xl transition-all ${atrasado ? 'bg-red-50 border-red-200' : urgente ? 'bg-amber-50 border-amber-200 shadow-amber-100' : 'bg-white border-gray-50'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                  {atrasado ? <span className="text-[10px] font-black px-5 py-2 rounded-full uppercase bg-red-500 text-white animate-bounce">⚠️ ATRASADO</span> : urgente ? <span className="text-[10px] font-black px-5 py-2 rounded-full uppercase bg-amber-500 text-white">⏳ DEVOLUÇÃO EM BREVE</span> : <span className="text-[10px] font-black px-5 py-2 rounded-full uppercase bg-orange-600 text-white">NO PRAZO</span>}
                  <span className="text-[9px] font-bold text-gray-400 ml-2 uppercase">ID CLIENTE: {pedido.cliente_id}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirWhatsApp(pedido)} className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110"><i className="fa-brands fa-whatsapp"></i></button>
                  <button onClick={() => gerarRomaneio(pedido)} className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110"><i className="fa-solid fa-list-check"></i></button>
                  <button onClick={() => gerarContrato(pedido)} className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110"><i className="fa-solid fa-file-contract"></i></button>
                  <button onClick={() => confirmarDevolucao(pedido)} className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110"><i className="fa-solid fa-check"></i></button>
                </div>
              </div>
              <h3 className="font-black text-3xl text-gray-800 uppercase tracking-tighter mb-1">{pedido.nomeCliente}</h3>
              <p className={`text-[10px] font-bold uppercase mb-8 ${atrasado ? 'text-red-600' : urgente ? 'text-amber-600' : 'text-gray-400'}`}>Devolução: {new Date(pedido.dataDevolucao).toLocaleDateString('pt-BR')}</p>
              <div className="space-y-4 border-t border-gray-100 pt-8">
                {pedido.itens.map((i: any) => (
                  <div key={i.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="uppercase text-gray-500 italic">• {i.item} <span className="text-blue-600 font-bold ml-2">[{i.codigo_item || 'S/C'}]</span></span>
                      <span className="font-black text-gray-900">x{i.quantidade}</span>
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase ml-4">CÓDIGO INTERNO: {i.codigo_item || 'S/C'}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderManagement;