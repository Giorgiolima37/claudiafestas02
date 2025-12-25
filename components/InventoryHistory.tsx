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
      
      // Busca principal trazendo dados de cadastro
      let query = db.from('reservas').select('*, cadastro(*)').order('data_evento', { ascending: false });
      
      if (clientId) {
        query = query.eq('cliente_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupa os itens por Cliente e Data
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

  useEffect(() => {
    carregarDadosAgrupados();
  }, [clientId]);

  // FUNÇÃO DE IMPRESSÃO AJUSTADA
  const imprimirPedido = async (pedido: any) => {
    const janela = window.open('', '_blank');
    if (!janela) return;

    try {
      // Busca todos os acessórios vinculados a este pedido específico e seus preços
      const { data: detalhes, error } = await db
        .from('reservas')
        .select('*, estoque(preco)')
        .eq('cliente_id', pedido.cliente_id)
        .eq('data_evento', pedido.data_evento);

      if (error) throw error;

      let totalPedido = 0;
      const taxaEntrega = 20.00;

      // Gera as linhas da tabela com os dados reais
      const linhas = detalhes?.map(i => {
        const valorUnitario = i.estoque?.preco || 0;
        const subtotal = i.quantidade * valorUnitario;
        totalPedido += subtotal;
        
        return `
          <tr>
            <td style="border: 1px solid #000; padding: 10px; text-align: center;">${i.quantidade}</td>
            <td style="border: 1px solid #000; padding: 10px; text-align: left;">${i.item.toUpperCase()}</td>
            <td style="border: 1px solid #000; padding: 10px; text-align: center;">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
          </tr>
        `;
      }).join('') || '';

      janela.document.write(`
        <html>
          <head>
            <title>Nota de Pedido - Claudia Festas</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #000; }
              .header { border-bottom: 2px solid #b24a2b; text-align: center; padding-bottom: 10px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 10px; font-weight: bold; }
              .total-box { text-align: right; margin-top: 20px; font-size: 18px; border-top: 2px solid #000; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="color: #b24a2b; margin: 0;">CLAUDIA FESTAS</h1>
              <p>Fone: 48 98412.3233 | Biguaçu, SC</p>
            </div>
            
            <h2 style="text-align: center; text-transform: uppercase;">NOTA DE PEDIDO</h2>
            <p><strong>CLIENTE:</strong> ${pedido.nomeCliente.toUpperCase()}</p>
            <p><strong>DATA DO EVENTO:</strong> ${new Date(pedido.data_evento).toLocaleDateString('pt-BR')}</p>

            <table>
              <thead>
                <tr style="background: #eee;">
                  <th width="15%">QTD</th>
                  <th style="text-align: left;">ITEM</th>
                  <th width="25%">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${linhas}
              </tbody>
            </table>

            <div class="total-box">
              <p>Subtotal Itens: R$ ${totalPedido.toFixed(2).replace('.', ',')}</p>
              <p>Taxa de Entrega: R$ ${taxaEntrega.toFixed(2).replace('.', ',')}</p>
              <p style="font-size: 22px;"><strong>TOTAL GERAL: R$ ${(totalPedido + taxaEntrega).toFixed(2).replace('.', ',')}</strong></p>
            </div>

            <div style="margin-top: 50px; display: flex; justify-content: space-around;">
              <div style="border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px;">CLAUDIA FESTAS</div>
              <div style="border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px;">CLIENTE</div>
            </div>

            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `);
      janela.document.close();
    } catch (err) {
      console.error("Erro na impressão:", err);
      janela.close();
    }
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

              <div className="flex gap-3 mt-6 md:mt-0">
                <button onClick={() => imprimirPedido(pedido)} className="bg-[#b24a2b] text-white p-4 px-8 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all flex items-center gap-2">
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