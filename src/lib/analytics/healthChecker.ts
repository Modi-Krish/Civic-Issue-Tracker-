import { createClient } from '@supabase/supabase-js';

export interface HealthStatus {
  supabaseReachable:      boolean;
  lastSuccessfulRunAt:    Date | null;
  isStale:                boolean;       // true if last run > 36 hours ago
  staleSinceHours:        number | null;
  lastRunStatus:          string;
  lastRunError:           string | null;
}

export async function checkSystemHealth(): Promise<HealthStatus> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let supabaseReachable = false;
  let lastSuccessfulRunAt: Date | null = null;
  let lastRunStatus = 'unknown';
  let lastRunError: string | null = null;

  try {
    const { data, error } = await supabase
      .from('analytics_metadata')
      .select('last_successful_run_at, last_run_status, last_run_error')
      .single();

    if (!error) {
      supabaseReachable = true;
      lastSuccessfulRunAt = data?.last_successful_run_at
        ? new Date(data.last_successful_run_at)
        : null;
      lastRunStatus = data?.last_run_status ?? 'unknown';
      lastRunError  = data?.last_run_error ?? null;
    }
  } catch {
    supabaseReachable = false;
  }

  const STALE_THRESHOLD_MS = 36 * 60 * 60 * 1000; // 36 hours
  const staleSinceMs = lastSuccessfulRunAt
    ? Date.now() - lastSuccessfulRunAt.getTime()
    : null;
  const isStale = staleSinceMs !== null && staleSinceMs > STALE_THRESHOLD_MS;
  const staleSinceHours = staleSinceMs !== null
    ? Math.floor(staleSinceMs / (1000 * 60 * 60))
    : null;

  return { supabaseReachable, lastSuccessfulRunAt, isStale, staleSinceHours, lastRunStatus, lastRunError };
}
