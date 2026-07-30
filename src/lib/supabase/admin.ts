import { createClient } from '@supabase/supabase-js';

// Creates a Supabase client with the Service Role Key
// WARNING: This client bypasses Row Level Security (RLS).
// ONLY use this in trusted server environments/actions after verifying caller permissions.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  );
}
