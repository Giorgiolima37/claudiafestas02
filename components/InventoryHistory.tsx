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

  // FUNÇÃO DE IMPRESSÃO PROFISSIONAL A4
  const imprimirPedido = (item: any) => {
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) return;

    const conteudo = `
      <html>
        <head>
          <title>Pedido - Claudia Festas</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #b24a2b; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #b24a2b; margin: 0; font-size: 28px; }
            .info-section { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .box { border: 1px solid #eee; padding: 15px; rounded: 10px; }
            .box h3 { margin-top: 0; font-size: 12px; color: #999; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #fdf8f6; color: #b24a2b; text-align: left; padding: 12px; border-bottom: 2px solid #eee; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
            .assinatura { margin-top: 80px; border-top: 1px solid #333; width: 300px; margin-left: auto; margin-right: auto; padding-top: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CLAUDIA FESTAS</h1>
            <p>Gestão Inteligente de Eventos e Locações</p>
          </div>

          <div class="info-section">
            <div class="box">
              <h3>Dados do Cliente</h3>
              <p><strong>Nome:</strong> ${item.cadastro.cliente}</p>
              <p><strong>Contato:</strong> ${item.cadastro.telefone || 'N/A'}</p>
            </div>
            <div class="box">
              <h3>Detalhes da Locação</h3>
              <p><strong>Data do Evento:</strong> ${new Date(item.data_evento).toLocaleDateString('pt-BR')}</p>
              <p><strong>Data Devolução:</strong> ${new Date(item.data_devolucao).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Descrição do Item</th>
                <th>Quantidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${item.item}</td>
                <td>${item.quantidade} unidades</td>
                <td>${item.status === 'Pago' ? 'FINALIZADO' : 'PENDENTE'}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Obrigado por escolher a Claudia Festas! Verifique os itens no ato da entrega.</p>
            <div class="assinatura">Assinatura do Cliente</div>
          </div>

          <script>window.print(); setTimeout(() => window.close(), 500);</script>
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

            <div className="flex gap-10">
              <div className="text-center">
                <p className="text-[9px] font-black text-gray-300 uppercase">Data</p>
                <p className="text-xs font-bold text-gray-600">{new Date(item.data_evento).toLocaleDateString('pt-BR')}</p>
              </div>
              <button 
                onClick={() => imprimirPedido(item)}
                className="bg-[#b24a2b] text-white p-3 px-6 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-print"></i> Imprimir A4
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryHistory;