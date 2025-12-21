import React, { useState } from 'react';
import { db } from '../services/supabase';

interface RegistrationProps {
  onSaved: () => void;
}

const CustomerRegistration: React.FC<RegistrationProps> = ({ onSaved }) => {
  // O "Rascunho": Guarda o que você digita em cada campo
  const [formData, setFormData] = useState({
    nome: '',
    tel: '',
    doc: '',
    end: '',
    bairro: ''
  });
  const [loading, setLoading] = useState(false);

  // A "Entrega": Envia os dados para a tabela 'cadastro'
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Ajustado para usar a tabela 'cadastro' conforme as imagens do seu banco
      const { error } = await db.from("cadastro").insert([{ 
        cliente: formData.nome,      // Nome da coluna no Supabase
        telefone: formData.tel,     // Nome da coluna no Supabase
        documento: formData.doc,    // Nome da coluna no Supabase
        endereco: formData.end,     // Nome da coluna no Supabase
        bairro: formData.bairro      // Nome da coluna no Supabase
      }]);

      if (error) throw error;

      alert("🎉 Cliente cadastrado com sucesso!");
      setFormData({ nome: '', tel: '', doc: '', end: '', bairro: '' });
      onSaved(); // Volta para a lista de clientes automaticamente
    } catch (err: any) {
      // Exibe erro caso o Supabase não encontre a tabela ou coluna
      alert("❌ Erro ao cadastrar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-center text-[#b24a2b] text-4xl font-bold mb-1 tracking-tight">Claudia Festas</h1>
      <div className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-[4px] mb-10">Registro de Cliente</div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput label="CLIENTE" id="nome" value={formData.nome} onChange={handleChange} required />
          <FormInput label="TELEFONE" id="tel" value={formData.tel} onChange={handleChange} required />
          <FormInput label="DOCUMENTO" id="doc" value={formData.doc} onChange={handleChange} required />
          <FormInput label="BAIRRO" id="bairro" value={formData.bairro} onChange={handleChange} required />
        </div>
        <FormInput label="ENDEREÇO" id="end" value={formData.end} onChange={handleChange} required />
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full p-5 bg-[#b24a2b] hover:bg-[#943a20] disabled:bg-gray-300 text-white font-bold rounded-2xl shadow-xl shadow-orange-900/10 transition-all duration-300 mt-6 active:scale-[0.98] uppercase tracking-widest text-sm"
        >
          {loading ? 'PROCESSANDO...' : 'CADASTRAR'}
        </button>
      </form>
    </div>
  );
};

// Componente do Campo de Texto
const FormInput: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }> = ({ label, id, value, onChange, required }) => (
  <div className="flex flex-col group">
    <label htmlFor={id} className="text-[10px] font-bold text-gray-400 ml-4 mb-2 uppercase tracking-widest group-focus-within:text-[#b24a2b] transition-colors">
      {label}
    </label>
    <input 
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full p-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:border-[#f2c6b4] focus:bg-white outline-none transition-all text-gray-700 shadow-sm focus:shadow-md"
    />
  </div>
);

export default CustomerRegistration;