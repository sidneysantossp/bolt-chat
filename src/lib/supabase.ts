import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Conectando ao Supabase com URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Verificar se a tabela 'users' existe
async function initializeDatabase() {
  try {
    console.log('Verificando estrutura do banco de dados...');
    
    // Verificar se a tabela users existe
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Erro ao verificar tabela users:', error);
      
      // Se a tabela não existir, tente criá-la
      if (error.message.includes('relation "users" does not exist')) {
        console.log('Tabela users não existe, tentando criar...');
        // Não podemos criar tabelas via API do Supabase, então apenas logamos o erro
        console.error('É necessário criar a tabela users no painel do Supabase com a seguinte estrutura:');
        console.error(`
          CREATE TABLE users (
            id UUID PRIMARY KEY REFERENCES auth.users(id),
            username TEXT,
            is_admin BOOLEAN DEFAULT FALSE,
            status TEXT DEFAULT 'active',
            birth_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
      }
    } else {
      console.log('Tabela users verificada com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err);
  }
}

// Inicializar o banco de dados
initializeDatabase();