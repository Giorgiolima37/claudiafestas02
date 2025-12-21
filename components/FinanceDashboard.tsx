import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';

const FinanceDashboard: React.FC = () => {
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'dia' | 'mes' | 'total'>('mes');

  // Estados para o novo campo de gastos
  const [descGasto, setDescGasto] = useState('');
  const [valorGasto, setValorGasto] = useState('');

  const fetchFinanceiro = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('movimentacao_caixa')
        .select('*, cadastro(cliente)')
        .order('data', { ascending: false });

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar financeiro:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFinanceiro(); }, []);

  const salvarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descGasto || !valorGasto) return;

    try {
      const { error } = await db.from('movimentacao_caixa').insert([
        {
          descricao: descGasto,
          valor: parseFloat(valorGasto),
          tipo: 'Despesa',
          categoria: 'Outros',
          data: new Date().toISOString()
        }
      ]);

      if (error) throw error;
      
      setDescGasto('');
      setValorGasto('');
      fetchFinanceiro();
      alert("Gasto registrado com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar gasto: " + err.message);
    }
  };

  const calcularResumo = () => {
    const agora = new Date();
    const filtrados = movimentacoes.filter(m => {
      const dataM = new Date(m.data);
      if (filtro === 'dia') return dataM.toDateString() === agora.toDateString();
      if (filtro === 'mes') return dataM.getMonth() === agora.getMonth() && dataM.getFullYear() === agora.getFullYear();
      return true;
    });

    const entradas = filtrados.filter(m => m.tipo === 'Receita').reduce((acc, m) => acc + m.valor, 0);
    const saidas = filtrados.filter(m => m.tipo === 'Despesa').reduce((acc, m) => acc + m.valor, 0);

    return { entradas, saidas, saldo: entradas - saidas };
  };

  const { entradas, saidas, saldo } = calcularResumo();

  if (loading) return <div className="p-20 text-center font-light text-gray-400 tracking-widest uppercase animate-pulse">Carregando Finanças...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-4xl font-light text-gray-800 tracking-tight italic">Fluxo de <span className="text-[#b24a2b] font-serif">Caixa</span></h1>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mt-2">Claudia Festas • Gestão</p>
        </div>

        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-[20px]">
          {(['dia', 'mes', 'total'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFiltro(p)}
              className={`px-6 py-2 rounded-[15px] text-[10px] font-bold uppercase tracking-widest transition-all ${filtro === p ? 'bg-white text-[#b24a2b] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {p === 'dia' ? 'Hoje' : p === 'mes' ? 'Mês' : 'Tudo'}
            </button>
          ))}
        </div>
      </header>

      {/* NOVO: Formulário de Cadastro de Gastos */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-10 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Descrição do Gasto (Ex: Combustível)</label>
          <input 
            type="text" 
            value={descGasto} 
            onChange={(e) => setDescGasto(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm outline-none focus:ring-1 ring-[#b24a2b]/20"
            placeholder="O que você pagou?"
          />
        </div>
        <div className="w-40">
          <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Valor (R$)</label>
          <input 
            type="number" 
            value={valorGasto} 
            onChange={(e) => setValorGasto(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm outline-none"
            placeholder="0,00"
          />
        </div>
        <button 
          onClick={salvarGasto}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
        >
          Lançar Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-8 rounded-[32px] border border-gray-50 shadow-sm">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-4">Entradas</span>
          <p className="text-3xl font-light text-gray-800">R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        
        <div className="bg-white p-8 rounded-[32px] border border-gray-50 shadow-sm">
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-4">Saídas</span>
          <p className="text-3xl font-light text-gray-800">R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className={`p-8 rounded-[32px] shadow-lg ${saldo >= 0 ? 'bg-[#b24a2b]' : 'bg-gray-800'}`}>
          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest block mb-4">Saldo Atual</span>
          <p className="text-3xl font-bold text-white">R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50">
              <th className="p-6">Data</th>
              <th className="p-6">Descrição</th>
              <th className="p-6">Tipo</th>
              <th className="p-6 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {movimentacoes.map(m => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 text-xs text-gray-400">
                  {new Date(m.data).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-6">
                  <p className="text-sm font-bold text-gray-700">{m.descricao}</p>
                  {m.cadastro?.cliente && <p className="text-[10px] text-[#b24a2b] font-medium uppercase mt-0.5">{m.cadastro.cliente}</p>}
                </td>
                <td className="p-6">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${m.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {m.tipo}
                  </span>
                </td>
                <td className={`p-6 text-right font-bold text-sm ${m.tipo === 'Receita' ? 'text-emerald-600' : 'text-red-500'}`}>
                  R$ {m.valor.toFixed(2).replace('.', ',')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceDashboard;