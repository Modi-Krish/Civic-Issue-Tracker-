import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deptSlug = searchParams.get('dept_slug');
    const deptId = searchParams.get('dept_id');

    const todayIso = new Date().toISOString().split('T')[0];

    const { data: contracts, error } = await supabaseAdmin
      .from('contracts')
      .select('*, departments(slug, name)')
      .in('status', ['Active', 'ACTIVE'])
      .gte('end_date', todayIso);

    if (error || !contracts || contracts.length === 0) {
      return NextResponse.json({ contract: null });
    }

    // Match by department_id or department slug
    const matched = contracts.find(c => 
      (deptId && c.department_id === deptId) || 
      (deptSlug && c.departments?.slug === deptSlug) ||
      (deptSlug && c.departments?.name?.toLowerCase().includes(deptSlug.toLowerCase()))
    ) || contracts[0];

    return NextResponse.json({ contract: matched });
  } catch (err: any) {
    console.error("GET /api/contracts/active error:", err);
    return NextResponse.json({ contract: null });
  }
}
