import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Ajuda no diagnóstico durante o desenvolvimento sem quebrar o build.
  console.warn(
    'Supabase: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas. As consultas ao banco não funcionarão até configurá-las.',
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
