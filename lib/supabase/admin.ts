import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client using the Service Role Key.
 * This client bypasses Row Level Security (RLS) and is perfect for system operations,
 * background jobs, and webhook handlers.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL or Service Role Key is missing in environment variables.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
