import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentUser, UserRole } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  isLoading: true,
  isAuthenticated: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for active session on mount
    const checkSession = async () => {
      try {
        console.log('Verificando sessão ativa...');
        
        // Verificar se existe um token de teste no localStorage
        const testToken = localStorage.getItem('supabase.auth.token');
        if (testToken) {
          try {
            const parsedToken = JSON.parse(testToken);
            if (parsedToken.currentSession?.user?.id === 'test-user-id-123') {
              console.log('Sessão de teste encontrada');
              // Definir usuário de teste
              const testUser = parsedToken.currentSession.user;
              setUser(testUser as User);
              
              // Obter papel do usuário de teste
              const storedUserData = localStorage.getItem(`user_role_${testUser.id}`);
              if (storedUserData) {
                const parsedUserRole = JSON.parse(storedUserData) as UserRole;
                console.log('Dados do usuário de teste encontrados:', parsedUserRole);
                setUserRole(parsedUserRole);
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error('Erro ao analisar token de teste:', e);
          }
        }
        
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          console.log('Sessão ativa encontrada para o usuário:', data.session.user.email);
          setUser(data.session.user);
          
          // Tentar obter o papel do usuário do localStorage primeiro
          const storedUserData = localStorage.getItem(`user_role_${data.session.user.id}`);
          if (storedUserData) {
            const parsedUserRole = JSON.parse(storedUserData) as UserRole;
            console.log('Dados do usuário encontrados no localStorage:', parsedUserRole);
            setUserRole(parsedUserRole);
          } else {
            // Se não estiver no localStorage, buscar do banco de dados
            console.log('Buscando dados do usuário do banco de dados...');
            const userRoleData = await getCurrentUser();
            console.log('Dados do usuário obtidos:', userRoleData);
            setUserRole(userRoleData);
          }
        } else {
          console.log('Nenhuma sessão ativa encontrada');
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setUser(null);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Mudança de estado de autenticação:', event);
        
        if (session?.user) {
          console.log('Usuário autenticado:', session.user.email);
          setUser(session.user);
          
          // Tentar obter o papel do usuário do localStorage primeiro
          const storedUserData = localStorage.getItem(`user_role_${session.user.id}`);
          if (storedUserData) {
            const parsedUserRole = JSON.parse(storedUserData) as UserRole;
            console.log('Dados do usuário encontrados no localStorage:', parsedUserRole);
            setUserRole(parsedUserRole);
          } else {
            // Se não estiver no localStorage, buscar do banco de dados
            console.log('Buscando dados do usuário do banco de dados...');
            const userRoleData = await getCurrentUser();
            console.log('Dados do usuário obtidos:', userRoleData);
            setUserRole(userRoleData);
          }
        } else {
          console.log('Usuário desconectado');
          setUser(null);
          setUserRole(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userRole,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
