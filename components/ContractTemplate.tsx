import React from 'react';

interface ContractProps {
  pedido: any;
  cliente: any;
}

const ContractTemplate: React.FC<ContractProps> = ({ pedido, cliente }) => {
  const totalGeral = pedido.itens.reduce((acc: number, cur: any) => acc + (cur.valor_total || 0), 0);

  return (
    <div className="p-10 bg-white text-black font-serif text-[12px] leading-tight print:p-0">
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
        <p><strong>LOCATÁRIO:</strong> {cliente.cliente?.toUpperCase()} | <strong>CEL:</strong> {cliente.telefone}</p>
        <p><strong>ENDEREÇO:</strong> {cliente.endereco || 'NÃO INFORMADO'}</p>
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
            <th className="border border-black p-1 w-24">VALOR TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {pedido.itens.map((i: any, index: number) => (
            <tr key={index} className="text-center">
              <td className="border border-black p-1 font-bold">{i.quantidade}</td>
              <td className="border border-black p-1 text-left uppercase pl-4">{i.item}</td>
              <td className="border border-black p-1">R$ {(i.valor_total / i.quantidade).toFixed(2).replace('.',',')}</td>
              <td className="border border-black p-1">R$ {i.valor_total.toFixed(2).replace('.',',')}</td>
            </tr>
          ))}
          {/* Linhas vazias para completar o layout como na imagem */}
          {[...Array(Math.max(0, 6 - pedido.itens.length))].map((_, i) => (
            <tr key={`empty-${i}`} className="h-6">
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
            </tr>
          ))}
          <tr className="font-black text-lg">
            <td colSpan={3} className="border border-black p-2 text-right">TOTAL R$ —</td>
            <td className="border border-black p-2 text-center bg-gray-50 underline decoration-double">
              {totalGeral.toFixed(2).replace('.',',')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Cláusulas */}
      <div className="space-y-3 text-[10px] text-justify leading-relaxed mb-10">
        <p><strong>Cláusula 1ª:</strong> O presente contrato tem como utensílios para a festa, todas em bom estado de conservação e limpeza, de propriedade da LOCADORA, que serão locadas ao (à) LOCATÁRIO (a).</p>
        <p><strong>Cláusula 2ª:</strong> É vedado ao (à) LOCATÁRIO (a) transferir, sublocar, ceder ou emprestar os bens ora locados a terceiros.</p>
        <p><strong>Cláusula 3ª:</strong> A locação terá duração conforme data abaixo descrita quando os bens serão entregues pelo (a) LOCADOR (A) no endereço indicado pelo (a) LOCATÁRIO, e finalizando no dia combinada abaixo quando os bens serão retirados pelo (a) LOCADOR (A).</p>
        <p><strong>Cláusula 4ª:</strong> A LOCADORA se isenta de qualquer erro de manuseio do usuário LOCATÁRIO, que venha acarretar acidentes durante a locação.</p>
        <p><strong>Cláusula 5ª:</strong> Na quebra de utensílios será cobrado: (Mesa R$ 80,00 - cadeira R$ 45,00 - prato R$ 15,00 - talher unid. R$ 8,00 - taça R$ 10,00 - toalha Oxford 1,50mt. R$ 25,00 - toalha Oxford 2,80mt. 35,00 - toalha amas. 2,80mt R$ 25,00).</p>
        <p><strong>Cláusula 6ª:</strong> Uso da louça: toda louça deverá ser devolvida lavada, caso não retorne lavada será cobrado a 50% locação de cada item devolvido sujo.</p>
      </div>

      {/* Datas e Assinaturas */}
      <div className="grid grid-cols-2 gap-20 text-center font-bold mt-10">
        <div className="space-y-4">
          <p className="bg-gray-100 p-2 border border-black uppercase text-[11px]">
            ENTREGAR DIA: {new Date(pedido.itens[0].data_evento).toLocaleDateString('pt-BR')} SÁBADO
          </p>
          <p className="bg-gray-100 p-2 border border-black uppercase text-[11px]">
            RECOLHER DIA: {new Date(pedido.dataDevolucao).toLocaleDateString('pt-BR')} DOMINGO
          </p>
          <div className="pt-10 border-t border-black uppercase">Claudia Festas</div>
        </div>
        <div className="flex flex-col justify-end">
           <div className="pt-10 border-t border-black uppercase">Locatário</div>
        </div>
      </div>
    </div>
  );
};

export default ContractTemplate;