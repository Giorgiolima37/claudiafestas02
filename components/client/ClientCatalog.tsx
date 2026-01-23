import { useState, useEffect } from 'react';
import { Package, Search, PlusCircle, Minus, Plus, X, ShoppingBag, Trash2, ArrowRight, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'; 
import { supabase } from '../../services/supabase';

interface Produto {
  id: string;
  item: string;
  disponivel: number;
  preco: number;
  codigo_interno: string;
}

interface ItemCarrinho extends Produto {
  quantidadeSelecionada: number;
}

interface ClientCatalogProps {
  cliente: any;
  onLogout: () => void;
}

function ProductCard({ prod, onAdd }: { prod: Produto, onAdd: (p: Produto, q: number) => void }) {
  const [quantidade, setQuantidade] = useState(prod.disponivel > 0 ? 1 : 0);

  const handleIncrement = () => {
    if (quantidade < prod.disponivel) {
      setQuantidade(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantidade > 1) {
      setQuantidade(prev => prev - 1);
    }
  };

  const handleAdd = () => {
    onAdd(prod, quantidade);
    setQuantidade(1);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[160px]">
      <div>
        {prod.codigo_interno && (
          <span className="inline-block bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md mb-2 border border-gray-200">
            CÓD: {prod.codigo_interno}
          </span>
        )}
        <h3 className="font-bold text-gray-800 text-sm md:text-base leading-tight mb-2">{prod.item}</h3>
      </div>
      
      <div className="mt-2">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="text-gray-500">Disponível:</span>
            <span className={`font-bold ${prod.disponivel > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {prod.disponivel}
            </span>
          </div>
          {prod.preco > 0 && (
            <p className="text-sm font-bold text-gray-800">
              R$ {prod.preco?.toFixed(2).replace('.', ',')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg h-9">
            <button onClick={handleDecrement} disabled={quantidade <= 1 || prod.disponivel <= 0} className="px-2 h-full text-gray-500 hover:text-[#C05621] disabled:opacity-30 transition-colors"><Minus size={14} /></button>
            <span className="px-2 text-sm font-bold text-gray-700 w-8 text-center">{quantidade}</span>
            <button onClick={handleIncrement} disabled={quantidade >= prod.disponivel || prod.disponivel <= 0} className="px-2 h-full text-gray-500 hover:text-[#C05621] disabled:opacity-30 transition-colors"><Plus size={14} /></button>
          </div>
          <button onClick={handleAdd} disabled={prod.disponivel <= 0} className={`flex-1 text-xs h-9 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${prod.disponivel > 0 ? 'bg-[#C05621] text-white hover:bg-[#a0451a] active:scale-95 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            <PlusCircle size={16} /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientCatalog({ cliente, onLogout }: ClientCatalogProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Estado de envio
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function buscarProdutos() {
      try {
        const { data, error } = await supabase.from('estoque').select('*').order('item', { ascending: true });
        if (error) throw error;
        setProdutos(data || []);
      } catch (error) { console.error('Erro ao buscar estoque:', error); } finally { setLoading(false); }
    }
    buscarProdutos();
  }, []);

  const adicionarAoCarrinho = (produto: Produto, qtd: number) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(p => p.id === produto.id);
      if (itemExistente) {
        const novaQtd = itemExistente.quantidadeSelecionada + qtd;
        if (novaQtd > produto.disponivel) { alert(`Limite de estoque atingido para ${produto.item}`); return prev; }
        return prev.map(p => p.id === produto.id ? { ...p, quantidadeSelecionada: novaQtd } : p);
      }
      return [...prev, { ...produto, quantidadeSelecionada: qtd }];
    });
  };

  const removerDoCarrinho = (id: string) => setCarrinho(prev => prev.filter(item => item.id !== id));
  const handlePreConfirmar = () => setShowConfirmation(true);
  const handleCancelarEnvio = () => setShowConfirmation(false);

  // --- FUNÇÃO DE ENVIAR AO BANCO ---
  const handleEnviarReal = async () => {
    setEnviando(true);
    try {
      // Data de hoje para registro
      const hoje = new Date().toISOString(); 
      // Data de devolução padrão (Amanhã - Admin pode alterar depois)
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);

      // Prepara os itens para inserir no banco
      const itensParaSalvar = carrinho.map(item => ({
        cliente_id: cliente.id,
        item: item.item,
        quantidade: item.quantidadeSelecionada,
        data_evento: hoje,          // Data do pedido
        data_devolucao: amanha.toISOString(), // Placeholder
        status: 'Solicitado',       // <--- O SEGREDO: Status específico para Web
        forma_pagamento: 'A definir',
        valor_total: item.preco * item.quantidadeSelecionada,
        codigo_item: item.codigo_item,
        observacoes: observacao     // Salva a obs em cada item para facilitar agrupamento
      }));

      const { error } = await supabase.from('reservas').insert(itensParaSalvar);

      if (error) throw error;

      alert(`Pedido Enviado com Sucesso! Aguarde nosso contato para confirmação.`);
      
      setCarrinho([]);
      setObservacao('');
      setShowConfirmation(false);
      setIsCartOpen(false);

    } catch (error: any) {
      console.error("Erro ao enviar:", error);
      alert("Erro ao enviar pedido: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const totalPedido = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidadeSelecionada), 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidadeSelecionada, 0);
  const produtosFiltrados = produtos.filter(prod => prod.item.toLowerCase().includes(searchTerm.toLowerCase()) || (prod.codigo_interno && prod.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      <div className="bg-[#C05621] p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-white mb-4">
          <div>
            <h1 className="font-bold text-lg leading-tight">Claudia Festas</h1>
            <p className="text-xs text-orange-100">Olá, {cliente.cliente?.split(' ')[0]}</p>
          </div>
          <button onClick={onLogout} className="text-xs bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors">Sair</button>
        </div>
        <div className="max-w-6xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input type="text" placeholder="Procure por nome ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border-none focus:ring-2 focus:ring-orange-300 text-gray-800" />
        </div>
      </div>

      <div className="flex-1 p-4 max-w-6xl mx-auto w-full pb-24 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Package className="text-[#C05621] h-5 w-5" /> Itens Disponíveis</h2>
          <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 bg-[#C05621] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#a0451a] transition-all active:scale-95">
            <ShoppingBag size={20} /><span className="text-sm font-bold">Meu Carrinho</span>{totalItens > 0 && <span className="bg-white text-[#C05621] text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center ml-1">{totalItens}</span>}
          </button>
        </div>
        
        {loading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05621]"></div></div> : 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {produtosFiltrados.map((prod) => <ProductCard key={prod.id} prod={prod} onAdd={adicionarAoCarrinho} />)}
            {produtosFiltrados.length === 0 && <p className="text-gray-500 text-center col-span-full py-8 text-sm">Nenhum item encontrado.</p>}
          </div>
        }
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-[#C05621] p-4 text-white flex justify-between items-center shadow-sm shrink-0">
              <div className="flex items-center gap-2"><ShoppingBag size={20} /><h2 className="font-bold text-lg">Seu Pedido</h2></div>
              <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {carrinho.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <ShoppingBag size={48} className="opacity-20" /><p>Seu carrinho está vazio.</p>
                  <button onClick={() => setIsCartOpen(false)} className="text-[#C05621] font-bold text-sm hover:underline">Adicionar itens</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrinho.map(item => (
                    <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-sm">{item.item}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-orange-100 text-[#C05621] px-2 py-0.5 rounded-md font-bold">{item.quantidadeSelecionada}x</span>
                          <span className="text-xs text-gray-500">Unit: R$ {item.preco.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <span className="font-bold text-sm text-gray-800">R$ {(item.preco * item.quantidadeSelecionada).toFixed(2).replace('.', ',')}</span>
                         <button onClick={() => removerDoCarrinho(item.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {carrinho.length > 0 && (
              <div className="p-4 bg-white border-t border-gray-100 shrink-0 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="obs" className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText size={16} className="text-[#C05621]" /> Observações (Horário, Entrega, etc):</label>
                  <textarea id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Entregar após as 14h. Receber com Maria..." disabled={showConfirmation} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C05621] focus:border-[#C05621] min-h-[80px] resize-none disabled:bg-gray-100" />
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-gray-100">
                  <span className="text-gray-500 text-sm">Total Estimado:</span>
                  <span className="text-2xl font-black text-[#C05621]">R$ {totalPedido.toFixed(2).replace('.', ',')}</span>
                </div>
                
                {!showConfirmation ? (
                  <button onClick={handlePreConfirmar} className="w-full bg-[#C05621] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-[#a0451a] active:scale-95 transition-all flex items-center justify-center gap-2">Confirmar Pedido <ArrowRight size={18} /></button>
                ) : (
                  <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <button onClick={handleCancelarEnvio} disabled={enviando} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"><XCircle size={18} /> Cancelar</button>
                    <button onClick={handleEnviarReal} disabled={enviando} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                      {enviando ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle size={18} /> Enviar Agora</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}