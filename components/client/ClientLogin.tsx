import { useState } from 'react';
import { Phone, ArrowRight, User, MapPin, Loader2, X } from 'lucide-react';
import { supabase } from '../../services/supabase'; 
import { ClientCatalog } from './ClientCatalog'; 

export function ClientLogin() {
  const [loggedClient, setLoggedClient] = useState<any>(null);

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false); 
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  // Se já logou, mostra o Catálogo
  if (loggedClient) {
    return <ClientCatalog cliente={loggedClient} onLogout={() => setLoggedClient(null)} />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, ''); 

      if (!isNewUser) {
        // Busca cliente
        const { data, error } = await supabase
          .from('cadastro') 
          .select('*')
          .ilike('telefone', `%${cleanPhone}%`) 
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setLoggedClient(data); // Loga direto
        } else {
          setIsNewUser(true); // Pede cadastro
        }
      } else {
        // Cadastra novo
        const { data, error } = await supabase
          .from('cadastro')
          .insert([{ 
               cliente: name,      
               telefone: phone,     
               bairro: address,     
          }])
          .select()
          .single();

        if (error) throw error;
        setLoggedClient(data);
      }
    } catch (error: any) {
      console.error("Erro:", error);
      alert("Erro ao conectar: " + (error.message || "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsNewUser(false);
    setName('');
    setAddress('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    setPhone(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-[#C05621] p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Claudia Festas</h1>
          <p className="text-orange-100">{isNewUser ? 'Complete seu cadastro' : 'Faça seu pedido online'}</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">{isNewUser ? 'Quase lá!' : 'Bem-vindo(a)!'}</h2>
              <p className="text-gray-500 text-sm mt-2">
                {isNewUser ? 'Preencha seu nome e endereço para continuar.' : 'Digite seu WhatsApp para iniciar seu pedido.'}
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input type="tel" value={phone} onChange={handlePhoneChange} disabled={isNewUser} placeholder="(48) 99999-9999" className="block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-[#C05621] focus:border-[#C05621]" required />
            </div>

            {isNewUser && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400" /></div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu Nome Completo" className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-[#C05621]" required autoFocus />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-gray-400" /></div>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Bairro / Endereço" className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-[#C05621]" required />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center space-x-2 bg-[#C05621] hover:bg-[#9c4215] text-white py-3 px-4 rounded-lg font-medium">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>{isNewUser ? 'Concluir Cadastro' : 'Continuar'}</span>}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>

            {isNewUser && (
              <button type="button" onClick={handleCancel} className="w-full py-2 text-sm text-gray-400 hover:text-[#C05621] font-medium flex justify-center gap-2">
                <X className="h-4 w-4" /> Cancelar e voltar
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}