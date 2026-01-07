import React, { useState } from 'react';
import { db } from '../services/supabase';

interface RegistrationProps {
  onSaved: () => void;
}

const CustomerRegistration: React.FC<RegistrationProps> = ({ onSaved }) => {
  // Adicionei o idClient no estado inicial
  const [formData, setFormData] = useState({ nome: '', tel: '', doc: '', end: '', bairro: '', idClient: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- PROTEÇÃO CONTRA ID DUPLICADO ---
      if (formData.idClient && formData.idClient.trim() !== '') {
        const idParaVerificar = formData.idClient.trim();

        // Consulta o banco para ver se o ID existe
        const { data: duplicados, error: erroBusca } = await db
          .from('cadastro')
          .select('id')
          .eq('id-client', idParaVerificar);

        if (erroBusca) throw erroBusca;

        // Se encontrou algum registro, bloqueia e avisa
        if (duplicados && duplicados.length > 0) {
          alert(`⛔ BLOQUEADO: O ID "${idParaVerificar}" já pertence a outro cliente!\n\nPor favor, escolha um número diferente.`);
          setLoading(false);
          return; // Para tudo aqui, não deixa salvar
        }
      }
      // ------------------------------------

      const { error } = await db.from("cadastro").insert([{ 
        cliente: formData.nome,
        telefone: formData.tel,
        documento: formData.doc,
        endereco: formData.end,
        bairro: formData.bairro,
        'id-client': formData.idClient // Salva o ID verificado
      }]);

      if (error) throw error;
      
      alert("🎉 Cliente cadastrado com sucesso!");
      onSaved();
    } catch (err: any) {
      console.error(err);
      alert("❌ Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="w-full">
      <h1 className="text-center text-[#b24a2b] text-3xl md:text-4xl font-bold mb-1">Claudia Festas</h1>
      <div className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-[4px] mb-8">Registro de Cliente</div>
      
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormInput label="NOME DO CLIENTE" id="nome" value={formData.nome} onChange={handleChange} required />
          <FormInput label="TELEFONE" id="tel" value={formData.tel} onChange={handleChange} required />
          <FormInput 
            label="DOCUMENTO (CPF / CNPJ)" 
            id="doc" 
            value={formData.doc} 
            onChange={handleChange} 
            required
            maxLength={18} // Limite suficiente para CNPJ formatado (XX.XXX.XXX/0001-XX)
          />
          <FormInput label="BAIRRO" id="bairro" value={formData.bairro} onChange={handleChange} required />
        </div>
        
        {/* Campo de ID Adicionado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             <FormInput label="ENDEREÇO COMPLETO" id="end" value={formData.end} onChange={handleChange} required />
             <div className="relative">
                <FormInput label="ID PERSONALIZADO (ÚNICO)" id="idClient" value={formData.idClient} onChange={handleChange} />
                <span className="text-[8px] text-gray-400 font-bold absolute right-2 top-0">*Opcional</span>
             </div>
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full p-4 md:p-5 bg-[#b24a2b] hover:bg-[#943a20] disabled:bg-gray-300 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-sm mt-4"
        >
          {loading ? 'VERIFICANDO ID...' : 'CADASTRAR CLIENTE'}
        </button>
      </form>
    </div>
  );
};

const FormInput: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean; maxLength?: number }> = ({ label, id, value, onChange, required, maxLength }) => (
  <div className="flex flex-col group w-full">
    <label htmlFor={id} className="text-[10px] font-bold text-gray-400 ml-2 mb-1 uppercase tracking-widest group-focus-within:text-[#b24a2b]">
      {label}
    </label>
    <input 
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      maxLength={maxLength}
      className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#f2c6b4] focus:bg-white outline-none transition-all text-sm"
    />
  </div>
);

export default CustomerRegistration;