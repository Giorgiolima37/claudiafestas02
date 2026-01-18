import { createClient } from '@supabase/supabase-js';

// Essas são as credenciais do seu projeto FreeNow no Supabase
const supabaseUrl = 'https://jhdwssnwtbgyfslnmwxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZHdzc253dGJneWZzbG5td3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjU5MjMsImV4cCI6MjA4NDI0MTkyM30.U3r7SnHHkq1WVOR5dOadkgraHEZ3J6oxM7IxpTs16A8';

// Inicializa o cliente do Supabase para ser usado em todo o app

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
