/*
  Single browser Supabase client.
  Uses the anon key + RLS; never put the service role key here.
*/

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth and data will fail until .env.local is set.',
  )
}

// createClient throws if the key is empty — that blanked the whole app.
// Use a placeholder only so the module can load; auth/data calls will fail until env is set.
export const supabase = createClient(
  url || 'http://127.0.0.1',
  anonKey || 'public-anon-key',
)
