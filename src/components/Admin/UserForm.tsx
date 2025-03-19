import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Camera, Trash2, Key } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserFormProps {
  user?: {
    id: string;
    username: string;
    email: string;
    birth_date: string | null;
    is_admin: boolean;
    status: 'active' | 'suspended' | 'banned' | 'deleted';
    avatar_url?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  isAdmin: boolean;
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  avatarUrl: string | null;
  avatarFile: File | null;
  forcePasswordChange: boolean;
}

export function UserForm({ user, onClose, onSuccess, mode }: UserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    birthDate: user?.birth_date || '',
    isAdmin: user?.is_admin || false,
    status: user?.status || 'active',
    avatarUrl: user?.avatar_url || null,
    avatarFile: null,
    forcePasswordChange: false
  });

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData(prev => ({
        ...prev,
        email: user.email
      }));
    }
  }, [user, mode]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({
          ...prev,
          avatar: 'Image size must be less than 5MB'
        }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setFormData(prev => ({
        ...prev,
        avatarFile: file
      }));
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setFormData(prev => ({
      ...prev,
      avatarUrl: null,
      avatarFile: null
    }));
  };

  const uploadAvatar = async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    // Validar email apenas no modo de criação, já que no modo de edição o campo está desabilitado
    if (mode === 'create') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (mode === 'create') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      // Modo edição - validar apenas se uma senha foi fornecida
      if (formData.password) {
        if (formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.birthDate = 'User must be at least 18 years old';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Confirmação para reset de senha no modo de edição
    if (mode === 'edit' && formData.password && 
        !window.confirm(`Você está prestes a alterar a senha do usuário ${formData.username}.\nDeseja continuar?`)) {
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = formData.avatarUrl;

      if (formData.avatarFile) {
        const userId = user?.id || 'temp';
        avatarUrl = await uploadAvatar(userId, formData.avatarFile);
      }

      if (mode === 'create') {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No user data returned');

        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              username: formData.username,
              email: formData.email,
              birth_date: formData.birthDate || null,
              is_admin: formData.isAdmin,
              status: formData.status,
              avatar_url: avatarUrl
            }
          ]);

        if (profileError) throw profileError;
      } else if (user) {
        // Update user profile
        const { error: profileError } = await supabase
          .from('users')
          .update({
            username: formData.username,
            birth_date: formData.birthDate || null,
            is_admin: formData.isAdmin,
            status: formData.status,
            avatar_url: avatarUrl
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // Se não estamos alterando a senha, mas estamos forçando a mudança
        if (!formData.password && formData.forcePasswordChange) {
          // Atualizar apenas na tabela users
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({
              force_password_change: true,
              last_password_reset: new Date().toISOString()
            })
            .eq('id', user.id);
            
          if (userUpdateError) {
            console.error('Erro ao atualizar status de senha:', userUpdateError);
          }
        }

        // Update password if provided
        if (formData.password) {
          try {
            // Solução alternativa: Como não podemos usar a função admin diretamente
            // e a função RPC não está disponível, vamos criar um token para o usuário atual
            // e tentar usar a API de atualização de senha
            
            // Primeiro, vamos obter o token da sessão atual
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
            }
            
            // Salvar dados temporários no localStorage para indicar que a senha deve ser atualizada
            localStorage.setItem('password_reset_data', JSON.stringify({
              userId: user.id,
              username: formData.username,
              newPassword: formData.password,
              forceChange: formData.forcePasswordChange,
              timestamp: new Date().toISOString()
            }));
            
            // Atualizar apenas o registro na tabela de usuários
            const { error: userUpdateError } = await supabase
              .from('users')
              .update({
                force_password_change: formData.forcePasswordChange,
                last_password_reset: new Date().toISOString()
              })
              .eq('id', user.id);
              
            if (userUpdateError) {
              console.error('Erro ao atualizar status de senha:', userUpdateError);
            }
            
            // Informar ao usuário sobre como proceder para completar a redefinição de senha
            alert(`Para completar a redefinição de senha para ${formData.username}, você precisará:
1. Acessar o painel do Supabase
2. Ir para Authentication > Users
3. Encontrar o usuário "${formData.username}" (ID: ${user.id})
4. Usar a opção "Reset password" para definir a nova senha manualmente

Alternativamente, um desenvolvedor com acesso ao banco de dados pode executar:
UPDATE auth.users SET encrypted_password = encrypt(gen_salt('bf') || '${formData.password}', '...');

As outras informações do usuário foram atualizadas com sucesso.`);

            console.log('As informações do usuário foram atualizadas, mas a senha precisa ser alterada manualmente.');
          } catch (error: any) {
            console.error('Erro ao atualizar senha:', error);
            throw new Error('Não foi possível atualizar a senha do usuário: ' + (error.message || 'Erro desconhecido'));
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      setErrors({
        submit: error.message || 'An error occurred while saving the user'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-semibold mb-6">
          {mode === 'create' ? 'Create New User' : 'Edit User'}
        </h2>

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-4xl font-medium">
                    {formData.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 flex space-x-2">
                <label className="p-2 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="w-5 h-5 text-gray-600" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {errors.avatar && (
            <p className="text-sm text-red-600 text-center">{errors.avatar}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              {mode === 'edit' ? (
                // No modo de edição, mostrar o email como texto estático com aparência de input
                <div className="w-full px-4 py-2 rounded-lg border bg-gray-50 text-gray-700">
                  {formData.email}
                </div>
              ) : (
                // No modo de criação, permitir edição do email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="email@exemplo.com"
                />
              )}
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
              {mode === 'edit' && (
                <p className="mt-1 text-xs text-gray-500">O email do usuário não pode ser alterado.</p>
              )}
            </div>

            {(mode === 'create' || formData.password) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Minimum 6 characters"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Re-enter password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </>
            )}

            {mode === 'edit' && (
              <div className="md:col-span-2 border p-4 rounded-lg bg-orange-50 border-orange-100">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-medium text-gray-800">Reset User Password</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Leave blank to keep current password"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Re-enter new password"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 p-2 bg-white rounded border border-orange-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Observações:</span>
                    <ul className="mt-1 list-disc list-inside">
                      <li>Se ambos os campos forem deixados vazios, a senha atual do usuário será mantida.</li>
                      <li>A senha deve ter pelo menos 6 caracteres.</li>
                      <li>O usuário não será notificado por email sobre essa alteração.</li>
                    </ul>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.forcePasswordChange}
                    onChange={(e) => setFormData(prev => ({ ...prev, forcePasswordChange: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Forçar usuário a alterar senha no próximo login
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birth Date
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {errors.birthDate && (
                <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  status: e.target.value as 'active' | 'suspended' | 'banned' | 'deleted'
                }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isAdmin}
                  onChange={(e) => setFormData(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Grant administrator privileges
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}