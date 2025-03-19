import { User } from '@supabase/supabase-js';
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

    const { data: userData, error } = await supabase
      .from('users')
      .select('id, username, is_admin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user data:', error);
      return null;
    }

    return userData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function signIn(email: string, password: string) {
  try {
    // First sign in with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;
    if (!authData.user) throw new Error('No user data returned');

    // Check if user exists in our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, is_admin')
      .eq('id', authData.user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    // If user doesn't exist in our table, create them
    if (!userData) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            username: email.split('@')[0],
            is_admin: false,
          }
        ])
        .select('id, username, is_admin')
        .single();

      if (createError) throw createError;
      return { user: authData.user, isAdmin: false };
    }

    return { user: authData.user, isAdmin: userData.is_admin };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}