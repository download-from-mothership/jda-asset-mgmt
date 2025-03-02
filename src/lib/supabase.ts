/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import { type Provider } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials are missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth functions
export const signIn = async (email: string, password: string) => {
  console.log("signIn function called with email:", email);
  
  try {
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log("Supabase sign-in response:", {
      session: response.data?.session ? "Session exists" : "No session",
      user: response.data?.user ? "User exists" : "No user",
      error: response.error ? response.error.message : "No error"
    });
    
    return response;
  } catch (error) {
    console.error("Error in signIn function:", error);
    return { 
      data: { user: null, session: null },
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    };
  }
};

export const signUp = async (email: string, password: string, userData?: Record<string, any>) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const signInWithProvider = async (provider: Provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
  });
  return { data, error };
};

// Helper functions for database operations
export const fetchData = async (table: string, columns = '*') => {
  const { data, error } = await supabase
    .from(table)
    .select(columns);
  
  if (error) throw error;
  return data;
};

export const insertData = async (table: string, data: any) => {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select();
  
  if (error) throw error;
  return result;
};

export const updateData = async (table: string, id: number, data: any) => {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return result;
};

export const deleteData = async (table: string, id: number) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};