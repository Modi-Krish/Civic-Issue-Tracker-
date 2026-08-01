import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, description, scopeOfWork, tenderType, budget, emd, startDate, endDate, bidDeadline, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Tender ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scopeOfWork !== undefined) updateData.scope_of_work = scopeOfWork;
    if (tenderType !== undefined) updateData.tender_type = tenderType;
    if (budget !== undefined) updateData.estimated_budget = parseFloat(budget) || 0;
    if (emd !== undefined) updateData.emd_amount = parseFloat(emd) || 0;
    if (startDate !== undefined) updateData.contract_start_date = startDate || null;
    if (endDate !== undefined) updateData.contract_end_date = endDate || null;
    if (bidDeadline !== undefined) updateData.bid_submission_deadline = bidDeadline ? new Date(bidDeadline).toISOString() : null;
    if (status !== undefined) updateData.status = status;

    const { data: updatedTender, error } = await supabaseAdmin
      .from('tenders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tender:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tender: updatedTender });
  } catch (error: any) {
    console.error('API Error in /api/tenders/update:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
