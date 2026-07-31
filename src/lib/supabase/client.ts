'use client';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let browserClient: ReturnType<typeof createSupabaseClient> | undefined;

export function createClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new client
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Browser: use singleton
  if (!browserClient) {
    browserClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
