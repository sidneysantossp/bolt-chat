import { supabase } from './supabase';

export interface UserRole {
  id: string;
  username: string | null;
  is_admin: boolean;
}

export async function getCurrentUser(): Promise<UserRole | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Primeiro, tente obter do localStorage
    const storedUserData = localStorage.getItem(`user_role_${user.id}`);
    if (storedUserData) {
      return JSON.parse(storedUserData);
    }

    // Se não estiver no localStorage, tente obter do Supabase
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        // Crie um usuário padrão com base no email
        const defaultUser: UserRole = {
          id: user.id,
          username: user.email?.split('@')[0] || 'Usuário',
          is_admin: false
        };
        
        // Salve no localStorage para uso futuro
        localStorage.setItem(`user_role_${user.id}`, JSON.stringify(defaultUser));
        return defaultUser;
      }

      // Salve no localStorage para uso futuro
      localStorage.setItem(`user_role_${user.id}`, JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      // Crie um usuário padrão com base no email
      const defaultUser: UserRole = {
        id: user.id,
        username: user.email?.split('@')[0] || 'Usuário',
        is_admin: false
      };
      
      // Salve no localStorage para uso futuro
      localStorage.setItem(`user_role_${user.id}`, JSON.stringify(defaultUser));
      return defaultUser;
    }
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}

export async function signIn(email: string, password: string) {
  try {
    console.log('Iniciando processo de login para:', email);
    
    // Para desenvolvimento - permitir login com usuário de teste
    if (email === 'teste@teste.com' && password === 'teste123') {
      console.log('Usando credenciais de teste para desenvolvimento');
      
      // Criar um ID de usuário fictício
      const testUserId = 'test-user-id-123';
      
      // Criar objeto de usuário de teste
      const userRole: UserRole = {
        id: testUserId,
        username: 'teste',
        is_admin: false
      };
      
      // Salvar no localStorage
      localStorage.setItem(`user_role_${testUserId}`, JSON.stringify(userRole));
      
      // Estrutura mais completa para simular a sessão autenticada
      const fakeSession = {
        currentSession: {
          access_token: 'test-token',
          expires_at: new Date().getTime() + 3600000, // 1 hora no futuro
          expires_in: 3600,
          refresh_token: 'test-refresh-token',
          token_type: 'bearer',
          user: {
            id: testUserId,
            email: email,
            app_metadata: { provider: 'email' },
            user_metadata: { username: 'teste' },
            aud: 'authenticated',
            created_at: new Date().toISOString()
          }
        },
        expiresAt: new Date().getTime() + 3600000
      };
      
      localStorage.setItem('supabase.auth.token', JSON.stringify(fakeSession));
      
      // Simular evento de alteração de autenticação
      window.dispatchEvent(new Event('supabase.auth.token-change'));
      
      console.log('Sessão de teste configurada com sucesso');
      
      return { user: { id: testUserId, email }, isAdmin: false };
    }
    
    // First sign in with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Erro de autenticação:', signInError);
      throw signInError;
    }
    
    if (!authData.user) {
      console.error('Nenhum dado de usuário retornado');
      throw new Error('No user data returned');
    }
    
    console.log('Usuário autenticado com sucesso, ID:', authData.user.id);

    // Verificar se é um email de admin (simplificado para teste)
    // Considerar admin se o email contiver a palavra "admin"
    const isAdmin = email.toLowerCase().includes('admin');
    console.log('Verificação de admin pelo email:', { email, isAdmin });
    
    // Criar objeto de usuário
    const userRole: UserRole = {
      id: authData.user.id,
      username: email.split('@')[0],
      is_admin: isAdmin
    };
    
    // Salvar no localStorage para garantir persistência entre sessões
    localStorage.setItem(`user_role_${authData.user.id}`, JSON.stringify(userRole));
    
    // Tentar salvar no Supabase, mas não falhar se der erro
    try {
      // Verificar se o usuário já existe
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, is_admin')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          console.log('Usuário não encontrado na tabela, criando novo registro');
          // Usuário não existe, tenta criar
          const { error: createError } = await supabase
            .from('users')
            .insert([{
              id: authData.user.id,
              username: email.split('@')[0],
              is_admin: isAdmin,
              status: 'active'
            }]);
            
          if (createError) {
            console.error('Erro ao criar usuário:', createError);
          }
        } else {
          console.error('Erro ao verificar usuário:', userError);
        }
      } else if (existingUser) {
        console.log('Usuário encontrado na tabela:', existingUser);
        // Atualizar o valor de is_admin com base no que está no banco de dados
        userRole.is_admin = existingUser.is_admin;
        localStorage.setItem(`user_role_${authData.user.id}`, JSON.stringify(userRole));
      }
    } catch (dbError) {
      console.error('Erro ao interagir com o banco de dados:', dbError);
    }
    
    console.log('Retornando resultado de login:', { user: authData.user, isAdmin: userRole.is_admin });
    return { user: authData.user, isAdmin: userRole.is_admin };
  } catch (error) {
    console.error('Erro no processo de login:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}