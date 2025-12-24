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

  const imprimirDocumentacaoCompleta = (item: any) => {
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) return;

    // Link da imagem do logotipo hospedado
    const logoUrl = "https://raw.githubusercontent.com/seu-usuario/seu-repositorio/main/public/logo.jpg"; 

    const valorUnitario = 4.00; 
    const valorTotal = item.quantidade * valorUnitario;

    const conteudo = `
      <html>
        <head>
          <title>Documentação - Claudia Festas</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #000; margin: 0; padding: 0; }
            .pagina { 
              height: 297mm; 
              width: 210mm; 
              padding: 15mm; 
              box-sizing: border-box; 
              page-break-after: always; 
              position: relative;
            }
            
            /* Cabeçalho com Logotipo */
            .header { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              gap: 20px; 
              border-bottom: 3px solid #b24a2b; 
              padding-bottom: 15px; 
              margin-bottom: 20px;
            }
            .logo-img { width: 90px; height: 90px; object-fit: contain; }
            .header-text { text-align: left; }
            .header h1 { color: #b24a2b; margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; }
            .header p { margin: 2px 0; font-weight: bold; font-size: 14px; }
            
            .titulo-sessao { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; text-decoration: underline; text-transform: uppercase; }
            
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; font-size: 12px; }
            .left { text-align: left; }
            
            .info-box { border: 2px solid #000; padding: 12px; margin-bottom: 20px; border-radius: 5px; font-size: 13px; line-height: 1.5; }
            .clausulas { font-size: 10.5px; text-align: justify; line-height: 1.4; }
            .clausulas p { margin: 5px 0; }
            
            .datas-destaque { text-align: center; margin: 25px 0; font-weight: bold; border: 2px dashed #000; padding: 12px; font-size: 14px; text-transform: uppercase; }
            
            .assinaturas { display: flex; justify-content: space-around; margin-top: 60px; }
            .campo { border-top: 2px solid #000; width: 230px; text-align: center; padding-top: 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; }

            @media print {
              body { padding: 0; }
              .pagina { height: auto; page-break-after: always; border: none; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          
          <div class="pagina">
            <div class="header">
              <img src="${logoUrl}" class="logo-img" onerror="this.style.display='none'">
              <div class="header-text">
                <h1>CLAUDIA FESTAS</h1>
                <p>Guia de Remessa e Conferência de Materiais</p>
              </div>
            </div>
            
            <div class="titulo-sessao">GUIA DE ITENS ALUGADOS</div>
            
            <div class="info-box">
              <strong>LOCATÁRIO:</strong> ${item.cadastro.cliente.toUpperCase()} <br>
              <strong>CONTATO:</strong> ${item.cadastro.telefone || 'N/A'} <br>
              <strong>ENDEREÇO:</strong> ${item.cadastro.endereco || 'Informado no contrato'}
            </div>

            <table>
              <thead>
                <tr>
                  <th width="10%">QTD</th>
                  <th class="left">DESCRIÇÃO DO MATERIAL</th>
                  <th width="20%">SAÍDA (OK)</th>
                  <th width="20%">RETORNO (OK)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${item.quantidade}</td>
                  <td class="left">${item.item.toUpperCase()}</td>
                  <td>[  ]</td>
                  <td>[  ]</td>
                </tr>
                ${Array(10).fill('<tr><td>&nbsp;</td><td></td><td>[  ]</td><td>[  ]</td></tr>').join('')}
              </tbody>
            </table>
            
            <p style="font-size: 11px; font-weight: bold; text-align: center; margin-top: 40px;">
              * O locatário declara ter recebido e conferido os itens acima em perfeito estado.
            </p>
          </div>

          <div class="pagina">
            <div class="header">
              <img src="${logoUrl}" class="logo-img" onerror="this.style.display='none'">
              <div class="header-text">
                <h1>LOCAÇÃO DE ARTIGOS PARA FESTAS</h1>
                <p>Fone: 48 98412.3233 | Biguaçu - SC</p>
              </div>
            </div>

            <div class="titulo-sessao">CONTRATO DE LOCAÇÃO</div>

            <div class="info-box">
               LOCADORA: CLAUDIA FESTAS (CNPJ 29.639.830.0001.45) <br>
               Rua Bernardino Prudêncio de Amorim, 667, Jardim Janaína
            </div>

            <div class="clausulas">
              <p><strong>Cláusula 1ª.</strong> Itens entregues em perfeito estado de conservação e limpeza, de propriedade da LOCADORA.</p>
              <p><strong>Cláusula 2ª.</strong> Vedada a sublocação, cessão ou empréstimo dos itens a terceiros.</p>
              <p><strong>Cláusula 5ª. NA QUEBRA DE UTENSÍLIOS SERÁ COBRADO:</strong> Mesa R$80,00 | Cadeira R$45,00 | Prato R$15,00 | Talher R$8,00 | Taça R$10,00 | Toalha Oxford R$25,00 a R$35,00.</p>
              <p><strong>Cláusula 6ª.</strong> Louça deve retornar LAVADA, ou será cobrada taxa de 50% sobre o valor da locação.</p>
            </div>

            <div class="datas-destaque">
              ENTREGAR DIA: ${new Date(item.data_evento).toLocaleDateString('pt-BR')} <br>
              RECOLHER DIA: ${new Date(item.data_devolucao).toLocaleDateString('pt-BR')}
            </div>

            <div class="assinaturas">
              <div class="campo">CLAUDIA FESTAS</div>
              <div class="campo">ASSINATURA DO CLIENTE</div>
            </div>
          </div>

          <script>
            window.onload = () => { 
              setTimeout(() => {
                window.print(); 
                window.close();
              }, 800);
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
                <p className="text-[9px] font-black text-gray-300 uppercase">Data</p>
                <p className="text-xs font-bold text-gray-600">{new Date(item.data_evento).toLocaleDateString('pt-BR')}</p>
              </div>
              <button 
                onClick={() => imprimirDocumentacaoCompleta(item)}
                className="bg-[#b24a2b] text-white p-3 px-6 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-print"></i> Imprimir Documentação
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryHistory;