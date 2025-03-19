import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Brain, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
}

interface ValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  birthDate?: string;
}

export function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Nome de usuário é obrigatório';
      isValid = false;
    } else if (formData.username.length < 3) {
      newErrors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
      isValid = false;
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      isValid = false;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
      isValid = false;
    }

    // Birth date validation
    if (!formData.birthDate) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
      isValid = false;
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.birthDate = 'Você deve ter pelo menos 18 anos';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // First, sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user data returned');

      // Then, create the user profile in our users table
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            username: formData.username,
            birth_date: formData.birthDate,
            is_admin: false,
            status: 'active',
            created_at: new Date().toISOString(),
          }
        ]);

      if (profileError) throw profileError;

      setSuccess('Registro realizado com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Registro realizado com sucesso! Faça login para continuar.' }
        });
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err instanceof Error 
          ? err.message
          : 'Ocorreu um erro durante o registro'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <Brain className="w-10 h-10 text-purple-600" />
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-gray-800">Bate Papo da Mente</span>
            <span className="text-sm text-purple-600">Seu espaço de acolhimento</span>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Criar Conta</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-center text-green-700">
            <Check className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome de Usuário
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.username ? 'border-red-300' : ''
              }`}
              placeholder="Seu nome de usuário"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
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
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.email ? 'border-red-300' : ''
              }`}
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.birthDate ? 'border-red-300' : ''
              }`}
            />
            {errors.birthDate && (
              <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.password ? 'border-red-300' : ''
              }`}
              placeholder="••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Senha
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.confirmPassword ? 'border-red-300' : ''
              }`}
              placeholder="••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-5 h-5" />
            <span>{loading ? 'Registrando...' : 'Criar Conta'}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-purple-600 hover:text-purple-800 font-medium">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}