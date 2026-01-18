export interface Cliente {
  id: string;
  cliente: string;
  telefone: string;
  documento?: string; // Adicionado para suportar CPF/CNPJ mostrado nas fotos
  endereco?: string;
  bairro?: string;
  lista_negra: boolean; // Necessário para a lógica de abas
  created_at?: string;
}

export interface InventoryItem {
  id: string; // ID vindo do Supabase
  item: string; // Nome do material
  disponivel: number;
  reservado: number; // Ajustado de 'reservada' para 'reservado' conforme o banco
  preco: number; // Campo essencial para o cálculo do caixa
}

export interface Estoque {
  [key: string]: InventoryItem;
}

// Adicionado 'HISTORICO' para suportar a nova tela de movimentações
export type Screen = 'CADASTRO' | 'LISTAGEM' | 'LISTA_NEGRA' | 'RESERVA' | 'ESTOQUE' | 'CAIXA' | 'HISTORICO';