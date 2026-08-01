import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ACTIVE';
    const severity = searchParams.get('severity');

    let patternsList: any[] = [];
    let unreadAlertsCount = 0;

    try {
      let queryBuilder = supabaseAdmin
        .from('recurring_patterns')
        .select('*')
        .order('risk_score', { ascending: false })
        .order('predicted_next_at', { ascending: true });

      if (status !== 'ALL') {
        queryBuilder = queryBuilder.eq('status', status);
      }
      if (severity) {
        queryBuilder = queryBuilder.eq('severity_level', severity);
      }

      const { data: patterns, error } = await queryBuilder;
      if (!error && patterns) {
        patternsList = patterns;

        const { count } = await supabaseAdmin
          .from('recurring_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'UNREAD');
        unreadAlertsCount = count || 0;
      } else {
        throw new Error(error?.message || 'Supabase query failed');
      }
    } catch {
      // Firestore Fallback
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db: fDb } = await import('@/lib/firebase');

      const fsQ = status !== 'ALL'
        ? query(collection(fDb, 'recurring_patterns'), where('status', '==', status))
        : query(collection(fDb, 'recurring_patterns'));

      const fsSnap = await getDocs(fsQ);
      patternsList = fsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sort by risk_score DESC
      patternsList.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

      const alertsSnap = await getDocs(query(collection(fDb, 'recurring_alerts'), where('status', '==', 'UNREAD')));
      unreadAlertsCount = alertsSnap.size;
    }

    return NextResponse.json({
      patterns: patternsList,
      unreadAlertsCount
    });
  } catch (err: any) {
    console.error('GET /api/analytics/patterns error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch patterns' }, { status: 500 });
  }
}
