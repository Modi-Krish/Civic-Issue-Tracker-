import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface ContractorMatchResult {
  company_id: string | null;
  contract_id: string | null;
  repeat_failure_rate: number;
  is_contractor_penalty: boolean;
}

export async function matchContractorAndCalculateRepeatFailures(
  departmentId?: string,
  categoryId?: string,
  totalEventsCount: number = 0
): Promise<ContractorMatchResult> {
  try {
    const todayIso = new Date().toISOString().split('T')[0];

    // Fetch active contracts from Supabase
    const { data: contracts, error } = await supabaseAdmin
      .from('contracts')
      .select('*, departments(slug, name)')
      .in('status', ['Active', 'ACTIVE'])
      .gte('end_date', todayIso);

    if (error || !contracts || contracts.length === 0) {
      return { company_id: null, contract_id: null, repeat_failure_rate: 0, is_contractor_penalty: false };
    }

    // Match by department_id or department slug
    const matchedContract = contracts.find(c =>
      (departmentId && c.department_id === departmentId) ||
      (categoryId && c.departments?.slug === categoryId) ||
      (categoryId && c.departments?.name?.toLowerCase().includes(categoryId.toLowerCase()))
    ) || contracts[0];

    if (!matchedContract) {
      return { company_id: null, contract_id: null, repeat_failure_rate: 0, is_contractor_penalty: false };
    }

    // Calculate Repeat Failure Rate % (e.g. if >2 repeat occurrences under active contract)
    // Formula: (repeat occurrences / total occurrences) * 100
    const repeatOccurrences = Math.max(0, totalEventsCount - 1);
    const repeat_failure_rate = totalEventsCount > 0
      ? Math.round((repeatOccurrences / totalEventsCount) * 1000) / 10
      : 0;

    const is_contractor_penalty = repeat_failure_rate >= 50 && totalEventsCount >= 3;

    return {
      company_id: matchedContract.company_id,
      contract_id: matchedContract.id,
      repeat_failure_rate,
      is_contractor_penalty
    };
  } catch (err) {
    console.warn('Error matching contractor for repeat failures:', err);
    return { company_id: null, contract_id: null, repeat_failure_rate: 0, is_contractor_penalty: false };
  }
}
