/**
 * Client-side tender actions for Capacitor build.
 */
import { createClient } from '@/lib/supabase/client';

// Publish a new tender (Government Officer)
export async function publishTender(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const departmentId = formData.get('departmentId') as string;
  const areaId = formData.get('areaId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const estimatedBudget = parseFloat(formData.get('estimatedBudget') as string);
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;

  const { data, error } = await supabase.from('tenders').insert({
    department_id: departmentId,
    area_id: areaId,
    title,
    description,
    estimated_budget: estimatedBudget,
    start_date: startDate,
    end_date: endDate,
    status: 'OPEN',
  }).select('id').single();

  if (error) return { error: error.message };

  return { success: true, tenderId: data.id };
}

// Submit a bid (Company Admin)
export async function submitBid(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const tenderId = formData.get('tenderId') as string;
  const quotedPrice = parseFloat(formData.get('quotedPrice') as string);
  const completionDays = parseInt(formData.get('completionDays') as string);
  const proposalDocument = formData.get('proposalDocument') as string;

  // Get the company id for this user
  const { data: companyEmployee } = await supabase
    .from('company_employees')
    .select('company_id')
    .eq('profile_id', user.id)
    .single();

  if (!companyEmployee) return { error: 'You do not belong to a company.' };

  const { error } = await supabase.from('tender_bids').insert({
    tender_id: tenderId,
    company_id: companyEmployee.company_id,
    quoted_price: quotedPrice,
    completion_days: completionDays,
    proposal_document: proposalDocument,
    status: 'PENDING',
  });

  if (error) return { error: error.message };

  return { success: true };
}

// Evaluate bids for a tender using weighted formula
export async function evaluateTenderBids(tenderId: string) {
  const supabase = createClient();

  const { data: bids, error } = await supabase
    .from('tender_bids')
    .select(`
      id, company_id, quoted_price, completion_days,
      companies (
        id, company_name, rating, completed_projects
      )
    `)
    .eq('tender_id', tenderId)
    .eq('status', 'PENDING');

  if (error || !bids) return { error: error?.message || 'Bids not found' };

  if (bids.length === 0) return { success: true, evaluated: false };

  const { data: tender } = await supabase
    .from('tenders')
    .select('estimated_budget')
    .eq('id', tenderId)
    .single();

  const estimatedBudget = tender?.estimated_budget || 0;

  for (const bid of bids) {
    const comp: any = bid.companies;

    const ratingScore = (comp.rating / 5) * 100;
    const govRatingScore = ratingScore * 0.9;
    const slaScore = 90;
    const pastContractsScore = Math.min((comp.completed_projects * 10), 100);

    let priceScore = 50;
    if (estimatedBudget > 0) {
      const ratio = bid.quoted_price / estimatedBudget;
      if (ratio <= 1.0 && ratio > 0.5) priceScore = 100 - ((1 - ratio) * 50);
      else if (ratio > 1.0) priceScore = Math.max(0, 100 - ((ratio - 1) * 100));
      else priceScore = 40;
    }

    const finalScore =
      (ratingScore * 0.35) +
      (govRatingScore * 0.25) +
      (slaScore * 0.20) +
      (pastContractsScore * 0.10) +
      (priceScore * 0.10);

    (bid as any).ai_score = finalScore.toFixed(2);
  }

  const rankedBids = bids.sort((a: any, b: any) => parseFloat(b.ai_score) - parseFloat(a.ai_score));

  return { success: true, rankedBids };
}

// Award Contract (Government Officer)
export async function awardContract(tenderId: string, bidId: string, companyId: string, contractAmount: number) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: tender } = await supabase.from('tenders').select('department_id, area_id').eq('id', tenderId).single();
  if (!tender) return { error: 'Tender not found' };

  // Update Tender status
  await supabase.from('tenders').update({ status: 'AWARDED' }).eq('id', tenderId);

  // Update Bid statuses
  await supabase.from('tender_bids').update({ status: 'SELECTED' }).eq('id', bidId);
  await supabase.from('tender_bids').update({ status: 'REJECTED' }).eq('tender_id', tenderId).neq('id', bidId);

  // Create Contract
  const startDate = new Date().toISOString();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  const { error: contractError } = await supabase.from('contracts').insert({
    company_id: companyId,
    department_id: tender.department_id,
    area_id: tender.area_id,
    tender_id: tenderId,
    contract_amount: contractAmount,
    contract_start: startDate,
    contract_end: endDate.toISOString(),
    status: 'ACTIVE'
  });

  if (contractError) return { error: contractError.message };

  return { success: true };
}
