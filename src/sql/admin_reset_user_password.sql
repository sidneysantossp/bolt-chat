-- Esta é uma função SQL que deve ser adicionada ao seu banco de dados Supabase
-- Ela permite resetar a senha de um usuário de forma segura através de uma chamada RPC

CREATE OR REPLACE FUNCTION admin_reset_user_password(user_id UUID, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com as permissões do criador da função
AS $$
DECLARE
  curr_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Verificar se o usuário atual é um administrador
  curr_user_id := auth.uid();
  
  SELECT is_admin INTO is_admin FROM public.users WHERE id = curr_user_id;
  
  IF is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Apenas administradores podem redefinir senhas';
  END IF;
  
  -- Resetar a senha usando a função interna do Supabase
  PERFORM auth.update_user(user_id, ARRAY[new_password]::TEXT[]);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
