import { Brain, LogOut, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/auth';

export function Navbar() {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b shadow-sm z-50">
      <div className="h-full flex items-center justify-between px-6">
        <Link to="/" className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-gray-800">Bate Papo da Mente</span>
            <span className="text-xs text-purple-600 -mt-1">Seu espaço de acolhimento</span>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          ) : isAuthenticated ? (
            <div></div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link 
                to="/login" 
                className="px-4 py-1.5 text-sm text-gray-700 hover:text-purple-600 transition-colors"
              >
                Entrar
              </Link>
              <Link 
                to="/register" 
                className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
              >
                Registrar
              </Link>
              <Link 
                to="/admin-login" 
                className="px-4 py-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors"
              >
                Admin
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}