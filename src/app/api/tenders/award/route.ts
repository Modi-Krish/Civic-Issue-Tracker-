import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAuditAction } from '@/lib/utils/audit';
import crypto from 'crypto';

function stringToUUID(idStr: string | null | undefined): string {
  if (!idStr) return '00000000-0000-4000-8000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idStr)) return idStr;

  const hex = crypto.createHash('md5').update(idStr).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenderId, bidId, companyId, departmentId, contractAmount } = body;

    if (!tenderId || !bidId || !companyId) {
      return NextResponse.json({ error: 'Tender ID, Bid ID, and Company ID are required' }, { status: 400 });
    }

    const validTenderId = stringToUUID(tenderId);
    const validBidId = stringToUUID(bidId);
    const validCompanyId = stringToUUID(companyId);

    // 1. Fetch Tender details
    const { data: tender, error: tenderErr } = await supabaseAdmin
      .from('tenders')
      .select('*')
      .or(`id.eq.${validTenderId},tender_number.eq.${tenderId}`)
      .maybeSingle();

    if (tenderErr || !tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    const targetDeptId = tender.department_id || (departmentId ? stringToUUID(departmentId) : null);

    // 2. Update Tender status to 'Awarded'
    await supabaseAdmin
      .from('tenders')
      .update({ status: 'Awarded', updated_at: new Date().toISOString() })
      .eq('id', tender.id);

    // 3. Update Bids: set winning bid to 'Selected', others to 'Rejected'
    await supabaseAdmin
      .from('tender_bids')
      .update({ status: 'Selected', updated_at: new Date().toISOString() })
      .eq('id', validBidId);

    await supabaseAdmin
      .from('tender_bids')
      .update({ status: 'Rejected', updated_at: new Date().toISOString() })
      .eq('tender_id', tender.id)
      .neq('id', validBidId);

    // 4. Calculate Contract Start and End dates
    const startDate = new Date();
    const endDate = tender.contract_end_date 
      ? new Date(tender.contract_end_date)
      : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());

    const startDateIso = startDate.toISOString().split('T')[0];
    const endDateIso = endDate.toISOString().split('T')[0];

    // 5. Create Contract row using Service Role Key (bypasses RLS)
    let contract: any = null;
    const { data: insertedContract, error: contractErr } = await supabaseAdmin
      .from('contracts')
      .insert({
        tender_id: tender.id,
        company_id: validCompanyId,
        department_id: targetDeptId,
        priority: 1,
        sla_tier: 'Standard',
        target_response_hours: 24,
        target_resolution_hours: 72,
        start_date: startDateIso,
        end_date: endDateIso,
        status: 'Active'
      })
      .select()
      .maybeSingle();

    if (contractErr) {
      // Fallback for database schema using UPPERCASE contract_status enum ('ACTIVE')
      const { data: fallbackContract, error: fallbackErr } = await supabaseAdmin
        .from('contracts')
        .insert({
          tender_id: tender.id,
          company_id: validCompanyId,
          department_id: targetDeptId,
          priority: 1,
          sla_tier: 'Standard',
          target_response_hours: 24,
          target_resolution_hours: 72,
          start_date: startDateIso,
          end_date: endDateIso,
          status: 'ACTIVE'
        })
        .select()
        .single();

      if (fallbackErr) {
        console.error('Error inserting contract:', fallbackErr);
        return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
      }
      contract = fallbackContract;
    } else {
      contract = insertedContract;
    }


    // 6. Auto-route pending issues for this department to the awarded company
    try {
      const { getAdminDb } = await import('@/lib/firebase/admin');
      const db = getAdminDb();
      if (db && targetDeptId) {
        // Search issues by department_id
        const pendingSnap = await db.collection('issues')
          .where('department_id', '==', targetDeptId)
          .where('status', '==', 'DEPARTMENT_ASSIGNED')
          .get();

        if (!pendingSnap.empty) {
          const batch = db.batch();
          pendingSnap.docs.forEach(doc => {
            batch.update(doc.ref, {
              company_id: companyId || validCompanyId,
              status: 'COMPANY_ASSIGNED',
              updated_at: new Date().toISOString()
            });

            // Log status update
            const logRef = db.collection('issue_status_logs').doc();
            batch.set(logRef, {
              issue_id: doc.id,
              to_status: 'COMPANY_ASSIGNED',
              changed_by: 'SYSTEM_TENDER_AWARD',
              comment: `Auto-routed to newly awarded Contractor (Contract #${contract.id.slice(0, 8)})`,
              created_at: new Date().toISOString()
            });
          });
          await batch.commit();
        }
      }
    } catch (routeErr) {
      console.warn('Auto-routing pending issues warning:', routeErr);
    }

    // 7. Log Audit Action
    await logAuditAction({
      entityType: 'contract',
      entityId: contract.id,
      action: 'AWARD_CONTRACT',
      actorId: validCompanyId,
      newState: { tender_id: tender.id, company_id: validCompanyId, bid_id: validBidId, amount: contractAmount }
    });

    return NextResponse.json({
      success: true,
      contract,
      message: 'Contract successfully awarded! Pending department issues automatically routed to contractor.'
    });
  } catch (error: any) {
    console.error('API Error in /api/tenders/award:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
