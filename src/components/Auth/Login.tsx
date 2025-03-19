import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Brain, AlertCircle } from 'lucide-react';
import { signIn } from '../../lib/auth';

export function Login() {
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
      console.log('Tentando fazer login com:', formData.email);
      const { isAdmin } = await signIn(formData.email, formData.password);
      console.log('Login bem-sucedido, isAdmin:', isAdmin);
      
      // Garantir que o redirecionamento aconteça mesmo se isAdmin for undefined
      if (isAdmin) {
        console.log('Redirecionando para /admin');
        navigate('/admin');
      } else {
        console.log('Redirecionando para /chat');
        navigate('/chat');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err instanceof Error 
          ? err.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos'
            : err.message
          : 'Erro ao fazer login'
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

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Entrar</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'Entrando...' : 'Entrar'}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-purple-600 hover:text-purple-800 font-medium">
            Registre-se
          </Link>
        </p>
      </div>
    </div>
  );
}