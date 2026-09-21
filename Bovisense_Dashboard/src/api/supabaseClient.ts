import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// In demo mode, the application uses the local mock API and does not need Supabase.
if (!DEMO_MODE && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase: SupabaseClient =
  DEMO_MODE
    ? (null as unknown as SupabaseClient)
    : createClient(supabaseUrl!, supabaseAnonKey!);
