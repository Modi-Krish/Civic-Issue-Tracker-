/**
 * Client-side admin actions for Capacitor build.
 * NOTE: The admin client (service role key) CANNOT be used on the client side
 * as it would expose the service role key. These actions rely on RLS policies
 * being properly configured to allow super_admin/department_admin roles
 * to perform these operations via the anon key.
 * 
 * For operations that truly need the service role key (like updating auth metadata),
 * you should create a Supabase Edge Function and call it from here.
 */
import { createClient } from '@/lib/supabase/client';

export async function changeUserRole(targetUserId: string, newRole: string) {
  const supabase = createClient();
  
  // 1. Verify Caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (callerProfile?.role !== 'super_admin') {
    return { error: 'Unauthorized. Only Super Admins can assign roles.' };
  }

  // 2. Update the target user's role in profiles table
  // Note: This relies on RLS allowing super_admin to update other profiles
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (updateError) {
    console.error("Error updating user role:", updateError);
    return { error: updateError.message };
  }

  return { success: true };
}

export async function reviewUser(targetUserId: string, action: 'APPROVE' | 'REJECT') {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single();

  // Fetch target user
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role, department_id, account_status')
    .eq('id', targetUserId)
    .single();

  if (!targetProfile || targetProfile.account_status !== 'PENDING') {
    return { error: 'User not found or not pending approval' };
  }

  // Permission Check
  if (targetProfile.role === 'department_admin') {
    if (callerProfile?.role !== 'super_admin') {
      return { error: 'Only Super Admins can approve Department Admins' };
    }
  } else if (targetProfile.role === 'employee') {
    if (callerProfile?.role !== 'department_admin' && callerProfile?.role !== 'super_admin') {
      return { error: 'Only Department Admins or Super Admins can approve employees' };
    }
    if (callerProfile?.role === 'department_admin' && callerProfile.department_id !== targetProfile.department_id) {
      return { error: 'You can only approve employees in your own department' };
    }
  } else {
    return { error: 'Role does not require approval' };
  }

  // Process Action
  if (action === 'APPROVE') {
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: 'APPROVED' })
      .eq('id', targetUserId);
    if (error) return { error: error.message };
  } else if (action === 'REJECT') {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'citizen', account_status: 'APPROVED' })
      .eq('id', targetUserId);
    if (error) return { error: error.message };
  }

  return { success: true };
}
