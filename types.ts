export enum UserRole {
  COMPANY = 'Empresa',
  WORKER = 'Trabalhador'
}

export enum JobStatus {
  OPEN = 'Aberto',
  PENDING = 'Pendente',
  FILLED = 'Preenchido',
  COMPLETED = 'Concluído'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessName?: string;
  businessType?: string;
  location?: string;

  // --- NOVOS CAMPOS DA BIO DA EMPRESA ---
  municipio?: string;
  bairro?: string;
  // --------------------------------------

  // Campos de Biografia
  age?: string;
  address?: string;
  hasTransport?: boolean;
  photoUrl?: string;
  rating?: number;
  // Novos Campos de Segurança
  phone?: string;
  cpf?: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  startTime: string;
  endTime: string;
  date: string;
  dailyRate: number;
  benefits: string[];
  description: string;
  status: JobStatus;
  appliedWorkerId?: string;

  // --- NOVOS CAMPOS DE LOCALIZAÇÃO (VAGA) ---
  city?: string;          // Município
  neighborhood?: string;  // Bairro
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  workerName: string;
  status: 'SOLICITADO' | 'ACEITO' | 'RECUSADO';
}