import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../services/supabase';
import logoImg from '../logo.png';

interface BudgetItem {
  id: string;
  cliente: string;
  reserva: string;
  retirada: string;
  observacoes: string;
  valor: number;
  adiantamento: number;
  saldoRestante: number;
  produtos: Array<{ item: string; quantidade: number; preco: number; codigo: string }>;
  criadoEm: string;
}

const STORAGE_KEY = 'claudia_orcamentos';

const BudgetDashboard: React.FC = () => {
  const [orcamentos, setOrcamentos] = useState<BudgetItem[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [novoOrcamento, setNovoOrcamento] = useState({
    cliente: '',
    reserva: '',
    retirada: '',
    adiantamento: '',
    observacoes: ''
  });
  const [produtosSelecionados, setProdutosSelecionados] = useState([{ item: '', quantidade: 1 }]);

  useEffect(() => {
    const salvos = window.localStorage.getItem(STORAGE_KEY);
    if (salvos) setOrcamentos(JSON.parse(salvos));

    const carregarDados = async () => {
      const [resClientes, resEstoque] = await Promise.all([
        db.from('cadastro').select('id, cliente, id-client').order('cliente', { ascending: true }),
        db.from('estoque').select('id, item, disponivel, preco, codigo_interno').order('item', { ascending: true })
      ]);

      setClientes(resClientes.data || []);
      setEstoque(resEstoque.data || []);
    };

    carregarDados();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
  }, [orcamentos]);

  const orcamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return orcamentos;
    return orcamentos.filter((orcamento) =>
      orcamento.cliente.toLowerCase().includes(termo) ||
      orcamento.observacoes.toLowerCase().includes(termo)
    );
  }, [busca, orcamentos]);

  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((cliente) =>
      String(cliente.cliente || '').toLowerCase().includes(termo) ||
      String(cliente['id-client'] || cliente.id || '').toLowerCase().includes(termo)
    );
  }, [buscaCliente, clientes]);

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLowerCase();
    if (!termo) return estoque;
    return estoque.filter((produto) =>
      String(produto.item || '').toLowerCase().includes(termo) ||
      String(produto.codigo_interno || '').toLowerCase().includes(termo) ||
      String(produto.id || '').toLowerCase().includes(termo)
    );
  }, [buscaProduto, estoque]);

  const calcularTotalProdutos = () => {
    return produtosSelecionados.reduce((acc, produtoSelecionado) => {
      const produto = estoque.find((item) => item.item === produtoSelecionado.item);
      return acc + (Number(produtoSelecionado.quantidade || 0) * Number(produto?.preco || 0));
    }, 0);
  };

  const calcularAdiantamento = () => Number.parseFloat(novoOrcamento.adiantamento) || 0;
  const calcularSaldoRestante = () => Math.max(0, calcularTotalProdutos() - calcularAdiantamento());

  const atualizarProduto = (index: number, campo: 'item' | 'quantidade', valor: string | number) => {
    const lista = [...produtosSelecionados];
    lista[index] = { ...lista[index], [campo]: valor };
    setProdutosSelecionados(lista);
  };

  const adicionarProduto = () => {
    setProdutosSelecionados((prev) => [...prev, { item: '', quantidade: 1 }]);
  };

  const removerProduto = (index: number) => {
    setProdutosSelecionados((prev) => prev.filter((_, idx) => idx !== index));
  };

  const salvarOrcamento = (e: React.FormEvent) => {
    e.preventDefault();

    const item: BudgetItem = {
      id: crypto.randomUUID(),
      cliente: novoOrcamento.cliente,
      reserva: novoOrcamento.reserva,
      retirada: novoOrcamento.retirada,
      observacoes: novoOrcamento.observacoes,
      valor: calcularTotalProdutos(),
      adiantamento: calcularAdiantamento(),
      saldoRestante: calcularSaldoRestante(),
      produtos: produtosSelecionados
        .filter((produto) => produto.item)
        .map((produtoSelecionado) => {
          const produto = estoque.find((item) => item.item === produtoSelecionado.item);
          return {
            item: produtoSelecionado.item,
            quantidade: Number(produtoSelecionado.quantidade || 0),
            preco: Number(produto?.preco || 0),
            codigo: produto?.codigo_interno || 'S/C'
          };
        }),
      criadoEm: new Date().toISOString()
    };

    setOrcamentos((prev) => [item, ...prev]);
    setNovoOrcamento({ cliente: '', reserva: '', retirada: '', adiantamento: '', observacoes: '' });
    setProdutosSelecionados([{ item: '', quantidade: 1 }]);
    setBuscaCliente('');
    setBuscaProduto('');
    setModalAberto(false);
  };

  const removerOrcamento = (id: string) => {
    if (!window.confirm('Deseja remover este orçamento?')) return;
    setOrcamentos((prev) => prev.filter((orcamento) => orcamento.id !== id));
  };

  const formatarDataBR = (data: string) => {
    if (!data) return '--/--/----';
    return data.split('-').reverse().join('/');
  };

  const gerarDocumentoOrcamento = (orcamento: BudgetItem) => {
    const cliente = clientes.find((item) => item.cliente === orcamento.cliente) || {};
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>ORÇAMENTO - ${orcamento.cliente}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 5mm 0; width: 210mm; min-height: 297mm; display: flex; justify-content: center; box-sizing: border-box; }
            .page-container { width: 200mm; min-height: 285mm; padding: 10px; border: 2px solid black; box-sizing: border-box; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
            .company-name { font-weight: 900; font-size: 16px; color: #1e40af; text-decoration: underline; }
            .logo-box { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
            .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 50%; }
            .title { text-align: center; font-weight: 900; font-size: 20px; letter-spacing: 4px; margin: 18px 0; }
            .intro { font-size: 11px; line-height: 1.35; text-align: justify; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
            th, td { border: 1px solid #000; padding: 5px; text-align: center; }
            th { background: #eee; font-weight: 900; }
            .align-left { text-align: left; }
            .totals td { font-weight: 900; }
            .blue { color: #1d4ed8; }
            .obs { border: 1px solid #000; min-height: 60px; padding: 8px; font-size: 11px; margin-top: 12px; }
            .dates { margin-top: 18px; font-size: 12px; font-weight: 900; }
            .signatures { display: flex; justify-content: space-between; margin-top: 48px; }
            .sig { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 6px; font-size: 10px; font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header">
              <div>
                <div class="company-name">LOCAÇÃO DE ARTIGOS PARA FESTAS</div>
                <div style="font-weight:900;font-size:12px;">Fone: 48 98412.3233</div>
                <div style="font-size:10px;">Rua Bernardino Prudêncio de Amorim, 667, Jardim Janaina, Biguaçu, SC</div>
                <div style="font-weight:900;margin-top:6px;font-size:16px;">CLAUDIA FESTAS</div>
                <div style="font-size:9px;margin-top:2px;">${new Date().toLocaleString('pt-BR')}</div>
              </div>
              <div class="logo-box"><img src="${logoImg}" alt="Logo"></div>
            </div>
            <div class="title">ORÇAMENTO</div>
            <div class="intro">
              Orçamento emitido para <strong>${orcamento.cliente.toUpperCase()}</strong>
              ${cliente?.['id-client'] ? ` - ID: <strong>${cliente['id-client']}</strong>` : ''},
              referente aos artigos para festas listados abaixo.
              ${cliente?.telefone ? `<br><strong>Telefone do cliente:</strong> ${cliente.telefone}` : ''}
            </div>
            <table>
              <thead><tr><th style="width:45px;">QTD</th><th>DESCRIÇÃO</th><th style="width:85px;">VALOR U.</th><th style="width:85px;">TOTAL</th></tr></thead>
              <tbody>
                ${orcamento.produtos.map((produto) => `
                  <tr>
                    <td>${produto.quantidade}</td>
                    <td class="align-left">${produto.item.toUpperCase()} ${produto.codigo ? `[${produto.codigo}]` : ''}</td>
                    <td>${formatarMoeda(produto.preco)}</td>
                    <td>${formatarMoeda(produto.quantidade * produto.preco)}</td>
                  </tr>
                `).join('')}
                ${orcamento.adiantamento > 0 ? `
                  <tr class="totals blue"><td colspan="3" style="text-align:right;">ADIANTAMENTO</td><td>- ${formatarMoeda(orcamento.adiantamento)}</td></tr>
                  <tr class="totals blue"><td colspan="3" style="text-align:right;">SALDO RESTANTE</td><td>${formatarMoeda(orcamento.saldoRestante)}</td></tr>
                ` : ''}
                <tr class="totals"><td colspan="3" style="text-align:right;">VALOR TOTAL</td><td style="background:#eee;">${formatarMoeda(orcamento.valor)}</td></tr>
              </tbody>
            </table>
            <div class="obs"><strong>OBS:</strong> ${orcamento.observacoes || ''}</div>
            <div class="dates">RESERVA: ${formatarDataBR(orcamento.reserva)}<br>RETIRADA: ${formatarDataBR(orcamento.retirada)}</div>
            <div class="signatures"><div class="sig">CLIENTE</div><div class="sig">CLAUDIA FESTAS</div></div>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-[#b24a2b] italic uppercase tracking-tighter">Orçamentos</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.35em] mt-2">Propostas e valores em aberto</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-8">
        <input
          type="text"
          placeholder="PROCURAR ORÇAMENTO..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:max-w-md px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-full text-xs text-center font-bold outline-none focus:border-[#b24a2b] transition-all"
        />
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="w-full md:w-auto px-6 py-4 bg-[#b24a2b] text-white rounded-full font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#943a20] active:scale-95 transition-all"
        >
          <i className="fa-solid fa-plus mr-2"></i>
          Novo Orçamento
        </button>
      </div>

      {orcamentosFiltrados.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-[32px] p-12 text-center">
          <i className="fa-solid fa-file-signature text-4xl text-gray-200 mb-4"></i>
          <p className="text-gray-300 text-xs font-black uppercase tracking-widest">Nenhum orçamento cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {orcamentosFiltrados.map((orcamento) => (
            <div key={orcamento.id} className="rounded-[28px] border border-orange-100 bg-orange-50/40 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-800 uppercase">{orcamento.cliente}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                    Reserva: {orcamento.reserva ? orcamento.reserva.split('-').reverse().join('/') : '--/--/----'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                    Retirada: {orcamento.retirada ? orcamento.retirada.split('-').reverse().join('/') : '--/--/----'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => gerarDocumentoOrcamento(orcamento)}
                  className="mr-2 w-9 h-9 rounded-full bg-blue-500 text-white shadow-sm hover:scale-105 transition-transform"
                  title="Abrir orçamento"
                >
                  <i className="fa-solid fa-file-contract text-xs"></i>
                </button>
                <button
                  type="button"
                  onClick={() => removerOrcamento(orcamento.id)}
                  className="w-9 h-9 rounded-full bg-red-500 text-white shadow-sm hover:scale-105 transition-transform"
                  title="Remover orçamento"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
              <div className="mt-5 border-t border-orange-100 pt-4">
                <p className="text-2xl font-black text-[#b24a2b]">{formatarMoeda(orcamento.valor)}</p>
                {orcamento.adiantamento > 0 && (
                  <div className="mt-2 space-y-1 text-[11px] font-black uppercase">
                    <div className="flex justify-between text-blue-600">
                      <span>Adiantamento:</span>
                      <span>{formatarMoeda(orcamento.adiantamento)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Saldo Restante:</span>
                      <span>{formatarMoeda(orcamento.saldoRestante)}</span>
                    </div>
                  </div>
                )}
                {orcamento.observacoes && (
                  <p className="mt-3 text-xs font-bold text-gray-500 italic whitespace-pre-wrap">"{orcamento.observacoes}"</p>
                )}
                {orcamento.produtos?.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-orange-100 pt-4">
                    {orcamento.produtos.map((produto, index) => (
                      <div key={`${orcamento.id}-${index}`} className="flex justify-between gap-3 text-[11px] font-bold text-gray-500">
                        <span className="uppercase">{produto.quantidade}x {produto.item} <span className="text-blue-600">[{produto.codigo}]</span></span>
                        <span>{formatarMoeda(produto.quantidade * produto.preco)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={salvarOrcamento} className="bg-white rounded-[36px] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-orange-100 animate-in zoom-in duration-200">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-gray-800 uppercase italic">Novo Orçamento</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Preencha os dados principais</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Pesquisar cliente por nome ou ID..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="w-full p-3 bg-white border-2 border-gray-100 rounded-2xl outline-none font-bold text-xs text-gray-600 focus:border-[#b24a2b]"
              />
              <select
                required
                value={novoOrcamento.cliente}
                onChange={(e) => setNovoOrcamento({ ...novoOrcamento, cliente: e.target.value })}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold text-sm text-gray-700 focus:border-[#b24a2b]"
              >
                <option value="">Selecione o cliente...</option>
                {clientesFiltrados.map((cliente) => (
                  <option key={cliente.id} value={cliente.cliente}>
                    ID: {cliente['id-client'] || cliente.id} - {cliente.cliente}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Pesquisar produto por ID, código ou nome..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                className="w-full p-3 bg-white border-2 border-gray-100 rounded-2xl outline-none font-bold text-xs text-gray-600 focus:border-[#b24a2b]"
              />

              <div className="space-y-3">
                {produtosSelecionados.map((linha, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 rounded-2xl bg-gray-50 p-3 border border-gray-100">
                    <select
                      required
                      value={linha.item}
                      onChange={(e) => atualizarProduto(index, 'item', e.target.value)}
                      className="flex-1 p-3 bg-white border-2 border-gray-100 rounded-xl outline-none font-bold text-xs text-gray-700 focus:border-[#b24a2b]"
                    >
                      <option value="">Selecione o produto...</option>
                      {produtosFiltrados.map((produto) => (
                        <option key={produto.id} value={produto.item}>
                          [{produto.codigo_interno || produto.id}] {produto.item} - Disp: {produto.disponivel}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      required
                      min="1"
                      value={linha.quantidade}
                      onChange={(e) => atualizarProduto(index, 'quantidade', parseInt(e.target.value, 10) || 1)}
                      className="w-full md:w-24 p-3 bg-white border-2 border-gray-100 rounded-xl outline-none font-black text-xs text-center focus:border-[#b24a2b]"
                    />
                    {produtosSelecionados.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerProduto(index)}
                        className="w-full md:w-11 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                        title="Remover produto"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={adicionarProduto}
                  className="text-[#b24a2b] font-black text-[10px] uppercase tracking-widest hover:opacity-70"
                >
                  + Adicionar outro produto
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3 mb-2 block">Reserva</label>
                  <input
                    type="date"
                    required
                    value={novoOrcamento.reserva}
                    onChange={(e) => setNovoOrcamento({ ...novoOrcamento, reserva: e.target.value })}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold text-sm focus:border-[#b24a2b]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3 mb-2 block">Retirada</label>
                  <input
                    type="date"
                    required
                    value={novoOrcamento.retirada}
                    onChange={(e) => setNovoOrcamento({ ...novoOrcamento, retirada: e.target.value })}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold text-sm focus:border-[#b24a2b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="w-full p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl text-[#b24a2b]">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-orange-400">Valor total</span>
                  <strong className="text-xl font-black">{formatarMoeda(calcularTotalProdutos())}</strong>
                </div>
                <div>
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-3 mb-2 block">Adiantamento</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoOrcamento.adiantamento}
                    onChange={(e) => setNovoOrcamento({ ...novoOrcamento, adiantamento: e.target.value })}
                    className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl outline-none font-black text-xl text-blue-600 focus:border-blue-300"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3 mb-2 block">Saldo restante</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={calcularSaldoRestante()}
                    onChange={(e) => {
                      const novoSaldo = Number.parseFloat(e.target.value) || 0;
                      const novoAdiantamento = Math.max(0, calcularTotalProdutos() - novoSaldo);
                      setNovoOrcamento({ ...novoOrcamento, adiantamento: String(novoAdiantamento) });
                    }}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-black text-xl text-gray-700 focus:border-[#b24a2b]"
                  />
                </div>
              </div>

              <textarea
                placeholder="Observações do orçamento..."
                value={novoOrcamento.observacoes}
                onChange={(e) => setNovoOrcamento({ ...novoOrcamento, observacoes: e.target.value })}
                className="w-full min-h-[110px] p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-bold text-sm resize-none focus:border-[#b24a2b]"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="flex-1 p-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 p-4 bg-[#b24a2b] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#943a20]"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BudgetDashboard;
