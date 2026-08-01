import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let patternObj: any = null;
    let mapsList: any[] = [];

    try {
      const { data: pattern, error } = await supabaseAdmin
        .from('recurring_patterns')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && pattern) {
        patternObj = pattern;
        const { data: maps } = await supabaseAdmin
          .from('pattern_issue_map')
          .select('issue_id, occurred_at')
          .eq('pattern_id', id)
          .order('occurred_at', { ascending: true });
        mapsList = maps || [];
      } else {
        throw new Error('Pattern not in Supabase');
      }
    } catch {
      // Firestore Fallback
      const { doc, getDoc } = await import('firebase/firestore');
      const { db: fDb } = await import('@/lib/firebase');

      const pDoc = await getDoc(doc(fDb, 'recurring_patterns', id));
      if (pDoc.exists()) {
        patternObj = { id: pDoc.id, ...pDoc.data() };
      }
    }

    if (!patternObj) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    // Fetch matched issue documents from Firestore
    let issuesData: any[] = [];
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');

    const issuesSnap = await getDocs(collection(db, 'issues'));
    issuesSnap.docs.forEach(doc => {
      const d = doc.data();
      const catMatch = (d.issue_type || d.category_id || '').toLowerCase() === (patternObj.category_id || '').toLowerCase();
      if (catMatch) {
        issuesData.push({ id: doc.id, ...d });
      }
    });

    return NextResponse.json({
      pattern: patternObj,
      mappedIssues: issuesData,
      timelineEvents: mapsList
    });
  } catch (err: any) {
    console.error('GET /api/analytics/patterns/[id] error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, recommendationText } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const payload: any = {
      status,
      updated_at: new Date().toISOString()
    };
    if (recommendationText) payload.recommendation_text = recommendationText;

    // 1. Update Firestore
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db: fDb } = await import('@/lib/firebase');
      await updateDoc(doc(fDb, 'recurring_patterns', id), payload);
    } catch (fsErr) {
      console.warn('Firestore update warning:', fsErr);
    }

    // 2. Update Supabase
    try {
      await supabaseAdmin.from('recurring_patterns').update(payload).eq('id', id);
    } catch (sErr) {
      // Ignore Supabase missing table error
    }

    return NextResponse.json({
      success: true,
      patternId: id,
      status
    });
  } catch (err: any) {
    console.error('PATCH /api/analytics/patterns/[id] error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update pattern' }, { status: 500 });
  }
}
