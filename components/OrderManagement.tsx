import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';
import logoImg from '../logo.png'; 

const OrderManagement: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroUrgentes, setFiltroUrgentes] = useState(false);

  // Estados para o Modal de Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [pedidoEmEdicao, setPedidoEmEdicao] = useState<any[]>([]);
  const [dadosPedidoFixo, setDadosPedidoFixo] = useState<any>(null);
  const [novoItemSelecionado, setNovoItemSelecionado] = useState('');
  const [novaQtdItem, setNovaQtdItem] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClientes, resReservas, resEstoque] = await Promise.all([
        db.from('cadastro').select('*'),
        db.from('reservas').select('*').order('data_evento', { ascending: false }),
        db.from('estoque').select('*').order('item')
      ]);
      setClientes(resClientes.data || []);
      setReservas(resReservas.data || []);
      setEstoque(resEstoque.data || []);
    } catch (err: any) {
      console.error("Erro ao sincronizar dados:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- NOVA FUNÇÃO PARA CORRIGIR DATA (REMOVE O PROBLEMA DO DIA ANTERIOR) ---
  const formatarDataBR = (dataString: string) => {
    if (!dataString) return '--/--/----';
    // Pega apenas a parte YYYY-MM-DD e ignora o horário/fuso
    const parteData = dataString.split('T')[0]; 
    const [ano, mes, dia] = parteData.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  // -------------------------------------------------------------------------

  const verificarAtraso = (dataDevolucao: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    // Para comparação lógica, usamos new Date, mas para exibição usamos a formatarDataBR
    const dataDev = new Date(dataDevolucao); 
    // Ajuste de fuso apenas para comparação correta
    dataDev.setMinutes(dataDev.getMinutes() + dataDev.getTimezoneOffset());
    
    return hoje > dataDev;
  };

  const verificarUrgencia = (dataDevolucao: string) => {
    const hoje = new Date();
    const dataDev = new Date(dataDevolucao);
    dataDev.setMinutes(dataDev.getMinutes() + dataDev.getTimezoneOffset());
    
    const dMs = dataDev.getTime() - hoje.getTime();
    const dH = dMs / (1000 * 60 * 60);
    return dH > 0 && dH <= 24;
  };

  // --- FUNÇÕES DE EDIÇÃO ---

  const handleAbrirEdicao = (pedidoAgrupado: any) => {
    const itensFormatados = pedidoAgrupado.itens.map((i: any) => ({...i, _originalQty: i.quantidade}));
    
    setPedidoEmEdicao(itensFormatados);
    setDadosPedidoFixo({
        cliente_id: pedidoAgrupado.cliente_id,
        data_evento: pedidoAgrupado.itens[0].data_evento, 
        data_devolucao: pedidoAgrupado.dataDevolucao
    });
    setModalAberto(true);
  };

  const handleAlterarQtdExistente = (index: number, novaQtd: number) => {
    const lista = [...pedidoEmEdicao];
    lista[index].quantidade = novaQtd;
    setPedidoEmEdicao(lista);
  };

  const handleRemoverItemLista = (index: number) => {
     if(!window.confirm("Tem certeza que deseja remover este item?")) return;
     const lista = [...pedidoEmEdicao];
     if (lista[index].id) {
         lista[index]._deleted = true;
     } else {
         lista.splice(index, 1);
     }
     setPedidoEmEdicao(lista);
  };

  const handleAdicionarNovoItem = () => {
    if (!novoItemSelecionado) return alert("Selecione um produto.");
    if (novaQtdItem < 1) return alert("Quantidade inválida.");

    const produtoEstoque = estoque.find(e => e.item === novoItemSelecionado);
    if (!produtoEstoque) return;

    setPedidoEmEdicao([...pedidoEmEdicao, {
        item: produtoEstoque.item,
        quantidade: novaQtdItem,
        valor_total: produtoEstoque.preco * novaQtdItem,
        codigo_item: produtoEstoque.codigo_interno,
        _isNew: true,
        _basePrice: produtoEstoque.preco
    }]);

    setNovoItemSelecionado('');
    setNovaQtdItem(1);
  };

  const handleSalvarAlteracoes = async () => {
    if (!dadosPedidoFixo) return;
    setLoading(true);

    try {
        for (const item of pedidoEmEdicao) {
            const produtoEstoque = estoque.find(e => e.item === item.item);
            if (!produtoEstoque) continue;

            if (item._deleted) {
                await db.from('estoque').update({
                    disponivel: produtoEstoque.disponivel + item._originalQty,
                    reservado: Math.max(0, produtoEstoque.reservado - item._originalQty)
                }).eq('id', produtoEstoque.id);
                await db.from('reservas').delete().eq('id', item.id);
                continue;
            }

            if (item._isNew) {
                if (produtoEstoque.disponivel < item.quantidade) {
                    alert(`Estoque insuficiente para adicionar: ${item.item}`);
                    throw new Error("Estoque insuficiente");
                }
                await db.from('estoque').update({
                    disponivel: produtoEstoque.disponivel - item.quantidade,
                    reservado: produtoEstoque.reservado + item.quantidade
                }).eq('id', produtoEstoque.id);
                await db.from('reservas').insert([{
                    cliente_id: dadosPedidoFixo.cliente_id,
                    item: item.item,
                    quantidade: item.quantidade,
                    data_evento: dadosPedidoFixo.data_evento,
                    data_devolucao: dadosPedidoFixo.data_devolucao,
                    status: 'Pendente',
                    forma_pagamento: 'Ajuste',
                    valor_total: item.valor_total,
                    codigo_item: item.codigo_item
                }]);
                continue;
            }

            if (item.quantidade !== item._originalQty) {
                const diferenca = item.quantidade - item._originalQty;
                if (diferenca > 0 && produtoEstoque.disponivel < diferenca) {
                    alert(`Estoque insuficiente para aumentar qtd de: ${item.item}`);
                    throw new Error("Estoque insuficiente");
                }
                await db.from('estoque').update({
                    disponivel: produtoEstoque.disponivel - diferenca,
                    reservado: produtoEstoque.reservado + diferenca
                }).eq('id', produtoEstoque.id);

                const precoUnitario = item.valor_total / item._originalQty;
                const novoTotal = precoUnitario * item.quantidade;

                await db.from('reservas').update({
                    quantidade: item.quantidade,
                    valor_total: novoTotal
                }).eq('id', item.id);
            }
        }
        alert("Pedido atualizado com sucesso!");
        setModalAberto(false);
        fetchData();
    } catch (err: any) {
        if (err.message !== "Estoque insuficiente") alert("Erro ao salvar: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  // -------------------------

  const gerarContrato = (pedido: any) => {
    const cliente = clientes.find(c => c.id === pedido.cliente_id) || {};
    const subtotalItens = pedido.itens.reduce((acc: number, cur: any) => acc + (cur.valor_total || 0), 0);
    const taxaEntrega = pedido.itens[0].taxa_entrega || 0;
    
    // --- LÓGICA DE DESCONTO NO CONTRATO ---
    const desconto = pedido.itens[0].desconto || 0; 
    const totalGeral = subtotalItens + taxaEntrega - desconto;
    // --------------------------------------
    
    const dEnt = formatarDataBR(pedido.itens[0].data_evento);
    const dRec = formatarDataBR(pedido.dataDevolucao);

    // --- NOVA LÓGICA: DIA DA SEMANA ---
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    const getDiaSemana = (dataStr: string) => {
       if (!dataStr) return '';
       const d = new Date(dataStr);
       d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
       return diasSemana[d.getDay()];
    };

    const diaSemanaEnt = getDiaSemana(pedido.itens[0].data_evento);
    const diaSemanaRec = getDiaSemana(pedido.dataDevolucao);
    // ----------------------------------

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>CONTRATO - ${pedido.nomeCliente}</title>
          <style>
            @page { size: portrait; margin: 1.2cm; }
            body { 
                font-family: 'Arial', sans-serif; 
                color: #000; 
                line-height: 1.4; 
                font-size: 13px;
                margin: 0; padding: 0; 
            }
            
            .contract-container { 
                width: 100%; 
                border: 1px solid #000; 
                padding: 20px; 
                box-sizing: border-box; 
                min-height: 98vh;
                display: flex; 
                flex-direction: column; 
            }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .company-info { width: 80%; }
            
            .company-name { font-size: 24px; font-weight: 900; color: #1e40af; text-decoration: underline; margin-bottom: 5px; }
            .company-contact { font-size: 16px; font-weight: 900; margin-bottom: 5px; }
            .company-address { font-size: 12px; font-weight: bold; }
            
            .logo-circle { width: 90px; height: 90px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #eee; }
            .logo-circle img { width: 100%; height: auto; object-fit: contain; }
            
            .main-title { text-align: center; font-size: 30px; font-weight: 900; margin: 20px 0; letter-spacing: 5px; }
            
            .intro-text { font-size: 20px; margin-bottom: 20px; text-align: justify; line-height: 1.5; }
            .intro-text strong { text-transform: uppercase; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; font-weight: 900; }
            th { font-size: 13px; text-transform: uppercase; background-color: #f0f0f0; }
            td { font-size: 13px; }
            
            .align-left { text-align: left; padding-left: 10px; }
            .total-box { font-size: 15px; background-color: #f2f2f2; }
            
            .clauses-container { font-size: 20px; text-align: justify; margin-bottom: 20px; line-height: 1.4; }
            .clause-text { margin-bottom: 10px; }
            
            .obs-container { border: 1px solid #000; padding: 10px; margin: 20px 0; min-height: 50px; font-size: 13px; }
            
            .footer-contract { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-bottom: 10px; }
            .logistics-info { font-weight: 900; font-size: 14px; line-height: 1.5; }
            .sig-line { width: 250px; border-top: 1px solid #000; text-align: center; font-weight: 900; padding-top: 10px; font-size: 13px; }
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

            <div class="intro-text">
              Este instrumento particular, abaixo assinado, LOCADORA CLAUDIA FESTAS, CNPJ 29.639.830.0001.45 e como locatário, <strong>${pedido.nomeCliente.toUpperCase()}</strong>, IDENTIFICAÇÃO: <strong>${cliente['identificação'] || '_________________'}</strong>, com endereço em <strong>${cliente.endereco || '____________________'}</strong>, Bairro: <strong>${cliente.bairro || '_________________'}</strong>, Município: <strong>${cliente.municipio || '_________________'}</strong>, tem ajustado o presente contrato de locação dos equipamentos e utensílios (denominados diante descritos, sobre as cláusulas e condições seguintes).<br>
              Os bens a que se refere o presente contrato, todos de propriedade da LOCADORA, são:
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2px;">
                <div style="font-weight:bold; font-size:13px;">DESCRIÇÃO DO BEM</div>
                <div style="font-weight:bold; font-size:14px;">Telefone do cliente: ${pedido.telefone || cliente.telefone || '________________'}</div>
            </div>

            <table>
              <thead><tr><th width="50">QTD</th><th>DESCRIÇÃO</th><th width="100">VALOR U.</th><th width="110">TOTAL</th></tr></thead>
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
                  <td>R$ ${taxaEntrega.toFixed(2).replace('.', ',')}</td>
                  <td>R$ ${taxaEntrega.toFixed(2).replace('.', ',')}</td>
                </tr>
                
                ${desconto > 0 ? `
                <tr>
                  <td>1</td>
                  <td class="align-left" style="color: red;">DESCONTO PROMOCIONAL</td>
                  <td style="color: red;">- R$ ${desconto.toFixed(2).replace('.', ',')}</td>
                  <td style="color: red;">- R$ ${desconto.toFixed(2).replace('.', ',')}</td>
                </tr>
                ` : ''}

                <tr>
                  <td colspan="3" style="text-align: right; border-right: none; font-size: 14px;">TOTAL GERAL R$</td>
                  <td class="total-box">R$ ${totalGeral.toFixed(2).replace('.', ',')}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="clauses-container">
              <div class="clause-text"><strong>Cláusula 1ª.</strong> O presente contrato tem como utensílios para a festa, todas em bom estado de conservação e limpeza, de propriedade da LOCADORA, que serão locadas ao (à) LOCATÁRIO (a).</div>
              <div class="clause-text"><strong>Cláusula 2ª.</strong> É vedado ao (à) LOCATÁRIO (a) transferir, sublocar, ceder ou emprestar os bens ora locados a terceiros.</div>
              <div class="clause-text"><strong>Cláusula 3ª.</strong> A locação terá duração conforme data abaixo descrita quando os bens serão entregues pelo (a) LOCADOR (A) no endereço indicado pelo (a) LOCATÁRIO, e finalizando no dia combinada abaixo quando os bens serão retirados pelo (a) LOCADOR (a).</div>
              <div class="clause-text"><strong>Cláusula 4ª.</strong> A LOCADORA se isenta de qualquer erro de manuseio do usuário LOCATÁRIO, que venha acarretar acidentes durante a locação.</div>
              <div class="clause-text"><strong>Cláusula 5ª.</strong> Na quebra de utensílios será cobrado. (Mesa R$80,00 - cadeira R$ 45,00 - prato R$ 15,00 - talher unid. R$ 8,00 – taça R$ 10,00 - toalha Oxford 1,50mt. R$ 25,00 - toalha Oxford 2,80mt. 35,00 - toalha amas. 2,80mt R$ 25,00. (Outros produtos serão avaliados o valor)</div>
            </div>

            <div class="obs-container">
              <strong>OBS:</strong> ${pedido.observacoes || '____________________________________________________________________________________________________________________________________________________________________________________'}
            </div>
            <div class="footer-contract">
              <div class="logistics-info">
                ENTREGAR: ${dEnt} <span style="color: #1e40af;">${diaSemanaEnt}</span><br>
                RECOLHER: ${dRec} <span style="color: #1e40af;">${diaSemanaRec}</span>
              </div>
              <div class="sig-line">LOCATÁRIO</div>
              <div class="sig-line">CLAUDIA FESTAS</div>
            </div>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 300); }</script>
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
          <p><strong>OBS:</strong> ${pedido.observacoes || '--'}</p>
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
      const bateBusca = !busca || nomeCliente.toLowerCase().includes(busca.toLowerCase()) || String(r.cliente_id).includes(busca);
      if (bateBusca && (!filtroUrgentes || verificarUrgencia(r.data_devolucao))) {
        const chave = `${r.cliente_id}_${r.data_evento}`;
        if (!grupos[chave]) {
          grupos[chave] = { 
            nomeCliente, 
            telefone: cliente?.telefone, 
            dataDevolucao: r.data_devolucao, 
            cliente_id: r.cliente_id, 
            idPersonalizado: cliente?.['id-client'], 
            observacoes: r.observacoes || '', 
            itens: [] 
          };
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

  if (loading && !modalAberto) return <div className="p-20 text-center text-[#b24a2b] font-bold uppercase tracking-widest">Carregando Gestão...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-700">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black text-gray-800 italic uppercase">Gestão de Pedidos</h1>
        <div className="flex flex-col items-center gap-4 mt-8">
          <input type="text" placeholder="PROCURAR POR NOME OU ID..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full max-w-md px-6 py-4 bg-white border-2 border-gray-100 rounded-full text-xs text-center font-bold outline-none focus:border-[#b24a2b] shadow-sm transition-all" />
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
            <div key={idx} className={`w-full max-w-md rounded-[45px] p-8 border-2 shadow-xl ${atrasado ? 'bg-red-50 border-red-200' : urgente ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-50'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                  {atrasado ? <span className="text-[10px] font-black px-5 py-2 rounded-full uppercase bg-red-500 text-white">⚠️ ATRASADO</span> : urgente ? <span className="text-[10px] font-black px-5 py-2 rounded-full uppercase bg-amber-500 text-white">⏳ DEVOLUÇÃO EM BREVE</span> : <span className="text-[10px] font-black px-5 py-2 rounded-full uppercase bg-orange-600 text-white">NO PRAZO</span>}
                  <span className="text-[9px] font-bold text-gray-400 ml-2 uppercase">ID CLIENTE: {pedido.idPersonalizado || '---'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirWhatsApp(pedido)} className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center"><i className="fa-brands fa-whatsapp"></i></button>
                  <button onClick={() => gerarRomaneio(pedido)} className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center"><i className="fa-solid fa-list-check"></i></button>
                  <button onClick={() => gerarContrato(pedido)} className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center"><i className="fa-solid fa-file-contract"></i></button>
                  <button onClick={() => confirmarDevolucao(pedido)} className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center"><i className="fa-solid fa-check"></i></button>
                </div>
              </div>

              <h3 className="font-black text-3xl text-gray-800 uppercase tracking-tighter mb-1">{pedido.nomeCliente}</h3>
              
              <button 
                onClick={() => handleAbrirEdicao(pedido)}
                className="mt-2 mb-6 border-2 border-black text-black text-[10px] font-black uppercase px-6 py-2 rounded-full hover:bg-black hover:text-white transition-all shadow-sm"
              >
                Editar Pedido
              </button>

              {/* CORREÇÃO NA EXIBIÇÃO DA DATA NO CARD */}
              <p className={`text-[10px] font-bold uppercase mb-8 ${atrasado ? 'text-red-600' : urgente ? 'text-amber-600' : 'text-gray-400'}`}>Devolução: {formatarDataBR(pedido.dataDevolucao)}</p>
              
              <div className="space-y-4 border-t border-gray-100 pt-8 mb-6">
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

              {pedido.observacoes && (
                <div className="bg-gray-50 p-5 rounded-[25px] border border-dashed border-gray-200">
                  <span className="text-[9px] font-black text-[#b24a2b] uppercase tracking-widest block mb-2">Notas da Reserva:</span>
                  <p className="text-xs font-bold text-gray-600 italic">"{pedido.observacoes}"</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE EDIÇÃO DE PEDIDO --- */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[35px] p-8 w-full max-w-2xl shadow-2xl border border-gray-100 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 uppercase italic">Editar Pedido</h3>
                        {/* CORREÇÃO NA EXIBIÇÃO DA DATA NO MODAL */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Data: {formatarDataBR(dadosPedidoFixo?.data_evento)}</p>
                    </div>
                    <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 text-2xl">×</button>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 mb-6">
                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Itens no Pedido</h4>
                    <div className="space-y-3">
                        {pedidoEmEdicao.map((item, idx) => {
                            if (item._deleted) return null; 
                            return (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-gray-700 uppercase">{item.item} {item._isNew && <span className="text-green-500 text-[8px] ml-2">(NOVO)</span>}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Qtd:</span>
                                            <input 
                                                type="number" 
                                                className="w-12 bg-transparent text-center font-black text-sm outline-none"
                                                value={item.quantidade}
                                                min="1"
                                                onChange={(e) => handleAlterarQtdExistente(idx, parseInt(e.target.value))}
                                            />
                                        </div>
                                        <button onClick={() => handleRemoverItemLista(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {pedidoEmEdicao.filter(i => !i._deleted).length === 0 && <p className="text-center text-xs text-gray-400 italic">Nenhum item neste pedido.</p>}
                    </div>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-6 mb-8">
                    <h4 className="text-[9px] font-black text-[#b24a2b] uppercase tracking-widest mb-4">+ Adicionar Novo Item</h4>
                    <div className="flex gap-3">
                        <select 
                            className="flex-1 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-xs text-gray-600"
                            value={novoItemSelecionado}
                            onChange={(e) => setNovoItemSelecionado(e.target.value)}
                        >
                            <option value="">Selecione um produto...</option>
                            {estoque.map(e => (
                                <option key={e.id} value={e.item}>
                                    {e.item} (Disp: {e.disponivel})
                                </option>
                            ))}
                        </select>
                        <input 
                            type="number" 
                            min="1"
                            placeholder="Qtd"
                            className="w-20 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-xs text-center"
                            value={novaQtdItem}
                            onChange={(e) => setNovaQtdItem(parseInt(e.target.value))}
                        />
                        <button 
                            onClick={handleAdicionarNovoItem}
                            className="bg-green-500 hover:bg-green-600 text-white w-12 rounded-xl flex items-center justify-center transition-all shadow-lg"
                        >
                            <i className="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setModalAberto(false)} className="flex-1 p-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200">Cancelar</button>
                    <button onClick={handleSalvarAlteracoes} className="flex-1 p-4 bg-[#b24a2b] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#943a20]">Salvar Alterações</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default OrderManagement;