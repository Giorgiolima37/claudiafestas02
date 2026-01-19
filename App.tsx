import React, { useState, useEffect } from 'react';
import { User, UserRole, Job, JobStatus } from './types';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Register from './components/Register';
import CompanyDashboard from './components/CompanyDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import CreateJob from './components/CreateJob';
import JobDetails from './components/JobDetails';
import WorkerProfile from './components/WorkerProfile';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'CREATE_JOB' | 'JOB_DETAILS' | 'PROFILE'>('LOGIN');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [currentUser]);

  // --- NOVO: Notificação de Som para Trabalhadores ---
  useEffect(() => {
    // Só ativa o listener se houver um usuário logado e ele for TRABALHADOR
    if (currentUser && currentUser.role === UserRole.WORKER) {
      const channel = supabase
        .channel('jobs-notification')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'jobs' },
          (payload) => {
            console.log('Nova vaga detectada!', payload);
            
            // 1. Toca o som (certifique-se que alert.mp3 está na pasta public)
            const audio = new Audio('/alert.mp3');
            audio.play().catch((error) => console.log('O navegador bloqueou o som automático:', error));

            // 2. Atualiza a lista de vagas na hora
            fetchJobs();
          }
        )
        .subscribe();

      // Limpeza ao sair ou mudar de usuário
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);
  // ---------------------------------------------------

  async function fetchJobs() {
    try {
      // 1. TENTATIVA SEGURA: Busca simples primeiro (para garantir que as vagas não sumam)
      // Buscamos a tabela 'jobs' e tentamos trazer 'profiles' de forma genérica
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*, profiles(business_name, municipio, bairro)');

      if (jobsError) {
        console.error('Erro ao buscar vagas (tentando fallback):', jobsError);
        // Se der erro no JOIN, tentamos buscar SÓ as vagas para não deixar a tela em branco
        const { data: fallbackData } = await supabase.from('jobs').select('*');
        if (fallbackData) processJobsData(fallbackData);
        return;
      }

      if (jobsData) {
        processJobsData(jobsData);
      }

    } catch (error) {
      console.error('Erro geral:', error);
    }
  }

  // Função separada para processar os dados e evitar repetição
  async function processJobsData(data: any[]) {
    // Busca candidaturas do usuário atual
    let myApplicationsIds = new Set<string>();
    if (currentUser && currentUser.role === UserRole.WORKER) {
      const { data: appsData } = await supabase
        .from('applications')
        .select('job_id')
        .eq('worker_id', currentUser.id);
      
      if (appsData) {
        appsData.forEach((app: any) => myApplicationsIds.add(app.job_id));
      }
    }

    const realJobs: Job[] = data.map((item: any) => {
      const iHaveApplied = myApplicationsIds.has(item.id);
      
      // Tenta pegar o profile se ele veio (pode ser um objeto ou array dependendo da versão do Supabase)
      const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;

      return {
        id: item.id,
        companyId: item.company_id,
        // Nome da empresa: prioriza profile, senão usa o da vaga, senão 'Empresa'
        companyName: profileData?.business_name || item.company_name || 'Empresa',
        role: item.role,
        dailyRate: item.daily_rate,
        description: item.description,
        
        // --- AQUI: PUXANDO DA TABELA JOBS ---
        // Prioridade TOTAL para o que está na tabela jobs (city/neighborhood)
        // Se estiver vazio lá, tenta o profile. Se não, "Não Informado".
        city: item.city || profileData?.municipio || 'Não Informado',
        neighborhood: item.neighborhood || profileData?.bairro || 'Não Informado',
        // ------------------------------------

        status: iHaveApplied ? JobStatus.PENDING : JobStatus.OPEN,
        appliedWorkerId: iHaveApplied ? currentUser?.id : undefined,
        
        startTime: item.startTime || item.start_time || '08:00',
        endTime: item.endTime || item.end_time || '17:00',
        date: item.date || new Date().toISOString(),
        benefits: item.benefits || ['Vale Transporte', 'Alimentação'] 
      };
    });

    setJobs(realJobs);
  }

  // --- RESTO DO CÓDIGO (Igual) ---
  useEffect(() => {
    const savedUser = localStorage.getItem('freeNowUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setView('DASHBOARD');
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('freeNowUser', JSON.stringify(user));
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('freeNowUser');
    setView('LOGIN');
  };

  const handleUpdateProfile = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('freeNowUser', JSON.stringify(updatedUser));
  };

  const handleCreateJob = (newJob: Job) => {
    fetchJobs(); 
    setView('DASHBOARD');
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) return;
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', jobId);
      if (error) {
        alert('Erro ao excluir.');
        return;
      }
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (error) { console.error(error); }
  };

  const handleApplyToJob = async (jobId: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('applications').insert([
          { job_id: jobId, worker_id: currentUser.id, worker_name: currentUser.name, status: 'PENDING' }
        ]);
      if (error) {
        alert('Erro ao aplicar.');
        return;
      }
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: JobStatus.PENDING, appliedWorkerId: currentUser.id } : j));
      alert('Vaga aceita!');
      setView('DASHBOARD');
    } catch (error) { alert('Erro inesperado.'); }
  };

  const renderView = () => {
    switch (view) {
      case 'LOGIN': return <Login onLogin={handleLogin} onSwitchToRegister={() => setView('REGISTER')} />;
      case 'REGISTER': return <Register onRegister={handleLogin} onSwitchToLogin={() => setView('LOGIN')} />;
      case 'DASHBOARD':
        if (currentUser?.role === UserRole.COMPANY) {
          return <CompanyDashboard user={currentUser} jobs={jobs.filter(j => j.companyId === currentUser.id)} onLogout={handleLogout} onCreateJob={() => setView('CREATE_JOB')} onDeleteJob={handleDeleteJob} onViewDetails={(job) => { setSelectedJob(job); setView('JOB_DETAILS'); }} />;
        }
        return <WorkerDashboard user={currentUser!} jobs={jobs} onLogout={handleLogout} onViewDetails={(job) => { setSelectedJob(job); setView('JOB_DETAILS'); }} onOpenProfile={() => setView('PROFILE')} />;
      case 'PROFILE': return <WorkerProfile user={currentUser!} onBack={() => setView('DASHBOARD')} onSave={handleUpdateProfile} />;
      case 'CREATE_JOB': return <CreateJob user={currentUser!} onCancel={() => setView('DASHBOARD')} onCreate={handleCreateJob} />;
      case 'JOB_DETAILS': return <JobDetails job={selectedJob!} user={currentUser!} onBack={() => setView('DASHBOARD')} onApply={handleApplyToJob} />;
      default: return <Login onLogin={handleLogin} onSwitchToRegister={() => setView('REGISTER')} />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col shadow-xl">
      {renderView()}
    </div>
  );
};

export default App;