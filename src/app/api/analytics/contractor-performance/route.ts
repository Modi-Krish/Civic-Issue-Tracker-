import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    let queryBuilder = supabaseAdmin
      .from('recurring_patterns')
      .select('*')
      .not('company_id', 'is', null);

    if (companyId) {
      queryBuilder = queryBuilder.eq('company_id', companyId);
    }

    const { data: patterns, error } = await queryBuilder;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group repeat failures by company_id
    const companyMap: Record<string, { company_id: string; patternCount: number; criticalCount: number; avgRepeatFailureRate: number; totalRepeatFailures: number }> = {};

    (patterns || []).forEach(p => {
      const cid = p.company_id;
      if (!companyMap[cid]) {
        companyMap[cid] = { company_id: cid, patternCount: 0, criticalCount: 0, avgRepeatFailureRate: 0, totalRepeatFailures: 0 };
      }
      companyMap[cid].patternCount += 1;
      if (p.severity_level === 'CRITICAL' || p.severity_level === 'HIGH') {
        companyMap[cid].criticalCount += 1;
      }
      companyMap[cid].totalRepeatFailures += p.repeat_failure_rate || 0;
    });

    const contractorPerformance = Object.values(companyMap).map(c => ({
      ...c,
      avgRepeatFailureRate: c.patternCount > 0 ? Math.round((c.totalRepeatFailures / c.patternCount) * 10) / 10 : 0
    }));

    return NextResponse.json({
      contractorPerformance,
      rawPatterns: patterns || []
    });
  } catch (err: any) {
    console.error('GET /api/analytics/contractor-performance error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
