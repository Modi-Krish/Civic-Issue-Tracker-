import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAuditAction } from '@/lib/utils/audit';
import { stringToUUID } from '@/lib/utils/uuid';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenderId, companyId, userId, bidAmount, completionDays, technicalProposalUrl, financialProposalUrl } = body;

    if (!tenderId) {
      return NextResponse.json({ error: 'Tender ID is required' }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const numericBidAmount = parseFloat(bidAmount);
    if (isNaN(numericBidAmount) || numericBidAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive bid amount is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const validTenderId = stringToUUID(tenderId);
    const validCompanyId = stringToUUID(companyId);

    // 1. Fetch Tender to validate status & deadline
    const { data: tender, error: tenderErr } = await supabaseAdmin
      .from('tenders')
      .select('*')
      .eq('id', validTenderId)
      .maybeSingle();

    if (tenderErr || !tender) {
      return NextResponse.json({ error: 'Tender not found or inaccessible' }, { status: 404 });
    }

    if (tender.status !== 'Published' && tender.status !== 'OPEN') {
      return NextResponse.json({ error: `Tender is not accepting bids (Current Status: ${tender.status})` }, { status: 400 });
    }

    if (tender.bid_submission_deadline) {
      const deadline = new Date(tender.bid_submission_deadline);
      if (new Date() > deadline) {
        return NextResponse.json({ error: 'Bid submission deadline has passed. This tender is locked.' }, { status: 400 });
      }
    }

    // 2. Check if a bid already exists for this company and tender
    const { data: existingBid } = await supabaseAdmin
      .from('tender_bids')
      .select('*')
      .eq('tender_id', validTenderId)
      .eq('company_id', validCompanyId)
      .maybeSingle();

    let resultBid: any;
    let actionType = 'SUBMIT_BID';

    if (existingBid) {
      actionType = 'UPDATE_BID';
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('tender_bids')
        .update({
          bid_amount: numericBidAmount,
          estimated_completion_days: parseInt(completionDays) || 30,
          technical_proposal_url: technicalProposalUrl || existingBid.technical_proposal_url || '',
          financial_proposal_url: financialProposalUrl || existingBid.financial_proposal_url || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBid.id)
        .select()
        .single();

      if (updateErr) {
        console.error('Error updating bid:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      resultBid = updated;
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('tender_bids')
        .insert({
          tender_id: validTenderId,
          company_id: validCompanyId,
          bid_amount: numericBidAmount,
          estimated_completion_days: parseInt(completionDays) || 30,
          technical_proposal_url: technicalProposalUrl || '',
          financial_proposal_url: financialProposalUrl || '',
          status: 'Submitted',
          digital_signature: `SIG-${Date.now()}`
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Error submitting bid:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      resultBid = inserted;
    }

    // 3. Log Audit Entry
    await logAuditAction({
      entityType: 'tender_bid',
      entityId: resultBid.id,
      action: actionType,
      actorId: userId ? stringToUUID(userId) : validCompanyId,
      previousState: existingBid || null,
      newState: resultBid,
    });

    return NextResponse.json({
      success: true,
      bid: resultBid,
      isUpdate: !!existingBid,
      message: existingBid ? 'Bid updated successfully!' : 'Bid submitted successfully!'
    });
  } catch (error: any) {
    console.error('API Error in /api/tenders/bid:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
