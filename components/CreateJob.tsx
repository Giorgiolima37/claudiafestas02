import React, { useState } from 'react';
import { User, Job, JobStatus } from '../types';
import { supabase } from '../lib/supabase';

interface CreateJobProps {
  user: User;
  onCancel: () => void;
  onCreate: (job: Job) => void;
}

const CreateJob: React.FC<CreateJobProps> = ({ user, onCancel, onCreate }) => {
  const [role, setRole] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  
  // --- NOVO ESTADO PARA O SEXO ---
  const [gender, setGender] = useState('Indiferente');

  const [benefits, setBenefits] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const AVAILABLE_BENEFITS = ['VT', 'Alimentação no Local'];

  const DAILY_RATES = [];
  for (let i = 60; i <= 3000; i += 10) {
    DAILY_RATES.push(i);
  }

  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toggleBenefit = (benefit: string) => {
    if (benefits.includes(benefit)) {
      setBenefits(benefits.filter(b => b !== benefit));
    } else {
      setBenefits([...benefits, benefit]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newJobData = {
        company_id: user.id,
        company_name: user.businessName || 'Empresa',
        role: role,
        date: date,
        start_time: startTime,
        end_time: endTime,
        daily_rate: parseFloat(dailyRate),
        description: description,
        status: 'OPEN',
        benefits: benefits,
        city: city,
        neighborhood: neighborhood,
        // Envia o sexo para o banco (certifique-se de ter a coluna 'gender' ou 'sexo' no Supabase)
        gender: gender 
      };

      const { data, error } = await supabase
        .from('jobs')
        .insert([newJobData])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const formattedJob: Job = {
          id: data.id,
          companyId: data.company_id,
          companyName: data.company_name,
          role: data.role,
          date: data.date,
          startTime: data.start_time,
          endTime: data.end_time,
          dailyRate: data.daily_rate,
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          description: data.description,
          status: data.status as JobStatus,
          city: data.city,
          neighborhood: data.neighborhood,
          // Se sua interface Job tiver o campo gender, adicione aqui:
          // gender: data.gender
        };
        
        onCreate(formattedJob);
      }
    } catch (error: any) {
      alert('Erro ao postar vaga: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 flex items-center border-b">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-400 hover:text-green-600">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1 className="ml-2 text-lg font-bold text-gray-800">Postar Vaga</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5 pb-24">
        
        {/* CARGO */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cargo / Título</label>
          <input 
            type="text" 
            placeholder="Ex: Garçom, Atendente, Cozinheiro"
            required
            className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
            value={role}
            onChange={(e) => setRole(toTitleCase(e.target.value))}
          />
        </div>

        {/* DATA (LINHA INTEIRA) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Data</label>
          <input 
            type="date" 
            required
            min={new Date().toISOString().split('T')[0]} 
            className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* VALOR DIÁRIA E SEXO (LADO A LADO) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Diária (R$)</label>
            <select 
              required
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none appearance-none"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
            >
              <option value="" disabled>Selecione...</option>
              {DAILY_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </option>
              ))}
            </select>
          </div>

          {/* --- CAMPO SEXO --- */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sexo</label>
            <select 
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none appearance-none"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="Indiferente">Indiferente</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Início</label>
            <input 
              type="time" 
              required
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Término</label>
            <input 
              type="time" 
              required
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Município</label>
            <input 
              type="text" 
              placeholder="Ex: Florianópolis - SC"
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
              value={city}
              onChange={(e) => setCity(toTitleCase(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Bairro</label>
            <input 
              type="text" 
              placeholder="Ex: Centro"
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
              value={neighborhood}
              onChange={(e) => setNeighborhood(toTitleCase(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Benefícios</label>
          <div className="flex gap-4">
            {AVAILABLE_BENEFITS.map((benefit) => (
              <label 
                key={benefit} 
                className={`
                  flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition select-none
                  ${benefits.includes(benefit) 
                    ? 'border-green-500 bg-green-50 text-green-700 font-bold' 
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'}
                `}
              >
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={benefits.includes(benefit)}
                  onChange={() => toggleBenefit(benefit)}
                />
                {benefits.includes(benefit) && <i className="fa-solid fa-check text-sm"></i>}
                {benefit}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição Livre</label>
          <textarea 
            rows={3}
            placeholder="Detalhes adicionais sobre o trabalho..."
            className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className={`w-full ${loading ? 'bg-gray-400' : 'bg-green-600'} text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition mt-4`}
        >
          {loading ? 'Postando...' : 'Postar Vaga'}
        </button>
      </form>
    </div>
  );
};

export default CreateJob;