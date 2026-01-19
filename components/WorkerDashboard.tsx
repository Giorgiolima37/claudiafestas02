import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Job, ApplicationStatus } from '../types';

interface WorkerDashboardProps {
  user: User;
  jobs: Job[];
  onLogout: () => void;
  onViewDetails: (job: Job) => void;
  onOpenProfile: () => void;
}

interface CompanyInfo {
  description: string;
  address: string;
}

const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ user, jobs, onLogout }) => {
  const [filter, setFilter] = useState('');
  
  // --- ESTADOS DO DASHBOARD ---
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  
  const [companyInfos, setCompanyInfos] = useState<{[key: string]: CompanyInfo}>({});
  const [jobStatuses, setJobStatuses] = useState<{[key: string]: ApplicationStatus}>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // --- ESTADOS DO PERFIL DO TRABALHADOR ---
  const [showProfileModal, setShowProfileModal] = useState(false);
  // Adicionei photoUrl aqui para atualizar na hora que fizer o upload
  const [workerProfile, setWorkerProfile] = useState({
    age: '',
    municipio: '',
    bairro: '',
    address: '',
    phone: '',
    cpf: '',
    hasTransport: false,
    photoUrl: user.photoUrl || '' // Inicia com a foto atual
  });
  
  // Estado para controlar o carregamento da imagem
  const [uploading, setUploading] = useState(false);

  // --- HELPER: LISTAS ÚNICAS ---
  const availableCities = Array.from(new Set(jobs.map(j => j.city).filter(Boolean))).sort();
  const availableNeighborhoods = Array.from(new Set(
    jobs
      .filter(j => selectedCity ? j.city === selectedCity : true)
      .map(j => j.neighborhood)
      .filter(Boolean)
  )).sort();

  // --- MÁSCARA CPF ---
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '') 
      .replace(/(\d{3})(\d)/, '$1.$2') 
      .replace(/(\d{3})(\d)/, '$1.$2') 
      .replace(/(\d{3})(\d{1,2})/, '$1-$2') 
      .replace(/(-\d{2})\d+?$/, '$1'); 
  };

  // --- TITLE CASE ---
  const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  useEffect(() => {
    async function fetchCompanyDetails() {
      const userIds = [...new Set(jobs.map(job => (job as any).user_id || job.companyId).filter(Boolean))];
      if (userIds.length === 0) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, description, address')
          .in('id', userIds);
          
        if (data) {
          const infoMap: {[key: string]: CompanyInfo} = {};
          data.forEach((profile: any) => {
            infoMap[profile.id] = {
              description: profile.description || '',
              address: profile.address || ''
            };
          });
          setCompanyInfos(infoMap);
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function fetchUserApplications() {
      try {
        const { data } = await supabase
          .from('applications') 
          .select('job_id, status')
          .eq('worker_id', user.id);
        
        if (data) {
          const statusMap: {[key: string]: ApplicationStatus} = {};
          data.forEach((app: any) => {
            statusMap[app.job_id] = app.status;
          });
          setJobStatuses(statusMap);
        }
      } catch (err) {
        console.error('Erro ao buscar candidaturas:', err);
      }
    }

    async function fetchMyProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('age, municipio, bairro, address, phone, cpf, has_transport, photo_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setWorkerProfile({
          age: data.age || '',
          municipio: data.municipio || '',
          bairro: data.bairro || '',
          address: data.address || '',
          phone: data.phone || '',
          cpf: data.cpf || '',
          hasTransport: data.has_transport || false,
          photoUrl: data.photo_url || user.photoUrl || ''
        });
      }
    }

    if (jobs.length > 0) {
      fetchCompanyDetails();
      fetchUserApplications();
    }
    fetchMyProfile();
  }, [jobs, user.id]);

  // --- NOVA FUNÇÃO DE UPLOAD ---
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pega URL Pública
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // 3. Atualiza estado local imediatamente (preview)
      setWorkerProfile(prev => ({ ...prev, photoUrl: data.publicUrl }));

      // 4. Salva URL no banco imediatamente (opcional, ou deixa pro botão salvar)
      await supabase.from('profiles').update({ photo_url: data.publicUrl }).eq('id', user.id);

    } catch (error: any) {
      console.error('Erro upload:', error);
      alert('Erro ao enviar imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          age: workerProfile.age,
          municipio: workerProfile.municipio,
          bairro: workerProfile.bairro,
          address: workerProfile.address,
          phone: workerProfile.phone,
          cpf: workerProfile.cpf,
          has_transport: workerProfile.hasTransport,
          photo_url: workerProfile.photoUrl // Garante que a foto é salva
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Dados salvos com sucesso!');
      setShowProfileModal(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar dados.');
    }
  };

  const handleOpenDetails = (job: Job) => {
    setSelectedJob(job);
    setShowConfirm(false);
  };

  const handleApply = async (job: Job) => {
    try {
      const { error } = await supabase
        .from('applications') 
        .insert({
          job_id: job.id,
          worker_id: user.id,
          worker_name: user.name, 
          status: 'PENDING'
        });

      if (error) {
        if (error.code === '23505') { 
          alert('Você já se candidatou para esta vaga.');
        } else {
          throw error;
        }
      } else {
        alert('Sucesso! A empresa foi notificada da sua candidatura.');
        setJobStatuses(prev => ({ ...prev, [job.id]: 'SOLICITADO' }));
        setSelectedJob(null);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao se candidatar: ' + (err.message || 'Tente novamente.'));
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesText = 
      job.role.toLowerCase().includes(filter.toLowerCase()) || 
      job.companyName.toLowerCase().includes(filter.toLowerCase());
    const matchesCity = selectedCity ? job.city === selectedCity : true;
    const matchesNeighborhood = selectedNeighborhood ? job.neighborhood === selectedNeighborhood : true;
    return matchesText && matchesCity && matchesNeighborhood;
  });

  const clearFilters = () => {
    setSelectedCity('');
    setSelectedNeighborhood('');
    setShowFilterModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Olá, {user.name.split(' ')[0]}!</h1>
            <p className="text-sm text-gray-500">Encontre sua diária de hoje.</p>
          </div>
          
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setShowFilterModal(true)}
              className={`
                px-3 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 border
                ${(selectedCity || selectedNeighborhood) 
                  ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
              `}
            >
              <i className="fa-solid fa-map-location-dot"></i> 
              {(selectedCity || selectedNeighborhood) ? 'Filtrado' : 'Região'}
            </button>

            <button 
              onClick={() => setShowProfileModal(true)}
              className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition flex items-center gap-2 border border-blue-100"
            >
              <i className="fa-regular fa-id-card"></i> Bio
            </button>
            <button onClick={onLogout} className="text-gray-400 hover:text-red-500 px-2">
              <i className="fa-solid fa-right-from-bracket text-lg"></i>
            </button>
          </div>
        </div>

        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input 
            type="text" 
            placeholder="Buscar por cargo ou empresa..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-green-500 outline-none text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 px-6 mt-6 overflow-y-auto pb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">Vagas Disponíveis</h2>
            {(selectedCity || selectedNeighborhood) && (
               <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold">
                 {selectedCity} {selectedNeighborhood ? ` - ${selectedNeighborhood}` : ''}
               </span>
            )}
          </div>
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {filteredJobs.length} encontradas
          </span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-300 mt-4">
            <i className="fa-solid fa-search text-gray-300 text-4xl mb-3"></i>
            <p className="text-gray-500">Nenhuma vaga encontrada.</p>
            {(selectedCity || selectedNeighborhood) && (
              <button onClick={clearFilters} className="mt-3 text-green-600 font-bold text-sm hover:underline">
                Limpar filtros de região
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => {
              const companyInfo = companyInfos[(job as any).user_id || job.companyId];
              const bioAddress = companyInfo?.address;
              const status = jobStatuses[job.id];
              const isHired = status === 'ACEITO';
              const isApplied = status === 'SOLICITADO';

              return (
                <div 
                  key={job.id} 
                  onClick={() => handleOpenDetails(job)}
                  className={`
                    p-5 rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer active:scale-95 border-2
                    ${isHired ? 'bg-green-50 border-green-500' : 'bg-white border-transparent'} 
                    ${isApplied ? 'border-blue-200' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">Free para {job.role}</h3>
                      {isHired && (
                        <span className="text-[10px] font-bold text-white bg-green-600 px-2 py-0.5 rounded-md mt-1 inline-block uppercase tracking-wider">
                          <i className="fa-solid fa-check-circle mr-1"></i> Contratado
                        </span>
                      )}
                      {isApplied && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                          Aguardando Aprovação
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-bold ${isHired ? 'text-green-700' : 'text-green-600'}`}>
                        R$ {job.dailyRate.toFixed(2)}
                      </span>
                      
                      {(job as any).gender && (
                        <span className="text-[10px] text-gray-500 mt-1 font-medium bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                          {(job as any).gender}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3 mt-2">
                      <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        <i className="fa-solid fa-store text-gray-400 text-xs"></i> {job.companyName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-start gap-2">
                        <i className="fa-solid fa-location-dot text-red-400 mt-0.5"></i>
                        <span className="capitalize">
                          {bioAddress ? <span className="font-semibold text-gray-700">{bioAddress} - </span> : ''}
                          {(job as any).city || 'Município não inf.'} - {(job as any).neighborhood || 'Bairro não inf.'}
                        </span>
                      </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.benefits.slice(0, 2).map((b, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                        {b}
                      </span>
                    ))}
                    {job.benefits.length > 2 && <span className="text-[10px] text-gray-400">+{job.benefits.length - 2}</span>}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs text-gray-400 mb-2">
                    <span>
                      <i className="fa-regular fa-clock mr-1"></i> {job.startTime} - {job.endTime}
                    </span>
                    <span>
                      <i className="fa-regular fa-calendar mr-1"></i> {new Date(job.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {job.description && (
                    <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                      <p className="text-[10px] font-bold text-yellow-700 uppercase mb-1">
                        <i className="fa-solid fa-circle-info mr-1"></i> Observações da Vaga:
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODAL DE PERFIL (AGORA COM UPLOAD E CÂMERA) --- */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-white px-6 py-4 border-b flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <button onClick={() => setShowProfileModal(false)} className="text-gray-500 hover:text-gray-800">
                   <i className="fa-solid fa-arrow-left"></i>
                 </button>
                 <h3 className="font-bold text-lg text-gray-800">Editar Perfil</h3>
               </div>
               <div className="w-8"></div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
               <div className="flex flex-col items-center mb-6">
                 
                 {/* --- ÁREA DA FOTO COM UPLOAD --- */}
                 <div className="relative group">
                    <label 
                      htmlFor="dashboard-avatar-upload"
                      className="cursor-pointer block w-28 h-28 rounded-full bg-green-100 border-4 border-green-500 flex items-center justify-center text-green-600 mb-2 overflow-hidden shadow-lg"
                    >
                        {uploading ? (
                           <i className="fa-solid fa-circle-notch fa-spin text-2xl"></i>
                        ) : workerProfile.photoUrl ? (
                          <img src={workerProfile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <i className="fa-solid fa-user text-4xl"></i>
                        )}
                        
                        {/* Overlay escuro ao passar o mouse */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center rounded-full">
                           <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100">Alterar</span>
                        </div>
                    </label>

                    {/* Botão Câmera no cantinho */}
                    <label 
                       htmlFor="dashboard-avatar-upload"
                       className="absolute bottom-2 right-0 bg-green-600 text-white w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md cursor-pointer hover:bg-green-700 transition"
                    >
                       <i className="fa-solid fa-camera text-xs"></i>
                    </label>

                    <input 
                       id="dashboard-avatar-upload"
                       type="file" 
                       accept="image/*"
                       onChange={uploadAvatar}
                       disabled={uploading}
                       className="hidden"
                    />
                 </div>
                 {/* ---------------------------------- */}

                 <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
                 
                 <div className="flex gap-1 mt-1 text-yellow-400">
                    <i className="fa-solid fa-star"></i>
                    <i className="fa-solid fa-star"></i>
                    <i className="fa-solid fa-star"></i>
                    <i className="fa-regular fa-star"></i>
                    <i className="fa-regular fa-star"></i>
                 </div>
                 <p className="text-xs text-gray-400 mt-1">Sua nota: 3.0</p>
               </div>

               <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-gray-500 uppercase">Sua Idade</label>
                   <input 
                     type="number" 
                     value={workerProfile.age}
                     onChange={(e) => setWorkerProfile({...workerProfile, age: e.target.value})}
                     className="w-full border rounded-lg p-3 mt-1 outline-none focus:ring-2 focus:ring-green-500"
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Município</label>
                     <input 
                       type="text" 
                       value={workerProfile.municipio}
                       onChange={(e) => setWorkerProfile({...workerProfile, municipio: toTitleCase(e.target.value)})}
                       className="w-full border rounded-lg p-3 mt-1 outline-none focus:ring-2 focus:ring-green-500"
                     />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                     <input 
                       type="text" 
                       value={workerProfile.bairro}
                       onChange={(e) => setWorkerProfile({...workerProfile, bairro: toTitleCase(e.target.value)})}
                       className="w-full border rounded-lg p-3 mt-1 outline-none focus:ring-2 focus:ring-green-500"
                     />
                   </div>
                 </div>

                 <div>
                   <label className="text-xs font-bold text-gray-500 uppercase">Endereço (Rua e Número)</label>
                   <input 
                     type="text" 
                     value={workerProfile.address}
                     onChange={(e) => setWorkerProfile({...workerProfile, address: toTitleCase(e.target.value)})}
                     className="w-full border rounded-lg p-3 mt-1 outline-none focus:ring-2 focus:ring-green-500"
                   />
                 </div>

                 <div className="pt-4 border-t border-gray-100">
                   <p className="text-sm font-bold text-green-700 flex items-center gap-2 mb-3">
                     <i className="fa-solid fa-shield-halved"></i> Dados de Contato e Segurança
                   </p>
                   
                   <div className="mb-4">
                     <label className="text-xs font-bold text-gray-500 uppercase">Telefone / Whatsapp</label>
                     <input 
                       type="text" 
                       value={workerProfile.phone}
                       onChange={(e) => setWorkerProfile({...workerProfile, phone: e.target.value})}
                       className="w-full border rounded-lg p-3 mt-1 outline-none focus:ring-2 focus:ring-green-500"
                     />
                   </div>

                   <div className="mb-4">
                     <label className="text-xs font-bold text-gray-500 uppercase">CPF (Apenas números)</label>
                     <input 
                       type="text" 
                       value={workerProfile.cpf}
                       onChange={(e) => setWorkerProfile({...workerProfile, cpf: formatCPF(e.target.value)})}
                       maxLength={14}
                       placeholder="000.000.000-00"
                       className="w-full border rounded-lg p-3 mt-1 outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 tracking-widest font-mono"
                     />
                   </div>
                 </div>

                 <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-3 border border-gray-200">
                   <input 
                     type="checkbox" 
                     checked={workerProfile.hasTransport}
                     onChange={(e) => setWorkerProfile({...workerProfile, hasTransport: e.target.checked})}
                     className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                   />
                   <label className="text-sm text-gray-700 font-medium">Tenho meio de transporte próprio</label>
                 </div>
               </div>

               <button 
                 onClick={handleSaveProfile}
                 className="w-full bg-green-600 text-white font-bold py-4 rounded-xl mt-6 hover:bg-green-700 transition shadow-lg shadow-green-100"
               >
                 Salvar Dados
               </button>
            </div>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="bg-green-600 p-6 flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute opacity-20 text-white transform scale-150 top-2 right-2">
                 <i className="fa-solid fa-map text-9xl"></i>
               </div>
               <h3 className="text-white font-bold text-xl relative z-10">Filtrar por Região</h3>
               <p className="text-green-100 text-xs relative z-10">Estado de Santa Catarina</p>
            </div>

            <div className="p-6 space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Município</label>
                 <div className="relative">
                   <i className="fa-solid fa-city absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                   <select 
                     value={selectedCity}
                     onChange={(e) => {
                       setSelectedCity(e.target.value);
                       setSelectedNeighborhood(''); 
                     }}
                     className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 appearance-none"
                   >
                     <option value="">Todas as Cidades</option>
                     {availableCities.map(city => (
                       <option key={city} value={city}>{city}</option>
                     ))}
                   </select>
                 </div>
               </div>

               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Bairro</label>
                 <div className="relative">
                   <i className="fa-solid fa-tree-city absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                   <select 
                     value={selectedNeighborhood}
                     onChange={(e) => setSelectedNeighborhood(e.target.value)}
                     disabled={!selectedCity} 
                     className={`
                       w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 appearance-none
                       ${!selectedCity ? 'opacity-50 cursor-not-allowed' : ''}
                     `}
                   >
                     <option value="">Todos os Bairros</option>
                     {availableNeighborhoods.map(bairro => (
                       <option key={bairro} value={bairro}>{bairro}</option>
                     ))}
                   </select>
                 </div>
               </div>

               <div className="flex gap-3 mt-6">
                 <button 
                   onClick={clearFilters}
                   className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition"
                 >
                   Limpar
                 </button>
                 <button 
                   onClick={() => setShowFilterModal(false)}
                   className="flex-1 py-3 rounded-xl font-bold bg-green-600 text-white shadow-lg shadow-green-200 hover:bg-green-700 transition"
                 >
                   Ver Vagas
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col animate-fade-in overflow-y-auto">
          <div className="bg-white px-6 py-4 border-b flex items-center sticky top-0 z-10">
            <button 
              onClick={() => setSelectedJob(null)}
              className="text-gray-500 hover:text-gray-800 mr-4"
            >
              <i className="fa-solid fa-arrow-left text-xl"></i>
            </button>
            <h2 className="text-lg font-bold text-gray-800">Detalhes da Vaga</h2>
          </div>

          <div className="p-6 max-w-lg mx-auto w-full flex-1 flex flex-col justify-between">
             <div>
                {jobStatuses[selectedJob.id] === 'ACEITO' ? (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block uppercase">
                      VOCÊ FOI CONTRATADO!
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">
                    DIÁRIA DISPONÍVEL
                  </span>
                )}

                <h1 className="text-2xl font-bold text-gray-900 mb-1">Free para {selectedJob.role}</h1>
                <p className="text-gray-500 font-medium mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-shop text-gray-400"></i> {selectedJob.companyName}
                </p>

                {companyInfos[(selectedJob as any).user_id || selectedJob.companyId]?.address && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                     <div className="mt-0.5"><i className="fa-solid fa-map-location-dot text-blue-500"></i></div>
                     <div>
                        <p className="text-xs font-bold text-blue-700 uppercase">Endereço da Empresa</p>
                        <p className="text-sm text-gray-700">
                          {companyInfos[(selectedJob as any).user_id || selectedJob.companyId].address}
                        </p>
                     </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">Pagamento</p>
                      <p className="text-green-600 text-xl font-bold">R$ {selectedJob.dailyRate.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">Data</p>
                      <p className="text-gray-800 text-xl font-bold">{new Date(selectedJob.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">Município</p>
                      <p className="text-gray-800 font-bold capitalize">{(selectedJob as any).city || 'Não informado'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">Bairro</p>
                      <p className="text-gray-800 font-bold capitalize">{(selectedJob as any).neighborhood || 'Não informado'}</p>
                    </div>
                </div>

                {/* --- SEÇÃO DE SEXO NO MODAL --- */}
                {(selectedJob as any).gender && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Sexo</p>
                    <p className="text-gray-800 font-bold">{ (selectedJob as any).gender }</p>
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-2">Horário</p>
                  <p className="text-gray-700 flex items-center gap-2">
                    <i className="fa-regular fa-clock text-green-500"></i> {selectedJob.startTime} às {selectedJob.endTime}
                  </p>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-2">Benefícios</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.benefits.map((b, i) => (
                      <span key={i} className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
                        <i className="fa-solid fa-check text-xs"></i> {b}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedJob.description && (
                  <div className="mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                    <p className="text-xs font-bold text-yellow-700 uppercase mb-2">
                      <i className="fa-solid fa-circle-info mr-1"></i> Observações da Vaga
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      "{selectedJob.description}"
                    </p>
                  </div>
                )}

                {companyInfos[(selectedJob as any).user_id || selectedJob.companyId]?.description && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                      Sobre a Empresa
                    </p>
                    <p className="text-sm text-gray-600 italic leading-relaxed">
                      "{companyInfos[(selectedJob as any).user_id || selectedJob.companyId].description}"
                    </p>
                  </div>
                )}
             </div>

             <div className="mt-6 pt-4 border-t border-gray-100 pb-6">
               {jobStatuses[selectedJob.id] ? (
                 <button 
                   disabled
                   className={`w-full font-bold py-4 rounded-xl cursor-not-allowed text-lg ${
                     jobStatuses[selectedJob.id] === 'ACEITO' 
                     ? 'bg-green-600 text-white' 
                     : 'bg-gray-200 text-gray-500'
                   }`}
                 >
                   {jobStatuses[selectedJob.id] === 'ACEITO' ? 'Vaga Garantida! (Contratado)' : 'Solicitação Enviada'}
                 </button>
               ) : showConfirm ? (
                 <div className="flex gap-4 animate-fade-in">
                    <button 
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition text-lg"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleApply(selectedJob)}
                      className="flex-1 bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200 text-lg"
                    >
                      Confirmar
                    </button>
                 </div>
               ) : (
                 <button 
                   onClick={() => setShowConfirm(true)}
                   className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200 text-lg"
                 >
                   Aceitar Vaga
                 </button>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;