import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface WorkerProfileProps {
  user: User;
  onBack: () => void;
  onSave: (updatedUser: User) => void;
}

const WorkerProfile: React.FC<WorkerProfileProps> = ({ user, onBack, onSave }) => {
  const [formData, setFormData] = useState({
    age: user.age || '',
    address: user.address || '',
    municipio: user.municipio || '', // NOVO
    bairro: user.bairro || '',       // NOVO
    hasTransport: user.hasTransport || false,
    photoUrl: user.photoUrl || '',
    phone: user.phone || '', 
    cpf: user.cpf || ''      
  });
  const [currentRating, setCurrentRating] = useState(user.rating || 0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return;
      }

      if (data) {
        setFormData({
          age: data.age || '',
          address: data.address || '',
          municipio: data.municipio || '', // Carrega do banco
          bairro: data.bairro || '',       // Carrega do banco
          hasTransport: data.has_transport || false,
          photoUrl: data.photo_url || '',
          phone: data.phone || '', 
          cpf: data.cpf || ''      
        });
        if (data.rating) setCurrentRating(data.rating);
      }
    } catch (error) {
      console.error('Erro geral:', error);
    }
  };

  // --- Lógica Especial para CPF (Somente números e Max 11) ---
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Remove tudo que não for número
    const onlyNums = e.target.value.replace(/\D/g, '');
    
    // 2. Trava em 11 dígitos
    if (onlyNums.length <= 11) {
      setFormData({ ...formData, cpf: onlyNums });
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem.');
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, photoUrl: data.publicUrl }));
    } catch (error) {
      console.error('Erro upload:', error);
      alert('Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.name,
          age: formData.age,
          address: formData.address,
          municipio: formData.municipio, // Salva Município
          bairro: formData.bairro,       // Salva Bairro
          has_transport: formData.hasTransport,
          photo_url: formData.photoUrl,
          rating: currentRating,
          phone: formData.phone, 
          cpf: formData.cpf      
        });

      if (error) throw error;

      onSave({ 
        ...user, 
        ...formData, 
        rating: currentRating 
      });
      alert('Perfil salvo com sucesso!');
      onBack();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="p-6 border-b flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-800">
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <h1 className="text-xl font-bold text-gray-800">Editar Perfil</h1>
      </div>

      <div className="p-6 overflow-y-auto pb-10">
        <div className="flex flex-col items-center mb-8">
          <div className="relative group cursor-pointer">
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-green-500 mb-2 shadow-lg">
              {formData.photoUrl ? (
                <img src={formData.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <i className="fa-solid fa-user text-5xl text-gray-400"></i>
              )}
            </div>
            <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full opacity-0 group-hover:opacity-100 transition text-white font-bold text-xs cursor-pointer">
              Alterar Foto
            </label>
          </div>
          <input type="file" id="avatar-upload" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
          
          <h2 className="text-xl font-bold text-gray-800 mt-2 capitalize">{user.name}</h2>
          
          {/* Estrelas */}
          <div className="flex flex-col items-center mt-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <i key={star} className={`text-lg ${star <= currentRating ? 'fa-solid fa-star text-yellow-400' : 'fa-regular fa-star text-gray-300'}`}></i>
              ))}
            </div>
            <span className="text-xs text-gray-400 mt-1">{currentRating > 0 ? `Sua nota: ${currentRating.toFixed(1)}` : 'Ainda sem avaliações'}</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Inputs Básicos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sua Idade</label>
            <input type="number" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-green-500" placeholder="Ex: 25" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
          </div>

          {/* --- NOVOS INPUTS: MUNICÍPIO E BAIRRO --- */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Município</label>
              <input 
                type="text" 
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-green-500"
                placeholder="Ex: Florianópolis" 
                value={formData.municipio} 
                onChange={e => setFormData({...formData, municipio: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Bairro</label>
              <input 
                type="text" 
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-green-500"
                placeholder="Ex: Centro" 
                value={formData.bairro} 
                onChange={e => setFormData({...formData, bairro: e.target.value})} 
              />
            </div>
          </div>
          {/* ---------------------------------------- */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço (Rua e Número)</label>
            <input type="text" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-green-500" placeholder="Ex: Rua das Flores, 123" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>

          {/* --- NOVOS CAMPOS DE SEGURANÇA --- */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-green-600"></i> Dados de Contato e Segurança
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-green-500"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">CPF (Apenas números)</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-green-500 tracking-widest font-mono"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleCpfChange} 
                />
                <p className="text-[10px] text-gray-400 mt-1 text-right">
                  {formData.cpf.length}/11 dígitos
                </p>
              </div>
            </div>
          </div>
          {/* --------------------------------- */}

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer select-none" onClick={() => setFormData({...formData, hasTransport: !formData.hasTransport})}>
            <input type="checkbox" className="w-5 h-5 text-green-600 rounded focus:ring-green-500 pointer-events-none" checked={formData.hasTransport} readOnly />
            <span className="text-sm text-gray-700 font-medium">Tenho meio de transporte próprio</span>
          </div>
        </div>

        <button onClick={handleSave} disabled={loading || uploading} className="w-full mt-8 bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition flex justify-center items-center gap-2 shadow-lg shadow-green-200">
          {loading ? 'Salvando...' : 'Salvar Dados'}
        </button>
      </div>
    </div>
  );
};

export default WorkerProfile;