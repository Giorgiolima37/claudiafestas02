import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: Props) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica se existe uma sessão ativa ao carregar a página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças (ex: se o usuário deslogar em outra aba)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Carregando...</div>;

  // Se não estiver logado, você pode retornar a tela de Login ou um aviso
  if (!session) {
    return <div className="p-8 text-center">Acesso negado. Por favor, faça login.</div>;
  }

  return <>{children}</>;
};