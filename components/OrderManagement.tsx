import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/supabase';
import logoImg from '../logo.png';
// --- IMPORTANTE: Importar o som de notificação ---
// Certifique-se de que o caminho está correto. Se estiver na pasta public, use apenas o caminho relativo.
// Se estiver em src, importe como o logo. Vou assumir que está em src ou assets.
// Se estiver na public, pode usar: const audioUrl = '/notificacao.mp3';
import audioNotification from '../notificacao.mp3'; // Ajuste o caminho conforme necessário

const OrderManagement: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroUrgentes, setFiltroUrgentes] = useState(false);

  // Estados para pedidos online e controle de lista negra
  const [pedidosOnline, setPedidosOnline] = useState<any[]>([]);
  const [blacklist, setBlacklist] = useState<any[]>([]);
  
  // NOVO ESTADO: Para armazenar os dados da tabela reservas_futuras do banco
  const [reservasFuturasBanco, setReservasFuturasBanco] = useState<any[]>([]);

  // Referência para armazenar a quantidade anterior de pedidos para comparação
  const prevPedidosLengthRef = useRef<number>(0);

  // Estados para o Modal de Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoData, setEditandoData] = useState(false);
  const [editandoDevolucao, setEditandoDevolucao] = useState(false);
  const [pedidoEmEdicao, setPedidoEmEdicao] = useState<any[]>([]);
  const [dadosPedidoFixo, setDadosPedidoFixo] = useState<any>(null);
  const [novoItemSelecionado, setNovoItemSelecionado] = useState('');
  const [novaQtdItem, setNovaQtdItem] = useState(1);
  
  // NOVO ESTADO: Armazena a data original para garantir que o update encontre o registro certo
  const [dataEventoOriginal, setDataEventoOriginal] = useState('');

  const fetchData = async () => {
    try {
      // Removendo setLoading(true) daqui para evitar piscar a tela no polling
      // setLoading(true); 
      const [resClientes, resReservas, resEstoque, resPedidosOnline, resBlacklist, resReservasFuturas] = await Promise.all([
        db.from('cadastro').select('*'),
        db.from('reservas').select('*').order('data_evento', { ascending: false }),
        db.from('estoque').select('*').order('item'),
        db.from('pedidos_online').select('*').order('created_at', { ascending: false }),
        db.from('blacklist').select('documento'),
        db.from('reservas_futuras').select('*').order('data_evento', { ascending: true }) // Busca as reservas futuras do banco
      ]);
      setClientes(resClientes.data || []);
      setReservas(resReservas.data || []);
      setEstoque(resEstoque.data || []);
      setPedidosOnline(resPedidosOnline.data || []);
      setBlacklist(resBlacklist.data || []);
      setReservasFuturasBanco(resReservasFuturas.data || []); // Salva no estado
    } catch (err: any) {
      console.error("Erro ao sincronizar dados:", err.message);
    } finally {
      setLoading(false); // Mantém apenas no final da carga inicial
    }
  };

  // Carga inicial
  useEffect(() => {
    setLoading(true); // Loading visível apenas na primeira vez
    fetchData();
  }, []);

  // --- LÓGICA DE SOM DE NOTIFICAÇÃO ---
  useEffect(() => {
    // Se o número de pedidos aumentou, toca o som
    if (pedidosOnline.length > prevPedidosLengthRef.current) {
        // Ignora a primeira carga (quando prev é 0 e atual > 0, mas loading acabou de terminar)
        // Porém, se quiser tocar na entrada, remova a verificação de loading se necessário.
        // Aqui vamos tocar sempre que aumentar.
        const audio = new Audio(audioNotification);
        audio.play().catch(e => console.log("Erro ao tocar som (interação necessária):", e));
    }
    // Atualiza a referência
    prevPedidosLengthRef.current = pedidosOnline.length;
  }, [pedidosOnline]);

  // BLOCO DE ATUALIZAÇÃO AUTOMÁTICA ADICIONADO
  useEffect(() => {
    // Configura o intervalo para rodar a cada 60.000 milissegundos (1 minuto)
    const intervalo = setInterval(() => {
      console.log("Atualizando dados automaticamente...");
      fetchData(); // Executa a função que busca novos pedidos e atualiza o estoque
    }, 60000);

    // Limpa o intervalo quando o proprietário sai da tela para não gastar memória
    return () => clearInterval(intervalo);
  }, []);

  const verificarSeEstaNaListaNegra = (documentoPedido: string) => {
    if (!documentoPedido) return false;
    const docLimpoPedido = documentoPedido.replace(/\D/g, '');
    return clientes.some(c =>
      (c.identificação || "").replace(/\D/g, '') === docLimpoPedido && c.lista_negra === true
    );
  };

  // FUNÇÃO ATUALIZADA: Agora ela deleta para ativar o TRIGGER SQL que você criou
  const handleAceitarPedido = async (pedido: any) => {
    if (!window.confirm(`Deseja aceitar o pedido de ${pedido.cliente_nome}?`)) return;

    try {
      setLoading(true);

      // 1. Atualizar o estoque primeiro (importante para manter o controle)
      const linhasItens = pedido.itens_texto.split(', ');

      for (const linha of linhasItens) {
        const match = linha.match(/(\d+)x (.+)/);
        if (match) {
          const qtd = parseInt(match[1]);
          const nomeItem = match[2];
          const infoEstoque = estoque.find(e => e.item === nomeItem);

          if (infoEstoque) {
            if (infoEstoque.disponivel < qtd) {
              alert(`Estoque insuficiente para: ${nomeItem}`);
              throw new Error(`Estoque insuficiente: ${nomeItem}`);
            }

            await db.from('estoque').update({
              disponivel: infoEstoque.disponivel - qtd,
              reservado: (infoEstoque.reservado || 0) + qtd
            }).eq('id', infoEstoque.id);
          }
        }
      }

      // 2. DELETAR DO ONLINE: Isso dispara o gatilho processar_aceite_pedido() no Supabase
      // Removida qualquer referência à coluna "origem" para evitar o erro anterior
      const { error } = await db.from('pedidos_online').delete().eq('id', pedido.id);

      if (error) throw error;

      alert("Pedido processado! O banco de dados gerou a reserva automaticamente.");
      fetchData();
    } catch (err: any) {
      alert("Erro ao processar aceitação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatarDataBR = (dataString: string) => {
    if (!dataString) return '--/--/----';
    const parteData = dataString.split('T')[0];
    const [ano, mes, dia] = parteData.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const verificarAtraso = (dataDevolucao: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataDev = new Date(dataDevolucao);
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

  const handleAbrirEdicao = (pedidoAgrupado: any) => {
    const itensFormatados = pedidoAgrupado.itens.map((i: any) => ({ ...i, _originalQty: i.quantidade }));
    setPedidoEmEdicao(itensFormatados);
    
    // Salva a data original para usar na cláusula WHERE do update
    setDataEventoOriginal(pedidoAgrupado.itens[0].data_evento);

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
    if (!window.confirm("Tem certeza que deseja remover este item?")) return;
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
      // CORREÇÃO AQUI: Usamos dataEventoOriginal para encontrar os registros antigos
      await db.from('reservas')
        .update({ 
            data_devolucao: dadosPedidoFixo.data_devolucao,
            data_evento: dadosPedidoFixo.data_evento 
        })
        .eq('cliente_id', dadosPedidoFixo.cliente_id)
        .eq('data_evento', dataEventoOriginal); // Usa a data ANTIGA para achar o registro

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
            data_evento: dadosPedidoFixo.data_evento, // Salva com a nova data
            data_devolucao: dadosPedidoFixo.data_devolucao,
            status: 'Pendente',
            forma_pagamento: 'Ajuste',
            valor_total: item.valor_total,
            codigo_item: item.codigo_item
          }]);
          continue;
        }
        if (item.quantidade !== item._originalQty) {
          const diderenca = item.quantidade - item._originalQty;
          if (diderenca > 0 && diderenca > produtoEstoque.disponivel) {
            alert(`Estoque insuficiente para aumentar qtd de: ${item.item}`);
            throw new Error("Estoque insuficiente");
          }
          await db.from('estoque').update({
            disponivel: produtoEstoque.disponivel - diderenca,
            reservado: produtoEstoque.reservado + diderenca
          }).eq('id', diderenca > 0 ? produtoEstoque.id : produtoEstoque.id);
          const precoUnitario = item.valor_total / item._originalQty;
          const novoTotal = precoUnitario * item.quantidade;
          await db.from('reservas').update({
            quantidade: item.quantidade,
            valor_total: novoTotal
          }).eq('id', item.id);
        }
      }
      setModalAberto(false);
      fetchData();
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const gerarContrato = (pedido: any) => {
    const cliente = clientes.find(c => c.id === pedido.cliente_id) || {};
    const subtotalItens = pedido.itens.reduce((acc: number, cur: any) => acc + (cur.valor_total || 0), 0);
    const taxaEntrega = pedido.itens[0].taxa_entrega || 0;
    const desconto = pedido.itens[0].desconto || 0;
    const totalGeral = subtotalItens + taxaEntrega - desconto;
    const dEnt = formatarDataBR(pedido.itens[0].data_evento);
    const dRec = formatarDataBR(pedido.dataDevolucao);
    
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const getDiaSemana = (dataStr: string) => {
      if (!dataStr) return '';
      const d = new Date(dataStr);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      return diasSemana[d.getDay()];
    };
    const diaSemanaEnt = getDiaSemana(pedido.itens[0].data_evento);
    const diaSemanaRec = getDiaSemana(pedido.dataDevolucao);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>CONTRATO - ${pedido.nomeCliente}</title>
          <style>
            @page { 
                size: A4; 
                margin: 0; /* Removemos a margem do navegador para controlar via CSS */
            }
            body { 
                font-family: Arial, Helvetica, sans-serif; 
                margin: 0; 
                padding: 0;
                width: 210mm; /* FORÇA A LARGURA A4 */
                min-height: 297mm;
                display: flex;
                justify-content: center;
                box-sizing: border-box;
                padding-top: 5mm; /* Margem superior */
            }
            .page-container {
                width: 200mm; /* Largura fixa do conteúdo (210mm - margens) */
                padding: 10px;
                border: 2px solid black; /* Borda preta grossa em volta de tudo */
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                min-height: 285mm; /* Altura para ocupar a folha quase toda */
            }
            .header {
                margin-bottom: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .company-info {
                flex: 1;
            }
            .logo-box {
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: 10px;
            }
            .logo-box img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 50%;
            }
            .company-name {
                font-weight: 900;
                font-size: 16px;
                color: #1e40af; /* COR AZUL RESTAURADA */
                text-decoration: underline;
            }
            .contract-title {
                text-align: center;
                font-weight: 900;
                font-size: 18px;
                margin: 15px 0;
                letter-spacing: 2px;
            }
            .intro-text {
                text-align: justify;
                margin-bottom: 15px;
                font-size: 11px;
                line-height: 1.3;
            }
            table { 
                width: 100%; /* Força a tabela a abrir até a borda */
                border-collapse: collapse; 
                margin-bottom: 15px; 
                font-size: 11px;
            }
            th, td { 
                border: 1px solid #000; 
                padding: 4px; 
                text-align: center; 
            }
            th {
                background-color: #eee;
                font-weight: 900;
            }
            .align-left { 
                text-align: left; 
                padding-left: 5px; 
            }
            .clauses {
                text-align: justify;
                font-size: 10px; 
                margin-bottom: auto; /* Empurra o rodapé para baixo */
            }
            .clause-item {
                margin-bottom: 5px;
            }
            .obs-container { 
                border: 1px solid #000; 
                padding: 5px; 
                margin-top: 10px;
                margin-bottom: 10px; 
                font-size: 10px; 
                min-height: 150px; /* CAIXA GRANDE IGUAL A FOTO */
            }
            .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
                margin-bottom: 5px;
            }
            .sig-box {
                width: 40%;
                text-align: center;
                border-top: 1px solid #000;
                padding-top: 5px;
                font-weight: bold;
                font-size: 10px;
            }
            .dates-info {
                font-weight: 900;
                margin-top: 10px;
                margin-bottom: 15px;
                font-size: 11px;
            }
          </style>
        </head>
        <body>
          
          <div class="page-container">
              <div class="header">
                 <div class="company-info">
                    <div class="company-name">LOCAÇÃO DE ARTIGOS PARA FESTAS</div>
                    <div style="font-weight: 900; font-size: 12px;">Fone: 48 98412.3233</div>
                    <div style="font-size: 10px;">Rua Bernardino Prudêncio de Amorim, 667, Jardim Janaina, Biguaçu, SC</div>
                    <div style="font-weight: 900; margin-top: 5px;">CLAUDIA FESTA</div>
                    <div style="font-size: 9px; margin-top: 2px;">${new Date().toLocaleString('pt-BR')}</div>
                 </div>
                 <div class="logo-box">
                    <img src="${logoImg}" alt="Logo">
                 </div>
              </div>

              <div class="contract-title">CONTRATO</div>

              <div class="intro-text">
                Este instrumento particular, abaixo assinado, LOCADORA CLAUDIA FESTAS, CNPJ 29.639.830.0001.45 e como
                locatário, <strong>${pedido.nomeCliente.toUpperCase()}</strong>, IDENTIFICAÇÃO: <strong>${cliente['identificação'] || '_________________'}</strong>, com endereço em <strong>${cliente.endereco || '____________________'}</strong>, Bairro: <strong>${cliente.bairro || '_________________'}</strong>, 
                tem ajustado o presente contrato de locação dos equipamentos e utensílios (denominados diante
                descritos, sobre as cláusulas e condições seguintes).
                <br>
                Os bens a que se refere o presente contrato, todos de propriedade da LOCADORA, são:
              </div>

              <div style="font-weight: 900; font-size: 11px; margin-bottom: 2px; display: flex; justify-content: space-between;">
                 <span>DESCRIÇÃO DO BEM</span>
                 <span>Telefone do cliente: ${pedido.telefone || cliente.telefone || '_____________'}</span>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 40px;">QTD</th>
                    <th>DESCRIÇÃO</th>
                    <th style="width: 80px;">VALOR U.</th>
                    <th style="width: 80px;">TOTAL</th>
                  </tr>
                </thead>
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
                      <td class="align-left" style="color:red;">DESCONTO PROMOCIONAL</td>
                      <td style="color:red;">- R$ ${desconto.toFixed(2).replace('.', ',')}</td>
                      <td style="color:red;">- R$ ${desconto.toFixed(2).replace('.', ',')}</td>
                  </tr>` : ''}

                  <tr>
                    <td colspan="3" style="text-align: right; font-weight: 900; border-right: none;">TOTAL GERAL R$</td>
                    <td style="font-weight: 900; background-color: #eee;">R$ ${totalGeral.toFixed(2).replace('.', ',')}</td>
                  </tr>
                </tbody>
              </table>

              <div class="clauses">
                 <div class="clause-item"><strong>Cláusula 1ª.</strong> O presente contrato tem como utensílios para a festa, todas em bom estado de conservação e limpeza, de propriedade da LOCADORA, que serão locadas ao (à) LOCATÁRIO (a).</div>
                 
                 <div class="clause-item"><strong>Cláusula 2ª.</strong> É vedado ao (à) LOCATÁRIO (a) transferir, sublocar, ceder ou emprestar os bens ora locados a terceiros.</div>
                 
                 <div class="clause-item"><strong>Cláusula 3ª.</strong> A locação terá duração conforme data abaixo descrita quando os bens serão entregues pelo (a) LOCADOR (A) no endereço indicado pelo (a) LOCATÁRIO, e finalizando no dia combinada abaixo quando os bens serão retirados pelo (a) LOCADOR (a).</div>
                 
                 <div class="clause-item"><strong>Cláusula 4ª.</strong> A LOCADORA se isenta de qualquer erro de manuseio do usuário LOCATÁRIO, que venha acarretar acidentes durante a locação.</div>
                 
                 <div class="clause-item"><strong>Cláusula 5ª.</strong> Na quebra de utensílios será cobrado. (Mesa R$80,00 - cadeira R$ 45,00 - prato R$ 15,00 - talher unid. R$ 8,00 - taça R$ 10,00 - toalha Oxford 1,50mt. R$ 25,00 - toalha Oxford 2,80mt. 35,00 - toalha amas. 2,80mt R$ 25,00. (Outros produtos serão avaliados o valor)</div>
              </div>

              <div class="obs-container">
                <strong>OBS:</strong> ${pedido.observacoes || ''}
              </div>

              <div class="dates-info">
                 ENTREGAR: ${dEnt} <span style="color: blue;">${diaSemanaEnt}</span><br>
                 RECOLHER: ${dRec} <span style="color: blue;">${diaSemanaRec}</span>
              </div>

              <div class="signatures">
                <div class="sig-box">LOCATÁRIO</div>
                <div class="sig-box">CLAUDIA FESTAS</div>
              </div>
          </div>

          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
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
            statusEstoque: r.status_estoque,
            origem: r.origem,
            itens: []
          };
        }
        grupos[chave].itens.push(r);
      }
    });
    return Object.values(grupos).sort((a: any, b: any) => new Date(a.dataDevolucao).getTime() - new Date(b.dataDevolucao).getTime());
  };

  // --- NOVA LÓGICA: Filtrar reservas futuras do banco e preparar para o modal ---
  const exibirReservasFuturas = () => {
    return reservasFuturasBanco.map((res) => {
        const cliente = clientes.find(c => c.id === res.cliente_id);
        const itemEstoque = estoque.find(e => e.id === res.item_id);
        
        // Agrupando para o modal de edição em caso de clique
        const pedidoAgrupadoParaModal = {
            nomeCliente: cliente?.cliente || 'ID: ' + res.cliente_id,
            cliente_id: res.cliente_id,
            telefone: cliente?.telefone,
            dataDevolucao: res.data_devolucao,
            itens: [{
                id: res.id,
                item: itemEstoque?.item || 'Item ' + res.item_id,
                quantidade: res.quantidade,
                data_evento: res.data_evento,
                codigo_item: itemEstoque?.codigo_interno || 'S/C',
                valor_total: (itemEstoque?.preco || 0) * res.quantidade
            }]
        };

        return {
            ...res,
            nomeCliente: cliente?.cliente || 'ID: ' + res.cliente_id,
            itemNome: itemEstoque?.item || 'Item ' + res.item_id,
            objetoParaModal: pedidoAgrupadoParaModal
        };
    });
  };

  // NOVA FUNÇÃO: CANCELAR RESERVA FUTURA
  const handleCancelarReservaFutura = async (id: string, nomeCliente: string) => {
    if (!window.confirm(`Tem certeza que deseja CANCELAR e apagar permanentemente a reserva de ${nomeCliente}?`)) return;
    
    try {
      setLoading(true);
      const { error } = await db.from('reservas_futuras').delete().eq('id', id);
      
      if (error) throw error;
      
      alert("Reserva futura cancelada com sucesso!");
      fetchData(); // Atualiza a lista
    } catch (err: any) {
      alert("Erro ao cancelar reserva: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalUrgentes = Object.values(
    reservas.filter(r => r.status?.toLowerCase() !== 'finalizado')
      .reduce((acc: any, r) => {
        if (verificarUrgencia(r.data_devolucao)) acc[`${r.cliente_id}_${r.data_evento}`] = true;
        return acc;
      }, {})
  ).length;

  const handleRecusarPedido = async (id: number) => {
    if (!window.confirm("Deseja recusar e apagar este pedido online?")) return;
    try {
      await db.from('pedidos_online').delete().eq('id', id);
      fetchData();
    } catch (err: any) {
      alert("Erro ao recusar: " + err.message);
    }
  };

  if (loading && !modalAberto) return <div className="p-20 text-center text-[#b24a2b] font-bold uppercase tracking-widest">Carregando Gestão...</div>;

  return (
    <div className="max-w-[1400px] mx-auto pb-20 animate-in fade-in duration-700">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black text-gray-800 italic uppercase">Gestão de Pedidos</h1>
        <div className="flex flex-col items-center gap-4 mt-8">
          <input type="text" placeholder="PROCURAR POR NOME OU ID..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full max-w-md px-6 py-4 bg-white border-2 border-gray-100 rounded-full text-xs text-center font-bold outline-none focus:border-[#b24a2b] shadow-sm transition-all" />
          <button onClick={() => setFiltroUrgentes(!filtroUrgentes)} className={`px-6 py-3 rounded-full font-black text-[10px] uppercase border-2 flex items-center gap-3 ${filtroUrgentes ? 'bg-amber-50 border-amber-500 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200'}`}>
            {filtroUrgentes ? '✕ Mostrar todos' : `⏳ Ver devoluções em 24h`}
            {totalUrgentes > 0 && !filtroUrgentes && <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[9px] animate-pulse">{totalUrgentes}</span>}
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {pedidosAgrupadosEFiltrados().map((pedido: any, idx) => {
            const atrasado = verificarAtraso(pedido.dataDevolucao);
            const urgente = verificarUrgencia(pedido.dataDevolucao);
            const corBotaoConfirmar = pedido.statusEstoque === 'processado' ? 'bg-orange-500' : 'bg-green-600';
            const isOnline = pedido.origem === 'online';

            return (
              <div key={idx} className={`w-full rounded-[45px] p-8 border-2 shadow-xl ${atrasado ? 'bg-red-50 border-red-200' : urgente ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-50'}`}>
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {atrasado ? <span className="text-[10px] font-black px-4 py-2 rounded-full uppercase bg-red-500 text-white">⚠️ ATRASADO</span> : urgente ? <span className="text-[10px] font-black px-4 py-2 rounded-full uppercase bg-amber-500 text-white">⏳ EM BREVE</span> : <span className="text-[10px] font-black px-4 py-2 rounded-full uppercase bg-orange-600 text-white">NO PRAZO</span>}
                      {isOnline && <span className="text-[9px] font-black px-3 py-1.5 rounded-full uppercase bg-blue-600 text-white shadow-sm border border-blue-400">Online</span>}
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 ml-2 uppercase">ID CLIENTE: {pedido.idPersonalizado || '---'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button onClick={() => abrirWhatsApp(pedido)} className="w-9 h-9 bg-green-500 text-white rounded-full flex items-center justify-center text-sm shadow-sm hover:scale-105 transition-transform"><i className="fa-brands fa-whatsapp"></i></button>
                    <button onClick={() => gerarRomaneio(pedido)} className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm shadow-sm hover:scale-105 transition-transform"><i className="fa-solid fa-list-check"></i></button>
                    <button onClick={() => gerarContrato(pedido)} className="w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm shadow-sm hover:scale-105 transition-transform"><i className="fa-solid fa-file-contract"></i></button>
                    <button onClick={() => confirmarDevolucao(pedido)} className={`w-10 h-10 ${corBotaoConfirmar} text-white rounded-full flex items-center justify-center text-base shadow-md hover:scale-105 transition-transform`}>
                      <i className="fa-solid fa-check"></i>
                    </button>
                  </div>
                </div>

                <h3 className="font-black text-3xl text-gray-800 uppercase tracking-tighter mb-1">{pedido.nomeCliente}</h3>
                <button onClick={() => handleAbrirEdicao(pedido)} className="mt-2 mb-6 border-2 border-black text-black text-[10px] font-black uppercase px-6 py-2 rounded-full hover:bg-black hover:text-white transition-all shadow-sm">Editar Pedido</button>
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

        <aside className="w-full lg:w-[350px] shrink-0 space-y-8 sticky top-4">
          
          <div>
            <div className="bg-[#a34b2f] rounded-t-[35px] p-6 flex items-center justify-center gap-3">
              <i className="fa-solid fa-earth-americas text-white text-xl"></i>
              <div className="text-center">
                <h2 className="text-white font-black uppercase italic tracking-wider leading-none">Pedidos Online</h2>
                <p className="text-white/60 text-[8px] font-bold uppercase mt-1">Solicitações via Web App</p>
              </div>
            </div>
            <div className="bg-white border-2 border-[#a34b2f]/20 rounded-b-[35px] p-8 shadow-xl min-h-[300px] flex flex-col items-center justify-start">
              {pedidosOnline.length > 0 ? (
                <div className="w-full space-y-4">
                  {pedidosOnline.map((po) => {
                    const estaBloqueado = verificarSeEstaNaListaNegra(po.cliente_whatsapp);
                    const itensParaImprimir = po.itens_texto ? po.itens_texto.split(', ').map((str: string) => {
                      const match = str.match(/(\d+)x (.+)/);
                      return match ? { quantidade: parseInt(match[1]), item: match[2], valor_total: 0, data_evento: po.created_at } 
                                   : { quantidade: 1, item: str, valor_total: 0, data_evento: po.created_at };
                    }) : [];
                    const clienteExistente = clientes.find(c => c.telefone === po.cliente_whatsapp) || {};
                    const pedidoAdaptado = {
                      id: po.id,
                      nomeCliente: po.cliente_nome,
                      cliente_id: clienteExistente.id || 0,
                      telefone: po.cliente_whatsapp,
                      dataDevolucao: po.created_at, 
                      itens: itensParaImprimir,
                      observacoes: 'Solicitação Online - Aguardando Aprovação',
                      taxa_entrega: 0,
                      desconto: 0
                    };

                    return (
                      <div key={po.id} className={`bg-gray-50 border p-4 rounded-3xl transition-all ${estaBloqueado ? 'border-red-600 shadow-[0_0_15px_rgba(239,68,68,0.25)]' : 'border-gray-100'}`}>
                        {estaBloqueado && (
                          <div className="flex items-center justify-center gap-2 mb-3 bg-red-600 text-white py-1.5 rounded-xl animate-pulse">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <span className="font-black text-[10px] uppercase tracking-tighter">Atenção: Lista Negra</span>
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className={`font-black text-sm uppercase ${estaBloqueado ? 'text-red-600' : 'text-gray-800'}`}>{po.cliente_nome}</h4>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">{formatarDataBR(po.created_at)}</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                             <button onClick={() => abrirWhatsApp({ telefone: po.cliente_whatsapp })} className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-sm"><i className="fa-brands fa-whatsapp text-xs"></i></button>
                             <button onClick={() => gerarRomaneio(pedidoAdaptado)} className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-sm"><i className="fa-solid fa-list-check text-xs"></i></button>
                          </div>
                        </div>
                        <div className="mt-3 bg-white/50 p-3 rounded-xl border border-dashed border-gray-200">
                          <p className="text-[10px] font-bold text-gray-600 leading-tight">{po.itens_texto}</p>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => handleAceitarPedido(po)} className="flex-1 bg-green-500 text-white py-2 rounded-full text-[9px] font-black uppercase">Aceitar</button>
                          <button onClick={() => handleRecusarPedido(po.id)} className="bg-white border-2 border-red-500 text-red-500 px-4 py-2 rounded-full text-[9px] font-black uppercase">Recusar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center mt-10 text-gray-300 uppercase font-black text-[9px]">Sem novos pedidos.</div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-[#2f4f4f] rounded-t-[35px] p-6 flex items-center justify-center gap-3">
              <i className="fa-solid fa-calendar-days text-white text-xl"></i>
              <div className="text-center">
                <h2 className="text-white font-black uppercase italic tracking-wider leading-none">Reservas Futuras</h2>
                <p className="text-white/60 text-[8px] font-bold uppercase mt-1">Conforme Banco de Dados</p>
              </div>
            </div>
            <div className="bg-white border-2 border-[#2f4f4f]/20 rounded-b-[35px] p-8 shadow-xl min-h-[300px] flex flex-col items-center justify-start overflow-y-auto max-h-[500px]">
              {exibirReservasFuturas().length > 0 ? (
                <div className="w-full space-y-4">
                  {exibirReservasFuturas().map((res, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-100 p-4 rounded-3xl">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                           <h4 className="font-black text-sm uppercase text-gray-800">{res.nomeCliente}</h4>
                           <div className="flex gap-1 mt-1">
                               {/* Botões de Ação Adicionados */}
                               <button onClick={() => abrirWhatsApp(res.objetoParaModal)} className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:scale-110 transition-transform"><i className="fa-brands fa-whatsapp"></i></button>
                               <button onClick={() => gerarRomaneio(res.objetoParaModal)} className="w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:scale-110 transition-transform"><i className="fa-solid fa-list-check"></i></button>
                               <button onClick={() => gerarContrato(res.objetoParaModal)} className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:scale-110 transition-transform"><i className="fa-solid fa-file-contract"></i></button>
                               <button onClick={() => confirmarDevolucao(res.objetoParaModal)} className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:scale-110 transition-transform"><i className="fa-solid fa-check"></i></button>
                           </div>
                           <button 
                             onClick={() => handleAbrirEdicao(res.objetoParaModal)} 
                             className="mt-2 text-[8px] font-black uppercase bg-black text-white px-2 py-1 rounded-full hover:bg-gray-800 transition-colors"
                           >
                             Editar Pedido
                           </button>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <span className="bg-blue-100 text-blue-600 text-[9px] font-black px-2 py-1 rounded-lg">
                             {formatarDataBR(res.data_evento)}
                           </span>
                           {/* --- BOTÃO CANCELAR RESERVA ADICIONADO ABAIXO DA DATA AZUL --- */}
                           <button 
                             onClick={() => handleCancelarReservaFutura(res.id, res.nomeCliente)}
                             className="text-[8px] font-black uppercase text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-100 transition-all active:scale-95"
                           >
                             <i className="fa-solid fa-xmark mr-1"></i> Cancelar Reserva
                           </button>
                        </div>
                      </div>
                      <div className="bg-white/50 p-3 rounded-xl border border-dashed border-gray-200">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">
                           {res.quantidade}x {res.itemNome}
                        </p>
                        <p className="text-[8px] font-black text-gray-300 mt-2 uppercase italic">Status: {res.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center mt-10 text-gray-300 uppercase font-black text-[9px]">Nenhuma reserva futura salva.</div>
              )}
            </div>
          </div>

        </aside>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[35px] p-8 w-full max-w-2xl shadow-2xl border border-gray-100 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-gray-800 uppercase italic">Editar Pedido</h3>
                
                <div className="flex items-center gap-2 mt-1">
                    {editandoData ? (
                        <input 
                            type="date" 
                            className="text-[10px] font-bold text-gray-600 border rounded px-1 outline-none"
                            value={dadosPedidoFixo?.data_evento?.split('T')[0]} 
                            onChange={(e) => setDadosPedidoFixo({ ...dadosPedidoFixo, data_evento: e.target.value })}
                            onBlur={() => setEditandoData(false)}
                            autoFocus
                        />
                    ) : (
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Data: {formatarDataBR(dadosPedidoFixo?.data_evento)}</p>
                    )}
                    <button onClick={() => setEditandoData(!editandoData)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fa-solid fa-pencil text-[9px]"></i>
                    </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {editandoDevolucao ? (
                    <input type="date" className="text-[10px] font-bold text-gray-600 border rounded px-1 outline-none" min={new Date().toISOString().split('T')[0]} value={dadosPedidoFixo?.data_devolucao?.split('T')[0]} onChange={(e) => setDadosPedidoFixo({ ...dadosPedidoFixo, data_devolucao: e.target.value })} onBlur={() => setEditandoDevolucao(false)} autoFocus />
                  ) : (
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Devolução: {formatarDataBR(dadosPedidoFixo?.data_devolucao)}</p>
                  )}
                  <button onClick={() => setEditandoDevolucao(!editandoDevolucao)} className="text-gray-400 hover:text-gray-600 transition-colors"><i className="fa-solid fa-pencil text-[9px]"></i></button>
                </div>
              </div>
              <button onClick={() => { setModalAberto(false); setEditandoDevolucao(false); setEditandoData(false); }} className="text-gray-400 hover:text-red-500 text-2xl">×</button>
            </div>
            <div className="bg-gray-50 rounded-3xl p-6 mb-6">
              <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Itens no Pedido</h4>
              <div className="space-y-3">
                {pedidoEmEdicao.map((item, idx) => {
                  if (item._deleted) return null;
                  return (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex-1"><p className="text-xs font-black text-gray-700 uppercase">{item.item} {item._isNew && <span className="text-green-500 text-[8px] ml-2">(NOVO)</span>}</p></div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg"><span className="text-[8px] font-bold text-gray-400 uppercase">Qtd:</span><input type="number" className="w-12 bg-transparent text-center font-black text-sm outline-none" value={item.quantidade} min="1" onChange={(e) => handleAlterarQtdExistente(idx, parseInt(e.target.value))} /></div>
                        <button onClick={() => handleRemoverItemLista(idx)} className="text-red-500 hover:text-red-700 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-6 mb-8">
              <h4 className="text-[9px] font-black text-[#b24a2b] uppercase tracking-widest mb-4">+ Adicionar Novo Item</h4>
              <div className="flex gap-3">
                <select className="flex-1 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-xs text-gray-600" value={novoItemSelecionado} onChange={(e) => setNovoItemSelecionado(e.target.value)}>
                  <option value="">Selecione um produto...</option>
                  {estoque.map(e => (<option key={e.id} value={e.item}>{e.item} (Disp: {e.disponivel})</option>))}
                </select>
                <input type="number" min="1" placeholder="Qtd" className="w-20 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-xs text-center" value={novaQtdItem} onChange={(e) => setNovaQtdItem(parseInt(e.target.value))} />
                <button onClick={handleAdicionarNovoItem} className="bg-green-500 hover:bg-green-600 text-white w-12 rounded-xl flex items-center justify-center transition-all shadow-lg"><i className="fa-solid fa-plus"></i></button>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModalAberto(false); setEditandoDevolucao(false); setEditandoData(false); }} className="flex-1 p-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200">Cancelar</button>
              <button onClick={handleSalvarAlteracoes} className="flex-1 p-4 bg-[#b24a2b] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;