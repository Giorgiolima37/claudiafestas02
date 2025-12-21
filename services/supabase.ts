import { createClient } from '@supabase/supabase-js';

// O Vite busca os dados automaticamente do seu arquivo .env.local
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Erro: Variáveis de ambiente do Supabase não encontradas!");
}

export const db = createClient(SUPABASE_URL, SUPABASE_KEY);