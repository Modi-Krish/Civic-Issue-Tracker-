import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

export async function logAuditAction({
  entityType,
  entityId,
  action,
  actorId,
  previousState = null,
  newState = null,
}: {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
}) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      actor_id: actorId,
      previous_state: previousState,
      new_state: newState,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Audit Log Insertion Error:', error);
    }
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
