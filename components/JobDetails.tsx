
import React from 'react';
import { User, Job, UserRole, JobStatus } from '../types';

interface JobDetailsProps {
  job: Job;
  user: User;
  onBack: () => void;
  onApply: (jobId: string) => void;
}

const JobDetails: React.FC<JobDetailsProps> = ({ job, user, onBack, onApply }) => {
  const isCompany = user.role === UserRole.COMPANY;
  const isMyJob = job.companyId === user.id;

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 flex items-center border-b">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-green-600">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1 className="ml-2 text-lg font-bold text-gray-800">Detalhes da Vaga</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase mb-2">
            Diária Disponível
          </span>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Free para {job.role}</h2>
          <div className="flex items-center text-gray-500">
            <i className="fa-solid fa-shop mr-2 text-green-600"></i>
            <span className="font-medium">{job.companyName}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Pagamento</p>
            <p className="text-xl font-bold text-green-600">R$ {job.dailyRate.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Data</p>
            <p className="text-xl font-bold text-gray-800">{new Date(job.date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3">Horário</h3>
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <i className="fa-regular fa-clock text-green-600"></i>
                <span className="font-semibold">{job.startTime} às {job.endTime}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3">Benefícios</h3>
            <div className="flex flex-wrap gap-2">
              {job.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-medium">
                  <i className="fa-solid fa-check text-[10px]"></i>
                  {b}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3">Descrição</h3>
            <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl">
              {job.description || 'Sem descrição adicional fornecida.'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-6 border-t bg-white">
        {!isCompany ? (
          <button 
            onClick={() => onApply(job.id)}
            disabled={job.status !== JobStatus.OPEN}
            className={`w-full font-bold py-4 rounded-2xl shadow-lg transition active:scale-95 ${
              job.status === JobStatus.OPEN 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {job.status === JobStatus.OPEN ? 'Aceitar Vaga' : 'Já Candidatado'}
          </button>
        ) : isMyJob ? (
          <div className="flex gap-4">
            <button className="flex-1 border-2 border-red-100 text-red-500 font-bold py-4 rounded-2xl hover:bg-red-50 transition">
              Encerrar Vaga
            </button>
            {job.status === JobStatus.PENDING && (
              <button className="flex-1 bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 transition">
                Confirmar Profissional
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default JobDetails;
