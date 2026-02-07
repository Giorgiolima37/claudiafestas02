import React from 'react';

interface ContractProps {
  pedido: any;
  cliente: any;
}

const ContractTemplate: React.FC<ContractProps> = ({ pedido, cliente }) => {
  // Cálculo do subtotal dos itens
  const subtotalItens = pedido.itens.reduce((acc: number, cur: any) => acc + (cur.valor_total || 0), 0);
  
  // Recupera frete e desconto (garantindo que sejam números)
  const valorFrete = Number(pedido.frete || 0);
  const valorDesconto = Number(pedido.desconto || 0);
  
  // Cálculo do Total Final: Itens + Frete - Desconto
  const totalFinal = subtotalItens + valorFrete - valorDesconto;
  
  // Aumentamos a reserva de linhas para garantir o preenchimento visual
  const totalLinhasDesejadas = 12; 
  const linhasVazias = Math.max(0, totalLinhasDesejadas - pedido.itens.length);

  return (
    /* Definimos uma largura fixa e altura mínima para simular o papel A4 */
    <div className="w-[794px] min-h-[1123px] mx-auto p-12 bg-white text-black font-serif text-[12px] leading-tight flex flex-col justify-between">
      
      <div>
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-blue-900">Locação de Artigos para Festas</h1>
            <p className="font-bold">Fone: 48 98412.3233</p>
            <p className="text-[10px]">Rua Bernardino Prudêncio de Amorim, 667, Jardim Janaína, Biguaçu, SC</p>
          </div>
          <div className="text-right">
             <h2 className="text-3xl font-black italic text-red-600">CLAUDIA FESTAS</h2>
          </div>
        </div>

        <h2 className="text-center text-2xl font-black mb-6 underline">CONTRATO</h2>

        {/* Dados do Locatário */}
        <div className="mb-6 space-y-1">
          <p className="uppercase"><strong>LOCATÁRIO:</strong> {cliente.cliente} | <strong>ID:</strong> {cliente.id || '---'}</p>
          <p className="uppercase">
            <strong>ENDEREÇO:</strong> {cliente.endereco || 'NÃO INFORMADO'} 
            {cliente.municipio ? ` - ${cliente.municipio.toUpperCase()}` : ''}
          </p>
          <p className="text-[10px] text-justify mt-2">
            Este instrumento particular, abaixo assinado, LOCADORA CLAUDIA FESTAS, CNPJ 29.639.830/0001.45 e como locatário, tem ajustado o presente contrato de locação de equipamentos e utensílios denominados diante descritos, sobre as cláusulas e condições seguintes.
          </p>
        </div>

        {/* Tabela de Bens */}
        <table className="w-full border-collapse border border-black mb-6">
          <thead>
            <tr className="bg-gray-100 uppercase font-black text-center border border-black">
              <th className="border border-black p-1 w-12">QTD</th>
              <th className="border border-black p-1">DESCRIÇÃO DO BEM</th>
              <th className="border border-black p-1 w-24">VALOR U.</th>
              <th className="border border-black p-1 w-24">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((i: any, index: number) => (
              <tr key={index} className="text-center h-8">
                <td className="border border-black p-1 font-bold">{i.quantidade}</td>
                <td className="border border-black p-1 text-left uppercase pl-4">{i.item}</td>
                <td className="border border-black p-1">R$ {(i.valor_total / i.quantidade).toFixed(2).replace('.',',')}</td>
                <td className="border border-black p-1 font-bold">R$ {i.valor_total.toFixed(2).replace('.',',')}</td>
              </tr>
            ))}
            
            {/* Linhas vazias */}
            {[...Array(linhasVazias)].map((_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                <td className="border border-black"></td>
                <td className="border-black border"></td>
                <td className="border-black border"></td>
                <td className="border-black border"></td>
              </tr>
            ))}

            {/* Linha de Frete (só aparece se houver valor) */}
            {valorFrete > 0 && (
              <tr className="h-8">
                <td colSpan={3} className="border border-black p-1 text-right uppercase font-bold">Taxa de Entrega/Frete:</td>
                <td className="border border-black p-1 text-center font-bold">R$ {valorFrete.toFixed(2).replace('.',',')}</td>
              </tr>
            )}

            {/* Linha de Desconto (só aparece se houver valor) */}
            {valorDesconto > 0 && (
              <tr className="h-8 text-green-700">
                <td colSpan={3} className="border border-black p-1 text-right uppercase font-bold">Desconto:</td>
                <td className="border border-black p-1 text-center font-bold">- R$ {valorDesconto.toFixed(2).replace('.',',')}</td>
              </tr>
            )}

            <tr className="font-black text-lg">
              <td colSpan={3} className="border border-black p-2 text-right uppercase">Total Geral R$</td>
              <td className="border border-black p-2 text-center bg-gray-50 underline decoration-double">
                {totalFinal.toFixed(2).replace('.',',')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Cláusulas */}
        <div className="space-y-2 text-[10px] text-justify leading-tight mb-6">
          <p><strong>Cláusula 1ª:</strong> O presente contrato tem como utensílios para a festa, todas em bom estado de conservação e limpeza, de propriedade da LOCADORA.</p>
          <p><strong>Cláusula 2ª:</strong> É vedado ao LOCATÁRIO transferir, sublocar, ceder ou emprestar os bens a terceiros.</p>
          <p><strong>Cláusula 3ª:</strong> A locação terá duração conforme data abaixo descrita quando os bens serão entregues e posteriormente recolhidos.</p>
          <p><strong>Cláusula 4ª:</strong> A LOCADORA se isenta de qualquer erro de manuseio que venha acarretar acidentes durante a locação.</p>
          <p><strong>Cláusula 5ª:</strong> Na quebra de utensílios será cobrado o valor de reposição conforme tabela vigente (Mesa R$ 80, Cadeira R$ 45, etc).</p>
        </div>
      </div>

      {/* Rodapé com Datas e Assinaturas */}
      <div className="grid grid-cols-2 gap-20 text-center font-bold">
        <div className="space-y-4">
          <div className="bg-gray-100 p-2 border border-black uppercase text-[11px] text-left">
            ENTREGAR: {new Date(pedido.itens[0].data_evento).toLocaleDateString('pt-BR')}
          </div>
          <div className="bg-gray-100 p-2 border border-black uppercase text-[11px] text-left">
            RECOLHER: {new Date(pedido.dataDevolucao).toLocaleDateString('pt-BR')}
          </div>
          <div className="pt-6 border-t border-black uppercase mt-10">Claudia Festas</div>
        </div>
        <div className="flex flex-col justify-end">
            <div className="pt-6 border-t border-black uppercase">Locatário</div>
        </div>
      </div>
    </div>
  );
};

export default ContractTemplate;