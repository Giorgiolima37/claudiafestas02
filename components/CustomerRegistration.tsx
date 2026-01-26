import React, { useState, useEffect } from 'react';
import { db } from '../services/supabase';

interface RegistrationProps {
  onSaved: () => void;
}

const CustomerRegistration: React.FC<RegistrationProps> = ({ onSaved }) => {
  const [formData, setFormData] = useState({ nome: '', nomeFantasia: '', tel: '', doc: '', end: '', bairro: '', municipio: '', idClient: '' });
  const [loading, setLoading] = useState(false);
  
  // Estados da Janela (Modal)
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState<React.ReactNode>('');
  const [modalType, setModalType] = useState<'error' | 'success'>('error');

  // --- BUSCAR O PRÓXIMO ID AUTOMATICAMENTE ---
  useEffect(() => {
    const fetchNextId = async () => {
      try {
        const { data, error } = await db
          .from('cadastro')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Erro ao buscar último ID:', error);
          return;
        }

        const nextId = (data && data.length > 0) ? data[0].id + 1 : 1;
        setFormData(prev => ({ ...prev, idClient: nextId.toString() }));
        
      } catch (err) {
        console.error('Erro na busca de ID:', err);
      }
    };

    fetchNextId();
  }, []);

  // --- MÁSCARAS ---
  const formatarDocumento = (valor: string) => {
    let v = valor.replace(/\D/g, ""); 
    if (v.length > 14) v = v.slice(0, 14); 

    if (v.length > 11) { // CNPJ
        v = v.replace(/^(\d{2})(\d)/, "$1.$2");
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
    } else { // CPF
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return v;
  };

  const formatarTelefone = (valor: string) => {
    let v = valor.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11); 

    v = v.replace(/^(\d{2})(\d)/g, "($1) $2"); 
    v = v.replace(/(\d)(\d{4})$/, "$1-$2"); 
    
    return v;
  };

  // Variável para checar se é CNPJ
  const isCNPJ = formData.doc.length > 14;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- PROTEÇÃO 1: VERIFICA DOCUMENTO ---
      if (formData.doc && formData.doc.trim() !== '') {
        const docParaVerificar = formData.doc.trim();

        const { data: dadosCliente, error: erroCpf } = await db
          .from('cadastro')
          .select('cliente, identificação') 
          .eq('identificação', docParaVerificar);

        if (erroCpf) throw erroCpf;

        if (dadosCliente && dadosCliente.length > 0) {
          const clienteEncontrado = dadosCliente[0];
          setModalType('error');
          setModalMessage(
            <span>
              O cliente <strong className="text-gray-900">{clienteEncontrado.cliente}</strong> <br/>
              (Doc: <strong>{clienteEncontrado['identificação']}</strong>) <br/>
              já está cadastrado no sistema.
            </span>
          );
          setShowModal(true);
          setLoading(false);
          return; 
        }
      }

      // --- PROTEÇÃO 2: ID PERSONALIZADO ---
      if (formData.idClient && formData.idClient.trim() !== '') {
        const idParaVerificar = formData.idClient.trim();
        const { data: duplicados, error: erroBusca } = await db
          .from('cadastro')
          .select('id')
          .or(`id-client.eq.${idParaVerificar},id.eq.${idParaVerificar}`);

        if (erroBusca && erroBusca.code !== 'PGRST100') throw erroBusca;

        if (duplicados && duplicados.length > 0) {
          setModalType('error');
          setModalMessage(`O ID "${idParaVerificar}" já está em uso! O sistema tentará sugerir outro.`);
          
          const { data } = await db.from('cadastro').select('id').order('id', { ascending: false }).limit(1);
          const novoSugestao = (data && data.length > 0) ? data[0].id + 1 : 1;
          setFormData(prev => ({ ...prev, idClient: novoSugestao.toString() }));
          
          setShowModal(true);
          setLoading(false);
          return; 
        }
      }

      // Prepara os dados para salvar
      const dadosParaSalvar = { 
        cliente: formData.nome,
        telefone: formData.tel,
        'identificação': formData.doc,
        endereco: formData.end,
        bairro: formData.bairro,
        municipio: formData.municipio, 
        'id-client': formData.idClient,
        'nome_fantasia': isCNPJ ? formData.nomeFantasia : null 
      };

      const { error } = await db.from("cadastro").insert([dadosParaSalvar]);

      if (error) throw error;
      
      setModalType('success');
      setModalMessage("Cliente cadastrado com sucesso!");
      setShowModal(true);
      onSaved();
      
    } catch (err: any) {
      console.error(err);
      setModalType('error');
      setModalMessage("Erro ao salvar: " + err.message);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    if (id === 'doc') {
        const valorFormatado = formatarDocumento(value);
        setFormData(prev => ({ ...prev, [id]: valorFormatado }));
    } 
    else if (id === 'tel') { 
        const valorFormatado = formatarTelefone(value);
        setFormData(prev => ({ ...prev, [id]: valorFormatado }));
    }
    else {
        setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  return (
    <div className="w-full relative">
      <h1 className="text-center text-[#b24a2b] text-3xl md:text-4xl font-bold mb-1">Claudia Festas</h1>
      {/* TEXTO ADICIONADO AQUI */}
      <p className="text-center text-gray-500 text-sm font-medium mb-1">Agilize o seu pedido</p>
      
      <div className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-[4px] mb-8">Registro de Cliente</div>
      
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        
        {/* LINHA 1: Nome e Telefone (Voltamos para 2 colunas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormInput 
             label={isCNPJ ? "RAZÃO SOCIAL" : "NOME DO CLIENTE"} 
             id="nome" 
             value={formData.nome} 
             onChange={handleChange} 
             required 
          />
          <FormInput 
            label="TELEFONE" 
            id="tel" 
            value={formData.tel} 
            onChange={handleChange} 
            required 
            maxLength={15} 
          />
        </div>

        {/* LINHA 2: Identificação e Endereço */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormInput 
            label="IDENTIFICAÇÃO (CPF OU CNPJ)" 
            id="doc" 
            value={formData.doc} 
            onChange={handleChange} 
            required 
            maxLength={18} 
          />
          <FormInput label="ENDEREÇO COMPLETO" id="end" value={formData.end} onChange={handleChange} required />
        </div>

        {/* LINHA 3 (CONDICIONAL): Nome Fantasia aparece AQUI, logo abaixo do CNPJ */}
        {isCNPJ && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <FormInput 
                    label="NOME FANTASIA" 
                    id="nomeFantasia" 
                    value={formData.nomeFantasia} 
                    onChange={handleChange} 
                />
             </div>
        )}
        
        {/* LINHA 4: Bairro e Município */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             <FormInput label="BAIRRO" id="bairro" value={formData.bairro} onChange={handleChange} required />
             <FormInput label="MUNICÍPIO" id="municipio" value={formData.municipio} onChange={handleChange} required />
        </div>

        {/* LINHA 5: ID Automático */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 md:gap-6">
             <div className="relative">
                <FormInput label="ID PERSONALIZADO (AUTOMÁTICO)" id="idClient" value={formData.idClient} onChange={handleChange} />
                <span className="text-[8px] text-gray-400 font-bold absolute right-2 top-0">*Sugerido</span>
             </div>
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full p-4 md:p-5 bg-[#b24a2b] hover:bg-[#943a20] disabled:bg-gray-300 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-sm mt-4"
        >
          {loading ? 'SALVANDO...' : 'CADASTRAR CLIENTE'}
        </button>
      </form>

      {/* --- JANELA / MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`p-4 text-center ${modalType === 'error' ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-full mb-2 ${modalType === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {modalType === 'error' ? (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                   </svg>
                )}
              </div>
              <h3 className={`text-lg font-bold ${modalType === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                {modalType === 'error' ? 'Atenção!' : 'Sucesso!'}
              </h3>
            </div>
            <div className="p-6 text-center">
              <div className="text-gray-600 text-sm font-medium leading-relaxed">
                {modalMessage}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-[#b24a2b] hover:bg-[#943a20] text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-xs shadow-md"
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        </div>
      )}
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