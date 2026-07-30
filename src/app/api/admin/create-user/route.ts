import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const adminSupabase = createAdminClient();

    // Verify the caller's token
    const { data: { user: caller }, error: authError } = await adminSupabase.auth.getUser(token);
    if (authError || !caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the caller is an admin
    const { data: callerProfile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'super_admin' && callerProfile?.role !== 'department_admin' && callerProfile?.role !== 'company_admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, password, full_name, role, department_id } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the user
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        department_id: department_id || null,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: newUser.user }, { status: 200 });

  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
