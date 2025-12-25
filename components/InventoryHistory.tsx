import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

interface InventoryHistoryProps {
  clientId?: number | null;
  onBack?: () => void;
}

const InventoryHistory: React.FC<InventoryHistoryProps> = ({ clientId, onBack }) => {
  const [pedidosAgrupados, setPedidosAgrupados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDadosAgrupados = async () => {
    try {
      setLoading(true);
      let query = db.from('reservas').select('*, cadastro(*)').order('data_evento', { ascending: false });
      if (clientId) query = query.eq('cliente_id', clientId);
      const { data, error } = await query;
      if (error) throw error;

      const mapaPedidos: { [key: string]: any } = {};
      data?.forEach(item => {
        const chavePedido = `${item.cliente_id}_${item.data_evento}`;
        if (!mapaPedidos[chavePedido]) {
          mapaPedidos[chavePedido] = {
            id: item.id,
            cliente_id: item.cliente_id,
            nomeCliente: item.cadastro?.cliente || 'Cliente não encontrado',
            data_evento: item.data_evento,
            data_devolucao: item.data_devolucao,
            cadastro: item.cadastro,
            itens: []
          };
        }
        mapaPedidos[chavePedido].itens.push(item);
      });
      setPedidosAgrupados(Object.values(mapaPedidos));
    } catch (err: any) {
      console.error("Erro ao carregar pedidos:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDadosAgrupados(); }, [clientId]);

  // NOVO: FUNÇÃO PARA IMPRIMIR CONTRATO COMPLETO
  const imprimirContrato = async (pedido: any) => {
    const janela = window.open('', '_blank');
    if (!janela) return;

    try {
      const { data: detalhes, error } = await db
        .from('reservas')
        .select('*, estoque(preco)')
        .eq('cliente_id', pedido.cliente_id)
        .eq('data_evento', pedido.data_evento);

      if (error) throw error;

      let totalPedido = 0;
      const taxaEntrega = 20.00;
      const dataEntrega = new Date(pedido.data_evento).toLocaleDateString('pt-BR');
      const dataRecolhida = new Date(pedido.data_devolucao).toLocaleDateString('pt-BR');

      const linhas = detalhes?.map(i => {
        const valorU = i.estoque?.preco || 0;
        const totalI = i.quantidade * valorU;
        totalPedido += totalI;
        return `
          <tr>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i.quantidade}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: left;">${i.item.toUpperCase()}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">R$ ${valorU.toFixed(2).replace('.', ',')}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">R$ ${totalI.toFixed(2).replace('.', ',')}</td>
          </tr>
        `;
      }).join('') || '';

      janela.document.write(`
        <html>
          <head>
            <title>Contrato - Claudia Festas</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; line-height: 1.4; color: #000; }
              .header { text-align: center; margin-bottom: 10px; }
              .header h1 { font-size: 24px; text-decoration: underline; margin: 0; }
              .contact-info { text-align: center; font-weight: bold; margin-bottom: 20px; }
              .contract-title { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 15px; }
              .data-section { margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th, td { border: 1px solid #000; padding: 6px; }
              .clause { margin-bottom: 8px; text-align: justify; }
              .footer-signature { margin-top: 40px; display: flex; justify-content: space-around; }
              .signature-box { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>LOCAÇÃO DE ARTIGOS PARA FESTAS</h1>
            </div>
            <div class="contact-info">
              Fone: 48 98412.3233<br>
              Rua Bernardino Prudêncio de Amorim, 667, Jardim Janaína, Biguaçu, SC
            </div>
            <div class="contract-title">CONTRATO</div>
            
            <div class="data-section">
              <strong>LOCATÁRIO:</strong> ${pedido.nomeCliente.toUpperCase()}. <strong>CEL:</strong> ${pedido.cadastro?.telefone || ''}<br>
              <strong>ENDEREÇO:</strong> ${pedido.cadastro?.endereco || ''}, ${pedido.cadastro?.bairro || ''}, BIGUAÇU
            </div>

            <p style="text-align: justify;">
              Este instrumento particular, abaixo assinado, LOCADORA CLAUDIA FESTAS, CNPJ 29.639.830.0001.45 e como locatário, tem ajustado o presente contrato de locação dos equipamentos e utensílios (denominados diante descritos, sobre as cláusulas e condições seguintes). Os bens a que se refere o presente contrato, todos de propriedade da LOCADORA, são:
            </p>

            <strong>DESCRIÇÃO DO BEM</strong>
            <table>
              <thead>
                <tr style="background: #f2f2f2;">
                  <th width="10%">QTD</th>
                  <th width="50%">DESCRIÇÃO</th>
                  <th width="20%">VALOR. U.</th>
                  <th width="20%">VALOR TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${linhas}
                <tr>
                  <td style="text-align: center;">1</td>
                  <td>TAXA DE ENTREGA</td>
                  <td style="text-align: center;">R$ 20,00</td>
                  <td style="text-align: center;">R$ 20,00</td>
                </tr>
                <tr>
                  <td colspan="3" style="text-align: right; font-weight: bold;">TOTAL:</td>
                  <td style="text-align: center; font-weight: bold; border-bottom: 3px double #000;">R$ ${(totalPedido + taxaEntrega).toFixed(2).replace('.', ',')}</td>
                </tr>
              </tbody>
            </table>

            <div class="clause"><strong>Cláusula 1ª.</strong> O presente contrato tem como utensílios para a festa, todas em bom estado de conservação e limpeza, de propriedade da LOCADORA, que serão locadas ao (à) LOCATÁRIO (a).</div>
            <div class="clause"><strong>Cláusula 2ª.</strong> É vedado ao (à) LOCATÁRIO (a) transferir, sublocar, ceder ou emprestar os bens ora locados a terceiros.</div>
            <div class="clause"><strong>Cláusula 3ª.</strong> A locação terá duração conforme data abaixo descrita quando os bens serão entregues pelo (a) LOCADOR (A) no endereço indicado pelo (a) LOCATÁRIO, e finalizando no dia combinada abaixo quando os bens serão retirados pelo (a) LOCADOR (a).</div>
            <div class="clause"><strong>Cláusula 4ª.</strong> A LOCADORA se isenta de qualquer erro de manuseio do usuário LOCATÁRIO, que venha acarretar acidentes durante a locação.</div>
            <div class="clause"><strong>Cláusula 5ª.</strong> <strong>Na quebra de utensílios será cobrado. (Mesa R$80,00 - cadeira R$ 45,00 - prato R$ 15,00 - talher unid. R$ 8,00 - taça R$ 10,00 - toalha Oxford 1,50mt. R$ 25,00 - toalha Oxford 2,80mt. 35,00 - toalha amas. 2,80mt R$ 25,00.</strong> (Outros produtos serão avaliados o valor)</div>
            <div class="clause"><strong>Cláusula 6ª.</strong> Uso da louça: toda louça deverá ser devolvida lavada, caso não retorne lavada será cobrado a 50% locação de cada item devolvido sujo.</div>

            <div style="text-align: center; margin-top: 20px; font-weight: bold;">
              ENTREGAR DIA ${dataEntrega}<br>
              RECOLHER DIA ${dataRecolhida}
            </div>

            <div class="footer-signature">
              <div class="signature-box">CLAUDIA FESTAS</div>
              <div class="signature-box">LOCATÁRIO</div>
            </div>

            <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
          </body>
        </html>
      `);
      janela.document.close();
    } catch (err) {
      console.error("Erro ao gerar contrato:", err);
      janela.close();
    }
  };

  const emitirRomaneio = (pedido: any) => {
    const janela = window.open('', '_blank');
    if (!janela) return;
    const linhas = pedido.itens.map((i: any) => `
      <tr>
        <td style="border: 1px solid #000; padding: 15px; text-align: center; font-size: 18px;">[ ]</td>
        <td style="border: 1px solid #000; padding: 15px; text-align: center; font-size: 18px;">${i.quantidade}</td>
        <td style="border: 1px solid #000; padding: 15px; text-align: left; font-size: 18px;">${i.item.toUpperCase()}</td>
      </tr>
    `).join('');

    janela.document.write(`
      <html>
        <head><title>Romaneio</title><style>body { font-family: sans-serif; padding: 20px; }.header { text-align: center; border-bottom: 2px solid #b24a2b; padding-bottom: 10px; margin-bottom: 20px; }table { width: 100%; border-collapse: collapse; margin-top: 20px; }th, td { border: 1px solid #000; padding: 12px; }</style></head>
        <body>
          <div class="header"><h1 style="color: #b24a2b; margin: 0;">CLAUDIA FESTAS</h1><p>ROMANEIO DE CARGA / CONFERÊNCIA</p></div>
          <p><strong>CLIENTE:</strong> ${pedido.nomeCliente.toUpperCase()}</p>
          <p><strong>DATA:</strong> ${new Date(pedido.data_evento).toLocaleDateString('pt-BR')}</p>
          <table><thead><tr style="background: #eee;"><th>OK</th><th>QTD</th><th>DESCRIÇÃO</th></tr></thead><tbody>${linhas}</tbody></table>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
        </body>
      </html>
    `);
    janela.document.close();
  };

  const imprimirPedido = async (pedido: any) => {
    const janela = window.open('', '_blank');
    if (!janela) return;
    try {
      const { data: detalhes } = await db.from('reservas').select('*, estoque(preco)').eq('cliente_id', pedido.cliente_id).eq('data_evento', pedido.data_evento);
      let total = 0;
      const linhas = detalhes?.map(i => {
        const sub = i.quantidade * (i.estoque?.preco || 0);
        total += sub;
        return `<tr><td style="border:1px solid #000;padding:8px;text-align:center;">${i.quantidade}</td><td style="border:1px solid #000;padding:8px;">${i.item.toUpperCase()}</td><td style="border:1px solid #000;padding:8px;text-align:center;">R$ ${sub.toFixed(2).replace('.',',')}</td></tr>`;
      }).join('') || '';
      janela.document.write(`<html><body style="font-family:sans-serif;padding:30px;"><div style="text-align:center;border-bottom:2px solid #b24a2b;"><h1>CLAUDIA FESTAS</h1></div><h2>NOTA DE PEDIDO</h2><p><strong>CLIENTE:</strong> ${pedido.nomeCliente}</p><table><thead><tr style="background:#eee;"><th>QTD</th><th>ITEM</th><th>SUBTOTAL</th></tr></thead><tbody>${linhas}</tbody></table><h3>TOTAL: R$ ${(total + 20).toFixed(2).replace('.',',')}</h3><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);};</script></body></html>`);
      janela.document.close();
    } catch (e) { janela.close(); }
  };

  if (loading) return <div className="text-center p-20 font-bold text-[#b24a2b] animate-pulse">CARREGANDO PEDIDOS...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 animate-in fade-in duration-500">
      <header className="mb-10 flex justify-between items-center border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-black italic text-gray-900">Gestão de <span className="text-[#b24a2b]">Pedidos</span></h1>
        {onBack && <button onClick={onBack} className="bg-gray-100 p-3 px-6 rounded-2xl font-bold text-sm transition-all hover:bg-gray-200">Voltar</button>}
      </header>

      <div className="space-y-6">
        {pedidosAgrupados.length === 0 ? (
          <div className="text-center py-20 text-gray-300 font-bold italic">Nenhum pedido pendente nas reservas.</div>
        ) : (
          pedidosAgrupados.map((pedido, index) => (
            <div key={index} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center group hover:shadow-md transition-all shadow-xl">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-orange-100 text-[#b24a2b] text-[10px] font-black px-3 py-1 rounded-full">
                    EVENTO: {new Date(pedido.data_evento).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h3 className="font-black text-xl text-gray-800 uppercase">{pedido.nomeCliente}</h3>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {pedido.itens.map((i: any, idx: number) => (
                    <span key={idx} className="bg-gray-50 text-gray-500 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-gray-100">
                      {i.quantidade}x {i.item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-6 md:mt-0 justify-center">
                {/* BOTÃO CONTRATO */}
                <button 
                  onClick={() => imprimirContrato(pedido)} 
                  className="bg-gray-800 text-white p-3 px-5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-file-contract"></i> CONTRATO
                </button>

                <button 
                  onClick={() => emitirRomaneio(pedido)} 
                  className="bg-[#b24a2b] text-white p-3 px-5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-truck-ramp-box"></i> GERAR ROMANEIO
                </button>

                <button 
                  onClick={() => imprimirPedido(pedido)} 
                  className="bg-[#b24a2b] text-white p-3 px-5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-print"></i> NOTA ÚNICA
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InventoryHistory;