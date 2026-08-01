import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ contracts: [] });
    }

    const { getPossibleCompanyIds } = await import('@/lib/utils/uuid');
    const possibleIds = getPossibleCompanyIds(companyId);

    // Fetch all contracts with tender & department details using Service Role Key (bypasses RLS)
    const { data: allContracts, error } = await supabaseAdmin
      .from('contracts')
      .select('*, departments(name, slug), tenders(title, tender_number)')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching contracts in API:', error);
      return NextResponse.json({ contracts: [] });
    }

    // Fetch tender bids for this company
    const { data: bids } = await supabaseAdmin
      .from('tender_bids')
      .select('tender_id')
      .in('company_id', possibleIds);

    const bidTenderIds = bids ? bids.map(b => b.tender_id) : [];

    const matchedContracts = (allContracts || []).filter(c => 
      possibleIds.includes(c.company_id) || 
      c.company_id === companyId ||
      bidTenderIds.includes(c.tender_id)
    );

    return NextResponse.json({ contracts: matchedContracts });
  } catch (err: any) {
    console.error('API /api/company/contracts error:', err);
    return NextResponse.json({ contracts: [] });
  }
}
