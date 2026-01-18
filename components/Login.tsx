import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase'; // Adicionada a conexão

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Adicionado para feedback visual

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Autenticação no Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Busca os dados do perfil na tabela 'profiles'
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;

        // 3. Monta o objeto de usuário com os dados reais do banco
        const loggedUser: User = {
          id: authData.user.id,
          name: profileData.full_name,
          email: authData.user.email || '',
          role: profileData.user_type as UserRole,
          businessName: profileData.business_name,
          businessType: profileData.business_type,
        };

        onLogin(loggedUser);
      }
    } catch (error: any) {
      alert('Erro ao entrar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 justify-center">
      <div className="flex flex-col items-center text-center mb-10">
        <img 
          src="/logo.png" 
          alt="Logo FreeNow" 
          className="w-56 h-56 object-contain mb-6" 
        />
        <h1 className="text-4xl font-bold text-green-600 mb-2">FreeNow</h1>
        <p className="text-gray-500">Contrate rápido, trabalhe livre.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input 
            type="email" 
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input 
            type="password" 
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className={`w-full ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold py-3 rounded-lg transition shadow-lg active:scale-95`}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button 
          onClick={onSwitchToRegister}
          className="text-green-600 font-semibold hover:underline"
        >
          Não tem uma conta? Cadastre-se
        </button>
      </div>
    </div>
  );
};

export default Login;