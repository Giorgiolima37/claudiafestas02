import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const Catalog: React.FC = () => {
  const [estoque, setEstoque] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<{ [key: string]: number }>({});
  const [mostrarModalConfirma, setMostrarModalConfirma] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');
  const [identificacaoCliente, setIdentificacaoCliente] = useState('');
  const [verificandoAcesso, setVerificandoAcesso] = useState(false);
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [erroNome, setErroNome] = useState('');

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('estoque')
        .select('item, disponivel, preco, codigo_interno')
        .order('item');
      if (error) throw error;
      setEstoque(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar catálogo:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (isLoggedIn) fetchCatalog(); 
  }, [isLoggedIn]);

  const aplicarMascaraDocumento = (valor: string) => {
    const v = valor.replace(/\D/g, ''); 
    if (v.length <= 11) {
      return v
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return v
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroNome('');
    const nomeLimpo = nomeCliente.trim();
    if (!nomeLimpo.includes(' ')) {
      setErroNome('Adicione o sobrenome');
      return;
    }
    setVerificandoAcesso(true);
    try {
      const { data: cadastros, error } = await db
        .from('cadastro')
        .select('cliente, identificação');
      if (error) throw error;
      const docLimpoUser = identificacaoCliente.replace(/\D/g, '');
      const nomeUser = nomeLimpo.toLowerCase();
      const clienteEncontrado = cadastros?.find(c => {
        const nomeBanco = c.cliente.trim().toLowerCase();
        const docBanco = (c.identificação || "").replace(/\D/g, '');
        return nomeBanco === nomeUser && docBanco === docLimpoUser;
      });
      if (clienteEncontrado) {
        setIsLoggedIn(true);
      } else {
        setMostrarModalErro(true);
      }
    } catch (err) {
      setMostrarModalErro(true);
    } finally {
      setVerificandoAcesso(false);
    }
  };

  const alterarQuantidade = (nomeItem: string, delta: number, max: number) => {
    setCarrinho(prev => {
      const novaQtde = (prev[nomeItem] || 0) + delta;
      if (novaQtde <= 0) {
        const novoCarrinho = { ...prev };
        delete novoCarrinho[nomeItem];
        return novoCarrinho;
      }
      return { ...prev, [nomeItem]: Math.min(novaQtde, max) };
    });
  };

  const itensFiltrados = estoque.filter(i => 
    i.item.toLowerCase().includes(busca.toLowerCase())
  );

  const resumoCarrinho = estoque.filter(item => carrinho[item.item]);
  const totalItens = Object.values(carrinho).reduce((a, b) => a + b, 0);

  // FUNÇÃO CORRIGIDA: SALVA NO BANCO PRIMEIRO
  const confirmarPedidoFinal = async () => {
    const itensTexto = resumoCarrinho
      .map(item => `${carrinho[item.item]}x ${item.item}`)
      .join(', ');
    
    try {
        // 1. REGISTRA NA TABELA DE PEDIDOS ONLINE
        const { error } = await db.from('pedidos_online').insert([{
            cliente_nome: nomeCliente,
            cliente_whatsapp: identificacaoCliente, 
            itens_texto: itensTexto
        }]);

        if (error) throw error;

        // 2. SÓ DEPOIS ABRE O WHATSAPP
        const mensagem = encodeURIComponent(`Olá Claudia! Eu sou ${nomeCliente}.\nGostaria de um orçamento para:\n\n${itensTexto.replace(/, /g, '\n')}`);
        window.open(`https://wa.me/5548984123233?text=${mensagem}`, '_blank');
        
        // 3. FECHA O MODAL E LIMPA O CARRINHO
        setMostrarModalConfirma(false);
        setCarrinho({});
        alert("Pedido enviado com sucesso para o painel e WhatsApp!");

    } catch (err: any) {
        console.error("Erro ao registrar pedido:", err.message);
        alert("Ocorreu um erro ao salvar seu pedido. Tente novamente.");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6 text-gray-900">
        <div className="w-full max-w-sm bg-white rounded-[40px] p-10 shadow-2xl text-center">
          <span className="text-[#b24a2b] font-black text-[10px] uppercase tracking-[0.3em] block mb-4">Acesso Exclusivo</span>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-10 leading-none">
            Claudia <span className="text-[#b24a2b]">Festas</span>
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="NOME E SOBRENOME" 
                className={`w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 transition-all text-center ${erroNome ? 'ring-red-400' : 'ring-[#b24a2b]/20'}`}
                value={nomeCliente}
                onChange={(e) => {
                    setNomeCliente(e.target.value.toLowerCase());
                    if(erroNome) setErroNome('');
                }}
                required
              />
              {erroNome && (
                <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-black uppercase px-3 py-2 rounded-lg whitespace-nowrap shadow-lg animate-in fade-in slide-in-from-left-2 duration-300">
                  {erroNome}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-red-500 rotate-45"></div>
                </span>
              )}
            </div>

            <input 
              type="text" 
              placeholder="CPF OU CNPJ" 
              maxLength={18}
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 ring-[#b24a2b]/20 transition-all text-center"
              value={identificacaoCliente}
              onChange={(e) => setIdentificacaoCliente(aplicarMascaraDocumento(e.target.value))}
              required
            />
            <button type="submit" disabled={verificandoAcesso} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-[#b24a2b] transition-all mt-4">
              {verificandoAcesso ? 'Verificando...' : 'Entrar no Catálogo'}
            </button>
          </form>
        </div>
        {mostrarModalErro && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarModalErro(false)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl text-center animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl"><i className="fa-solid fa-user-xmark"></i></div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Não Cadastrado</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8">Não encontramos seu cadastro. Entre em contato com a Claudia Festas para liberar seu acesso.</p>
              <button onClick={() => setMostrarModalErro(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Tentar Novamente</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-gray-800 pb-40">
      <header className="pt-20 pb-12 px-6 text-center">
        <span className="text-[#b24a2b] font-black text-sm md:text-base uppercase tracking-[0.4em] block mb-4">Locações Claudia Festas</span>
        <h1 className="text-6xl md:text-7xl font-black uppercase italic tracking-tighter mb-10 leading-none">Nosso <span className="text-[#b24a2b]">Estoque</span></h1>
        <div className="max-w-2xl mx-auto mb-10 relative">
          <input type="text" placeholder="O que você procura?" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full px-8 py-5 bg-white border border-gray-100 rounded-full text-sm font-medium outline-none shadow-sm focus:ring-1 ring-orange-200 transition-all text-center"/>
        </div>
        {resumoCarrinho.length > 0 && (
          <div className="max-w-2xl mx-auto bg-white rounded-[32px] p-6 shadow-xl border border-orange-50 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-gray-50 text-left">
                <h2 className="font-black uppercase text-xs tracking-widest text-[#b24a2b]">Seu Pedido ({totalItens})</h2>
                <i className="fa-solid fa-cart-shopping text-gray-200"></i>
            </div>
            <div className="flex flex-wrap gap-2 text-left">
                {resumoCarrinho.map(item => (
                    <div key={item.item} className="bg-gray-50 px-4 py-2 rounded-full flex items-center gap-3 border border-gray-100">
                        <span className="text-[10px] font-black text-[#b24a2b]">{carrinho[item.item]}x</span>
                        <span className="text-[10px] font-bold uppercase truncate max-w-[120px]">{item.item}</span>
                        <button onClick={() => alterarQuantidade(item.item, -999, 0)} className="text-gray-300 hover:text-red-500"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                    </div>
                ))}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {itensFiltrados.map((prod, idx) => {
          const qtde = carrinho[prod.item] || 0;
          const isEsgotado = prod.disponivel <= 0;
          return (
            <div key={idx} className="bg-white rounded-[32px] p-6 border border-gray-50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-center">
              <div>
                <div className="flex justify-between items-center mb-4 text-left">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">#{prod.codigo_interno}</span>
                    <div className={`w-2 h-2 rounded-full ${isEsgotado ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse'}`}></div>
                </div>
                <h3 className="font-black text-base uppercase leading-tight mb-2 truncate">{prod.item}</h3>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-4 ${isEsgotado ? 'text-red-500' : 'text-gray-400'}`}>{isEsgotado ? 'Esgotado' : `${prod.disponivel} em estoque`}</p>
                <div className="mb-6"><span className="text-2xl font-black text-gray-900">R$ {prod.preco?.toFixed(2)}</span></div>
              </div>
              {qtde === 0 ? (
                <button onClick={() => alterarQuantidade(prod.item, 1, prod.disponivel)} disabled={isEsgotado} className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${isEsgotado ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-[#b24a2b] shadow-lg shadow-gray-200'}`}>Adicionar</button>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-1.5 border border-orange-50">
                  <button onClick={() => alterarQuantidade(prod.item, -1, prod.disponivel)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-900 hover:text-red-500"><i className="fa-solid fa-minus text-xs"></i></button>
                  <span className="text-sm font-black text-gray-900">{qtde}</span>
                  <button onClick={() => alterarQuantidade(prod.item, 1, prod.disponivel)} disabled={qtde >= prod.disponivel} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-900 hover:text-green-500 disabled:opacity-20"><i className="fa-solid fa-plus text-xs"></i></button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalItens > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-40 flex justify-center animate-in slide-in-from-bottom-10 duration-500">
          <button onClick={() => setMostrarModalConfirma(true)} className="w-full max-w-md bg-[#25D366] text-white py-5 rounded-full font-black text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 hover:scale-105 transition-transform">Finalizar Pedido ({totalItens})</button>
        </div>
      )}

      {mostrarModalConfirma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarModalConfirma(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl"><i className="fa-solid fa-check-double"></i></div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Tudo pronto?</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8">Deseja finalizar o pedido e enviar para Claudia Festas?</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmarPedidoFinal} className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Sim, Finalizar!</button>
              <button onClick={() => setMostrarModalConfirma(false)} className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;