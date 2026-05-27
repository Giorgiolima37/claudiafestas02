import { createClient } from '@supabase/supabase-js';

// Usamos o operador '|| ""' para garantir ao TypeScript que sempre haverá uma string
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Erro: Variáveis de ambiente do Supabase não encontradas!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export const db = supabase;