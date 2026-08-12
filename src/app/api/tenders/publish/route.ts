import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { departmentId, title, description, scopeOfWork, tenderType, budget, emd, startDate, endDate, bidDeadline } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
    
    // Initialize admin client with service role key to bypass RLS restrictions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let targetDeptId: string | null = null;

    const formatDeptName = (slug: string) => {
      const names: Record<string, string> = {
        electricity: 'Electricity & Power Supply Department',
        water: 'Water Supply & Sewerage Board',
        roads: 'Roads & Transport Infrastructure',
        sanitation: 'Public Sanitation & Waste Management',
        drainage: 'Stormwater & Drainage Department',
        health: 'Public Health & Safety Department',
        city_command_centre: 'City Command Centre',
      };
      const clean = slug.toLowerCase();
      if (names[clean]) return names[clean];
      return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' ') + ' Department';
    };

    // 1. Resolve department by slug
    if (departmentId) {
      const { data: bySlug } = await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('slug', String(departmentId).toLowerCase())
        .maybeSingle();
      if (bySlug?.id) targetDeptId = bySlug.id;
    }

    // 2. Resolve department by UUID if departmentId is UUID
    if (!targetDeptId && departmentId) {
      const { data: byId } = await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('id', departmentId)
        .maybeSingle();
      if (byId?.id) targetDeptId = byId.id;
    }

    // 3. Auto-create department record for specified departmentId slug if not exists
    if (!targetDeptId && departmentId) {
      const newDeptId = uuidv4();
      const slugClean = String(departmentId).toLowerCase();
      const { data: createdDept } = await supabaseAdmin
        .from('departments')
        .upsert({
          id: newDeptId,
          name: formatDeptName(slugClean),
          slug: slugClean,
          management_mode: 'TENDER'
        }, { onConflict: 'slug' })
        .select('id')
        .single();

      if (createdDept?.id) targetDeptId = createdDept.id;
    }

    // 4. Fallback: query any department
    if (!targetDeptId) {
      const { data: anyDept } = await supabaseAdmin
        .from('departments')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (anyDept?.id) targetDeptId = anyDept.id;
    }

    // 5. Ultimate Fallback: auto-create default department record
    if (!targetDeptId) {
      const newDeptId = uuidv4();
      const { data: createdDept } = await supabaseAdmin
        .from('departments')
        .upsert({
          id: newDeptId,
          name: 'Electricity Department',
          slug: 'electricity',
          management_mode: 'TENDER'
        }, { onConflict: 'slug' })
        .select('id')
        .single();

      if (createdDept?.id) targetDeptId = createdDept.id;
    }

    if (!targetDeptId) {
      return NextResponse.json({ error: 'Failed to resolve department linkage.' }, { status: 400 });
    }

    // Insert Tender
    const tender_number = `TND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: tender, error: tenderError } = await supabaseAdmin
      .from('tenders')
      .insert({
        id: uuidv4(),
        tender_number,
        department_id: targetDeptId,
        title,
        description,
        scope_of_work: scopeOfWork,
        tender_type: tenderType || 'Open Tender',
        estimated_budget: parseFloat(budget) || 0,
        emd_amount: parseFloat(emd) || 0,
        contract_start_date: startDate || null,
        contract_end_date: endDate || null,
        bid_submission_deadline: bidDeadline ? new Date(bidDeadline).toISOString() : new Date().toISOString(),
        status: 'Published'
      })
      .select()
      .single();

    if (tenderError) {
      console.error('Error inserting tender via API:', tenderError);
      return NextResponse.json({ error: tenderError.message }, { status: 500 });
    }

    // Write audit log for tender publication
    try {
      const { logAuditAction } = await import('@/lib/utils/audit');
      await logAuditAction({
        entityType: 'tender',
        entityId: tender.id,
        action: 'PUBLISH_TENDER',
        actorId: targetDeptId,
        newState: tender,
      });
    } catch (auditErr) {
      console.error('Failed to log tender publication audit:', auditErr);
    }

    return NextResponse.json({ success: true, tender });
  } catch (error: any) {

    console.error('API Error in /api/tenders/publish:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
