/**
 * Client-side rating actions for Capacitor build.
 */
import { createClient } from '@/lib/supabase/client';

export async function checkRatingEligibility(issueId: string, citizenLat: number, citizenLng: number) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: isEligible, error } = await supabase
    .rpc('can_citizen_rate_company', {
      p_citizen_id: user.id,
      p_issue_id: issueId,
      p_citizen_lat: citizenLat,
      p_citizen_lng: citizenLng
    });

  if (error) return { error: error.message };

  // Also check if they already reviewed
  const { data: existingReview } = await supabase
    .from('company_reviews')
    .select('id')
    .eq('issue_id', issueId)
    .eq('citizen_id', user.id)
    .single();

  if (existingReview) {
    return { isEligible: false, reason: 'Already rated' };
  }

  return { isEligible: !!isEligible };
}

export async function submitCitizenRating(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const issueId = formData.get('issueId') as string;
  const companyId = formData.get('companyId') as string;
  const rating = parseInt(formData.get('rating') as string);
  const review = formData.get('review') as string;
  const citizenLat = parseFloat(formData.get('citizenLat') as string);
  const citizenLng = parseFloat(formData.get('citizenLng') as string);

  // Re-verify eligibility
  const { isEligible } = await checkRatingEligibility(issueId, citizenLat, citizenLng);

  if (!isEligible) {
    return { error: 'Not eligible to rate this issue.' };
  }

  const { error: insertError } = await supabase
    .from('company_reviews')
    .insert({
      company_id: companyId,
      issue_id: issueId,
      citizen_id: user.id,
      rating,
      review,
    });

  if (insertError) return { error: insertError.message };

  return { success: true };
}
