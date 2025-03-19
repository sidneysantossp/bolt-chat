import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - Estado atual:', { 
    isAuthenticated, 
    isLoading, 
    userRole,
    requireAdmin,
    path: location.pathname
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Usuário não autenticado, redirecionando para /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin) {
    console.log('Rota requer admin, verificando permissões:', { 
      is_admin: userRole?.is_admin 
    });
    
    if (!userRole?.is_admin) {
      console.log('Usuário não é admin, redirecionando para /chat');
      return <Navigate to="/chat" replace />;
    }
  }

  console.log('Renderizando conteúdo protegido');
  return <>{children}</>;
}
