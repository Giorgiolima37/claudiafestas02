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

  const [dataDevolucao, setDataDevolucao] = useState('');
  const dataHoje = new Date().toISOString().split('T')[0];

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

  const confirmarPedidoFinal = async () => {
    if(!dataDevolucao) return alert("Por favor, selecione a data de devolução.");

    const itensTexto = resumoCarrinho
      .map(item => `${carrinho[item.item]}x ${item.item}`)
      .join(', ');
    
    try {
        const { error } = await db.from('pedidos_online').insert([{
            cliente_nome: nomeCliente,
            cliente_whatsapp: identificacaoCliente, 
            itens_texto: itensTexto,
            data_devolucao: dataDevolucao 
        }]);

        if (error) throw error;

        setMostrarModalConfirma(false);
        setCarrinho({});
        setDataDevolucao('');
        alert("Pedido enviado com sucesso!");
        
    } catch (err: any) {
        console.error("Erro ao registrar pedido:", err.message);
        alert("Erro ao enviar pedido. Tente novamente.");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-8 text-gray-900">
        <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center">
          <span className="text-[#b24a2b] font-black text-[10px] uppercase tracking-[0.2em] block mb-4">Acesso Exclusivo</span>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-8 leading-none">
            Claudia <span className="text-[#b24a2b]">Festas</span>
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="NOME E SOBRENOME" 
                className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold uppercase outline-none focus:ring-2 transition-all text-center ${erroNome ? 'ring-red-400' : 'ring-[#b24a2b]/20'}`}
                value={nomeCliente}
                onChange={(e) => {
                    setNomeCliente(e.target.value.toLowerCase());
                    if(erroNome) setErroNome('');
                }}
                required
              />
              {erroNome && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-black uppercase px-3 py-2 rounded-lg whitespace-nowrap shadow-lg animate-in fade-in zoom-in duration-300">
                  {erroNome}
                </span>
              )}
            </div>

            <input 
              type="text" 
              placeholder="CPF OU CNPJ" 
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold uppercase outline-none focus:ring-2 ring-[#b24a2b]/20 transition-all text-center"
              value={identificacaoCliente}
              onChange={(e) => setIdentificacaoCliente(aplicarMascaraDocumento(e.target.value))}
              required
            />
            <button type="submit" disabled={verificandoAcesso} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-[#b24a2b] transition-all mt-2 active:scale-95">
              {verificandoAcesso ? 'Verificando...' : 'Entrar no Catálogo'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-gray-800 pb-32">
      <header className="pt-12 pb-8 px-4 text-center">
        <span className="text-[#b24a2b] font-black text-xs uppercase tracking-[0.3em] block mb-2">Locações Claudia Festas</span>
        <h1 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter mb-8 leading-tight">Nosso <span className="text-[#b24a2b]">Estoque</span></h1>
        <div className="max-w-2xl mx-auto mb-8">
          <input type="text" placeholder="O que você procura?" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full px-6 py-4 bg-white border border-gray-100 rounded-full text-base font-medium outline-none shadow-sm focus:ring-2 ring-orange-100 transition-all text-center"/>
        </div>
        
        {resumoCarrinho.length > 0 && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-4 shadow-lg border border-orange-50 mb-8 overflow-hidden">
            <h2 className="font-black uppercase text-[10px] tracking-widest text-[#b24a2b] mb-4 text-left border-b pb-2">Seu Pedido ({totalItens})</h2>
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                {resumoCarrinho.map(item => (
                    <div key={item.item} className="bg-gray-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-gray-100 shrink-0">
                        <span className="text-[10px] font-black text-[#b24a2b]">{carrinho[item.item]}x</span>
                        <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{item.item}</span>
                        <button onClick={() => alterarQuantidade(item.item, -999, 0)} className="text-gray-300 hover:text-red-500"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                    </div>
                ))}
            </div>
          </div>
        )}
      </header>

      {/* GRID RESPONSIVO: 1 coluna no celular, 2 em tablets, 4 em desktops */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {itensFiltrados.map((prod, idx) => {
          const qtde = carrinho[prod.item] || 0;
          const isEsgotado = prod.disponivel <= 0;
          return (
            <div key={idx} className="bg-white rounded-[24px] p-5 border border-gray-50 shadow-sm flex flex-col justify-between text-center relative overflow-hidden">
              <div>
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">#{prod.codigo_interno}</span>
                    <div className={`w-2 h-2 rounded-full ${isEsgotado ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse'}`}></div>
                </div>
                <h3 className="font-black text-lg uppercase leading-tight mb-1 truncate">{prod.item}</h3>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-4 ${isEsgotado ? 'text-red-500' : 'text-gray-400'}`}>{isEsgotado ? 'Esgotado' : `${prod.disponivel} em estoque`}</p>
                <div className="mb-4"><span className="text-2xl font-black text-gray-900">R$ {prod.preco?.toFixed(2)}</span></div>
              </div>
              
              {qtde === 0 ? (
                <button onClick={() => alterarQuantidade(prod.item, 1, prod.disponivel)} disabled={isEsgotado} className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 ${isEsgotado ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white shadow-lg'}`}>Adicionar</button>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1 border border-orange-50">
                  <button onClick={() => alterarQuantidade(prod.item, -1, prod.disponivel)} className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-900 active:bg-red-50"><i className="fa-solid fa-minus text-xs"></i></button>
                  <span className="text-base font-black text-gray-900">{qtde}</span>
                  <button onClick={() => alterarQuantidade(prod.item, 1, prod.disponivel)} disabled={qtde >= prod.disponivel} className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-900 active:bg-green-50 disabled:opacity-20"><i className="fa-solid fa-plus text-xs"></i></button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalItens > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center">
          <button onClick={() => setMostrarModalConfirma(true)} className="w-full max-w-md bg-[#25D366] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-3">
            <i className="fa-solid fa-cart-check"></i>
            Finalizar Pedido ({totalItens})
          </button>
        </div>
      )}

      {mostrarModalConfirma && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMostrarModalConfirma(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl text-center animate-in slide-in-from-bottom duration-300">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl"><i className="fa-solid fa-calendar-day"></i></div>
            <h2 className="text-xl font-black uppercase italic mb-2 tracking-tight">Quando irá devolver?</h2>
            
            <div className="mb-6">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Selecione a data prevista</label>
              <input 
                type="date" 
                min={dataHoje}
                value={dataDevolucao}
                onChange={(e) => setDataDevolucao(e.target.value)}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 ring-green-100 transition-all text-center"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmarPedidoFinal} 
                disabled={!dataDevolucao}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${!dataDevolucao ? 'bg-gray-100 text-gray-300' : 'bg-[#25D366] text-white shadow-md active:scale-95'}`}
              >
                Sim, Finalizar!
              </button>
              <button onClick={() => {setMostrarModalConfirma(false); setDataDevolucao('');}} className="w-full py-4 text-gray-400 font-black text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;