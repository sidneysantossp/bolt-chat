import { useState, useEffect } from 'react';
import { UserCircle, Camera, Save, CheckCircle2 } from 'lucide-react';
import { differenceInYears, parse } from 'date-fns';
import { supabase } from '../lib/supabase';

interface UserProfileProps {
  onClose: () => void;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

interface UserData {
  id: string;
  username: string;
  birth_date: string;
  avatar_url: string | null;
}

export function UserProfile({ onClose }: UserProfileProps) {
  const [formData, setFormData] = useState({
    username: '',
    birthDate: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileImage: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');
        
        setCurrentUser(user);
        
        // Set email from auth
        setFormData(prev => ({
          ...prev,
          email: user.email || ''
        }));

        // Get profile data
        const { data, error } = await supabase
          .from('users')
          .select('username, birth_date, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setFormData(prev => ({
            ...prev,
            username: data.username || '',
            birthDate: data.birth_date || '',
            profileImage: data.avatar_url || '',
            password: '',
            confirmPassword: ''
          }));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showToast('Erro ao carregar dados do perfil', 'error');
      }
    };

    fetchUserData();
  }, []);

  const validateAge = (birthDate: string) => {
    if (!birthDate) return false;
    const date = parse(birthDate, 'yyyy-MM-dd', new Date());
    const age = differenceInYears(new Date(), date);
    return age >= 18;
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.username) {
      newErrors.username = 'Nome de usuário é obrigatório';
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
    } else if (!validateAge(formData.birthDate)) {
      newErrors.birthDate = 'Você precisa ter pelo menos 18 anos';
    }

    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        let hasUpdates = false;

        // Update auth email if changed
        if (formData.email !== currentUser?.email) {
          const { error: emailError } = await supabase.auth.updateUser({
            email: formData.email
          });
          if (emailError) throw emailError;
          hasUpdates = true;
        }

        // Update password if provided
        if (formData.password) {
          try {
            const { error: passwordError } = await supabase.auth.updateUser({
              password: formData.password
            });
            if (passwordError) {
              if (passwordError.message.includes('different from the old password') || 
                  passwordError.message.includes('same_password')) {
                showToast('A nova senha deve ser diferente da senha atual', 'error');
                return;
              }
              throw passwordError;
            }
            hasUpdates = true;
          } catch (error: any) {
            if (error.message.includes('same_password')) {
              showToast('A nova senha deve ser diferente da senha atual', 'error');
              return;
            }
            throw error;
          }
        }

        // Update profile data
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: currentUser?.id,
            username: formData.username,
            birth_date: formData.birthDate,
            avatar_url: formData.profileImage || null
          }, {
            onConflict: 'id'
          });

        if (profileError) throw profileError;
        hasUpdates = true;

        if (hasUpdates) {
          showToast('Perfil atualizado com sucesso!', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error: any) {
        console.error('Error updating profile:', error);
        showToast(
          error.message || 'Erro ao atualizar perfil. Tente novamente.',
          'error'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {toast && (
        <div
          className={`fixed top-4 right-4 flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Meu Perfil</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {formData.profileImage ? (
                  <img
                    src={formData.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-20 h-20 text-gray-400" />
                )}
              </div>
              <label
                htmlFor="profileImage"
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-5 h-5 text-gray-600" />
                <input
                  type="file"
                  id="profileImage"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({
                          ...prev,
                          profileImage: reader.result as string
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome de Usuário
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite seu nome de usuário"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.birthDate && (
                <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Atualizar Perfil</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}