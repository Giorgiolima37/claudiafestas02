
import React, { useEffect, useState } from 'react';
import { db } from '../services/supabase';
import { Cliente } from '../types';

const Blacklist: React.FC = () => {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLista = async () => {
    setLoading(true);
    const { data, error } = await db.from("lista_negra").select("*").order("id", { ascending: false });
    if (!error && data) setLista(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLista();
  }, []);

  const restaurarParaClientes = async (c: any) => {
    try {
      await db.from("clientes").insert([{ 
        cliente: c.cliente, 
        telefone: c.telefone, 
        local: c.local, 
        endereco: "", 
        bairro: "" 
      }]);
      await db.from("lista_negra").delete().eq("id", c.id);
      fetchLista();
      alert("Cliente restaurado!");
    } catch (err) {
      alert("Erro ao restaurar cliente");
    }
  };

  return (
    <div>
      <h1 className="text-center text-gray-900 text-3xl font-bold mb-1">Lista Negra</h1>
      <div className="text-center text-gray-400 text-sm uppercase tracking-[3px] mb-8">Restrição</div>
      
      {loading ? (
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
        </div>
      ) : lista.length === 0 ? (
        <p className="text-center text-gray-400 italic">Lista limpa. Bom trabalho!</p>
      ) : (
        <div className="space-y-3">
          {lista.map(c => (
            <div key={c.id} className="bg-white border-l-4 border-black border-y border-r border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div>
                <strong className="block text-gray-900 text-base">{c.cliente}</strong>
                <small className="text-gray-500 font-medium"><i className="fa-solid fa-phone mr-1"></i> {c.telefone}</small>
              </div>
              <button 
                onClick={() => restaurarParaClientes(c)}
                className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 text-[10px] font-extrabold rounded-lg uppercase tracking-tighter hover:bg-green-100 transition-colors"
              >
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blacklist;
