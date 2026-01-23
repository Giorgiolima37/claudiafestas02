import { createClient } from '@supabase/supabase-js';

// Pega as chaves do arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cria a conexão
const client = createClient(supabaseUrl, supabaseKey);

// --- EXPORTAÇÕES MÚLTIPLAS (Para compatibilidade total) ---

// 1. Para o código novo (ClientLogin)
export const supabase = client;

// 2. Para o código antigo (CustomerRegistration, etc que usa 'db')
export const db = client;

// 3. Exportação padrão (para garantir)
export default client;