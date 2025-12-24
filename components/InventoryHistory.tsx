import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

interface InventoryHistoryProps {
  clientId?: number | null;
  onBack?: () => void;
}

const InventoryHistory: React.FC<InventoryHistoryProps> = ({ clientId, onBack }) => {
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeCliente, setNomeCliente] = useState('');

  useEffect(() => {
    const carregarHistorico = async () => {
      try {
        setLoading(true);
        let query = db.from('reservas').select('*, cadastro(*)').order('data_evento', { ascending: false });
        if (clientId) query = query.eq('cliente_id', clientId);

        const { data, error } = await query;
        if (error) throw error;
        setHistorico(data || []);
        if (clientId && data && data.length > 0) setNomeCliente(data[0].cadastro.cliente);
      } catch (err: any) {
        console.error("Erro:", err.message);
      } finally {
        setLoading(false);
      }
    };
    carregarHistorico();
  }, [clientId]);

  // FUNÇÃO DE IMPRESSÃO AGRUPADA (TODOS OS ACESSÓRIOS NO MESMO PEDIDO)
  const imprimirDocumentacaoCompleta = async (itemOriginal: any) => {
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) return;

    // Busca todos os itens do mesmo pedido (mesmo cliente e mesma data de evento)
    const { data: itensDoPedido } = await db
      .from('reservas')
      .select('*, estoque(preco)')
      .eq('cliente_id', itemOriginal.cliente_id)
      .eq('data_evento', itemOriginal.data_evento);

    const logoUrl = "/logo.jpg"; // Certifique-se de que a logo está na pasta public
    let valorTotalGeral = 0;

    // Gera as linhas da tabela com todos os materiais do pedido
    const linhasItens = itensDoPedido?.map(item => {
      const valorUnitario = item.estoque?.preco || 0;
      const subtotal = item.quantidade * valorUnitario;
      valorTotalGeral += subtotal;
      
      return `
        <tr>
          <td>${item.quantidade}</td>
          <td class="left">${item.item.toUpperCase()}</td>
          <td>R$ ${valorUnitario.toFixed(2).replace('.', ',')}</td>
          <td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
        </tr>
      `;
    }).join('') || '';

    const conteudo = `
      <html>
        <head>
          <title>Nota de Pedido - Claudia Festas</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; color: #000; }
            .pagina { width: 210mm; padding: 15mm; box-sizing: border-box; page-break-after: always; }
            .header { display: flex; align-items: center; justify-content: center; gap: 20px; border-bottom: 3px solid #b24a2b; padding-bottom: 10px; }
            .logo-img { width: 80px; height: 80px; object-fit: contain; }
            .header h1 { color: #b24a2b; margin: 0; font-size: 22px; text-transform: uppercase; }
            .header p { margin: 2px 0; font-weight: bold; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-size: 11px; }
            .left { text-align: left; }
            .total-row { background: #eee; font-size: 13px; }
            .info-cliente { margin-bottom: 20px; font-size: 14px; text-transform: uppercase; }
            .clausulas { font-size: 10px; margin-top: 20px; text-align: justify; border-top: 1px solid #eee; padding-top: 10px; }
            .assinaturas { display: flex; justify-content: space-around; margin-top: 50px; }
            .campo { border-top: 2px solid #000; width: 220px; text-align: center; padding-top: 5px; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="pagina">
            <div class="header">
              <img src="${logoUrl}" class="logo-img" onerror="this.style.display='none'">
              <div>
                <h1>LOCAÇÃO DE ARTIGOS PARA FESTAS</h1>
                <p>Fone: 48 98412.3233 | Biguaçu, SC</p>
                <p>Rua Bernardino Prudêncio de Amorim, 667, Jardim Janaína</p>
              </div>
            </div>

            <h2 style="text-align:center; text-decoration: underline;">DETALHAMENTO DO PEDIDO</h2>
            
            <div class="info-cliente">
              <strong>LOCATÁRIO:</strong> ${itemOriginal.cadastro.cliente} <br>
              <strong>DATA DO EVENTO:</strong> ${new Date(itemOriginal.data_evento).toLocaleDateString('pt-BR')} <br>
              <strong>PREVISÃO DE RETORNO:</strong> ${new Date(itemOriginal.data_devolucao).toLocaleDateString('pt-BR')}
            </div>

            <table>
              <thead>
                <tr>
                  <th width="10%">QTD</th>
                  <th class="left">DESCRIÇÃO DO BEM</th>
                  <th width="20%">VALOR U.</th>
                  <th width="20%">VALOR TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${linhasItens}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding-right: 15px;">TOTAL DO PEDIDO</td>
                  <td>R$ ${valorTotalGeral.toFixed(2).replace('.', ',')}</td>
                </tr>
              </tbody>
            </table>

            <div class="clausulas">
              <p><strong>Cláusula 5ª. Reposição por quebra:</strong> Mesa R$80,00 | Cadeira R$45,00 | Prato R$15,00 | Talher R$8,00 | Taça R$10,00 | Toalha Oxford R$25,00 a R$35,00.</p>
              <p><strong>Cláusula 6ª.</strong> Louça deve retornar LAVADA, ou será cobrada taxa de 50% sobre o valor da locação do item sujo.</p>
            </div>

            <div class="assinaturas">
              <div class="campo">CLAUDIA FESTAS</div>
              <div class="campo">ASSINATURA DO CLIENTE</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `;

    janelaImpressao.document.write(conteudo);
    janelaImpressao.document.close();
  };

  if (loading) return <div className="text-center p-20 font-bold text-[#b24a2b] animate-pulse">CARREGANDO...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 italic">Histórico de <span className="text-[#b24a2b]">Pedidos</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase">{nomeCliente || 'Todos os Clientes'}</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="bg-gray-100 hover:bg-gray-200 p-3 px-6 rounded-2xl font-bold text-sm transition-all flex items-center gap-2">
            <i className="fa-solid fa-arrow-left"></i> Voltar
          </button>
        )}
      </header>

      <div className="space-y-4">
        {/* Agrupamos visualmente apenas para o botão de impressão fazer sentido */}
        {historico.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center group hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 text-[#b24a2b] rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-file-invoice"></i>
              </div>
              <div>
                <h3 className="font-black text-gray-800 uppercase text-sm">{item.item}</h3>
                <p className="text-[10px] text-gray-400 font-bold">{item.quantidade} UNIDADES</p>
              </div>
            </div>

            <div className="flex gap-10 items-center">
              <div className="text-center">
                <p className="text-[9px] font-black text-gray-300 uppercase">Evento</p>
                <p className="text-xs font-bold text-gray-600">{new Date(item.data_evento).toLocaleDateString('pt-BR')}</p>
              </div>
              <button 
                onClick={() => imprimirDocumentacaoCompleta(item)}
                className="bg-[#b24a2b] text-white p-3 px-6 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-print"></i> Imprimir Pedido Completo
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryHistory;