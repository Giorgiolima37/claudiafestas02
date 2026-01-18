
import { Job, JobStatus } from './types';

export const BUSINESS_TYPES = [
  'Restaurante',
  'Lanchonete',
  'Bar',
  'Mercado',
  'Evento',
  'Outro'
];

export const MOCK_JOBS: Job[] = [
  {
    id: '1',
    companyId: 'c1',
    companyName: 'Boteco do Zé',
    role: 'Garçom',
    startTime: '18:00',
    endTime: '00:00',
    date: '2023-11-15',
    dailyRate: 150.00,
    benefits: ['Alimentação no local', 'Ajuda VT'],
    description: 'Atendimento de mesas e auxílio na limpeza.',
    status: JobStatus.OPEN
  },
  {
    id: '2',
    companyId: 'c2',
    companyName: 'Lanches 24h',
    role: 'Cozinheiro',
    startTime: '16:00',
    endTime: '23:00',
    date: '2023-11-16',
    dailyRate: 200.00,
    benefits: ['Alimentação no local'],
    description: 'Preparação de chapas e porções.',
    status: JobStatus.OPEN
  },
  {
    id: '3',
    companyId: 'c3',
    companyName: 'Supermercado Central',
    role: 'Repositor',
    startTime: '08:00',
    endTime: '17:00',
    date: '2023-11-14',
    dailyRate: 120.00,
    benefits: ['Vale-refeição'],
    description: 'Reposição de estoque no setor de hortifruti.',
    status: JobStatus.OPEN
  }
];
