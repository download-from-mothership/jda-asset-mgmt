/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials are missing. Please check your environment variables.');
}

// Singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

// Create or get the Supabase client instance
export const supabase = (() => {
  if (!supabaseInstance) {
    console.log('Initializing Supabase client with:', {
      url: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    });
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    // Initialize Edge Functions
    supabaseInstance.functions.setAuth(supabaseAnonKey);
    supabaseInstance.functions.setAuth(supabaseAnonKey);
  }
  return supabaseInstance;
})();

// Test the connection and log any errors
supabase.auth.getSession().then(({ data: { session }, error }) => {
  if (error) {
    console.error('Error initializing Supabase client:', error.message);
  } else {
    console.log('Supabase client initialized successfully', {
      hasSession: !!session,
      user: session?.user?.email
    });
  }
});

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