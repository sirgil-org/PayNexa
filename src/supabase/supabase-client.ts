import { type SupabaseClient, createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null