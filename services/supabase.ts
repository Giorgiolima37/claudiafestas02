import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Erro: Variáveis de ambiente do Supabase não encontradas!");
}

// Exportando como 'supabase' (padrão) e como 'db' para garantir
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export const db = supabase;