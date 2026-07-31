/**
 * Client-side auth actions for Capacitor build.
 * Replaces server-side auth.ts — uses browser Supabase client
 * and returns route strings instead of calling redirect().
 */
import { createClient } from '@/lib/supabase/client';

function getRedirectRoute(role: string): string {
  if (role === 'super_admin') return '/admin';
  if (role === 'department_admin') return '/department';
  if (role === 'employee') return '/tasks';
  if (role === 'government_officer') return '/government';
  if (role === 'company_admin') return '/company-admin';
  if (role === 'company_employee') return '/company-employee';
  return '/dashboard';
}

export async function signUp(formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = (formData.get('full_name') as string)?.trim();

  // SECURITY FIX: Hardcode role to 'citizen' to prevent privilege escalation.
  // Department ID is also ignored for public signups.
  const role = 'citizen';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        department_id: null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, redirectTo: getRedirectRoute(role) };
}

export async function signIn(formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  let role = data.user?.user_metadata?.role;

  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role) {
      role = profile.role;
    }
  }

  return { success: true, redirectTo: getRedirectRoute(role) };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return { success: true, redirectTo: '/login' };
}

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const fullName = (formData.get('full_name') as string)?.trim();

  if (!fullName) return { error: 'Name is required' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Update Auth Metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName }
  });

  if (authError) return { error: authError.message };

  // Update Profiles table
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (dbError) return { error: dbError.message };

  return { success: true };
}

export async function quickLogin(role: string) {
  const supabase = createClient();
  const email = `${role}@test.com`;
  const password = process.env.NEXT_PUBLIC_TEST_PASSWORD || 'Password123!';

  let { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // If sign in fails, try to sign up
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `Test ${role.replace('_', ' ')}`,
          role: role,
        }
      }
    });

    if (signUpError) return { error: signUpError.message };

    // Sign in after sign up
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { error: signInError.message };
  }

  // HOTFIX: Force update the profiles table to the correct role for this test user.
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    await supabase.from('profiles').update({ role, account_status: 'APPROVED' }).eq('id', userData.user.id);
  }

  return { success: true, redirectTo: getRedirectRoute(role) };
}
