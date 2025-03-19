import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, AlertCircle } from 'lucide-react';
import { signIn } from '../../lib/auth';

export function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { isAdmin } = await signIn(formData.email, formData.password);
      
      if (!isAdmin) {
        setError('Acesso negado. Esta área é restrita para administradores.');
        return;
      }

      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err instanceof Error 
          ? err.message === 'Invalid login credentials'
            ? 'Credenciais inválidas'
            : err.message
          : 'Erro ao fazer login'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <Shield className="w-12 h-12 text-purple-400" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">Admin Dashboard</span>
            <span className="text-sm text-purple-400">Área Restrita</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center text-red-200">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Email Administrativo
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-400 
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="admin@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-400 
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white rounded-lg 
                     hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     border border-purple-500"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'Autenticando...' : 'Acessar Dashboard'}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Esta é uma área restrita apenas para administradores do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}